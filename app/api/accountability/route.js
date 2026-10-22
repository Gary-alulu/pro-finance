// app/api/accountability/route.js
// GET  /api/accountability — review queue (open/resolved/dismissed) + summary counts
// POST /api/accountability — re-scan all records with the pure engine:
//   • upserts current findings by stable key (never resurrects dismissed rows)
//   • auto-resolves open items whose underlying problem is gone
//   • generates date-driven reminders when the user has notifications enabled

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import AccountabilityItem from "@/lib/db/models/AccountabilityItem";
import Asset from "@/lib/db/models/Asset";
import Liability from "@/lib/db/models/Liability";
import Transaction from "@/lib/db/models/Transaction";
import Document from "@/lib/db/models/Document";
import InvestmentHolding from "@/lib/db/models/InvestmentHolding";
import Reminder from "@/lib/db/models/Reminder";
import User from "@/lib/db/models/User";
import { requireUserId, withErrorHandling } from "@/lib/auth/session";
import { runChecks, suggestReminders } from "@/lib/accountability/engine";
import { logAudit, requestMeta } from "@/lib/audit/logAudit";
import mongoose from "mongoose";

function serialize(item) {
  const { _id, __v, ownerId, ...rest } = item;
  return { ...rest, id: _id.toString() };
}

async function getHandler(request) {
  const userId = await requireUserId();
  await connectDB();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "open";
  const limit = Math.min(parseInt(searchParams.get("limit") || "200"), 500);

  const filter = { ownerId: userId };
  if (status !== "all") filter.status = status;

  const [items, counts] = await Promise.all([
    AccountabilityItem.find(filter)
      .sort({ severity: 1, createdAt: -1 })
      .limit(limit)
      .lean(),
    AccountabilityItem.aggregate([
      { $match: { ownerId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: { status: "$status", severity: "$severity" }, count: { $sum: 1 } } },
    ]),
  ]);

  const summary = { open: 0, resolved: 0, dismissed: 0, errors: 0, warnings: 0, infos: 0 };
  for (const c of counts) {
    summary[c._id.status] = (summary[c._id.status] || 0) + c.count;
    if (c._id.status === "open") {
      if (c._id.severity === "error" || c._id.severity === "high") summary.errors += c.count;
      else if (c._id.severity === "warning" || c._id.severity === "medium") summary.warnings += c.count;
      else summary.infos += c.count;
    }
  }

  return NextResponse.json({
    items: items.map(serialize),
    summary,
  });
}

async function postHandler(request) {
  const userId = await requireUserId();
  await connectDB();

  const userObjectId = new mongoose.Types.ObjectId(userId);

  const [assets, liabilities, investments, transactions, documents, user] =
    await Promise.all([
      Asset.find({ ownerId: userId }).select("-valuationHistory").lean(),
      Liability.find({ ownerId: userId }).lean(),
      InvestmentHolding.find({ ownerId: userId }).select("-priceHistory").lean(),
      Transaction.find({ ownerId: userId }).sort({ date: -1 }).limit(2000).lean(),
      Document.find({ ownerId: userId }).select("-storageKey -extractionResult.rawText").lean(),
      User.findById(userId).lean(),
    ]);

  const now = new Date();
  const findings = runChecks({ assets, liabilities, investments, transactions, documents, now });
  const findingKeys = new Set(findings.map((f) => f.key));

  let upserted = 0;
  let autoResolved = 0;

  // Bulk-load existing items so the upsert never issues a query per finding.
  const existingItems = await AccountabilityItem.find({ ownerId: userObjectId })
    .select("key status")
    .lean();
  const existingByKey = new Map(existingItems.map((i) => [i.key, i]));

  // Upsert current findings; preserve resolved/dismissed state on existing rows.
  const itemOps = [];
  for (const f of findings) {
    const existing = existingByKey.get(f.key);

    if (existing) {
      // resolved/dismissed rows stay untouched — the user already decided.
      if (existing.status !== "open") continue;
      itemOps.push({
        updateOne: {
          filter: { ownerId: userObjectId, key: f.key },
          update: {
            $set: {
              severity: f.severity,
              title: f.title,
              reason: f.reason,
              actionLabel: f.actionLabel,
              actionHref: f.actionHref,
              meta: f.meta,
            },
          },
        },
      });
      upserted++;
      continue;
    }

    itemOps.push({
      insertOne: {
        document: {
          ownerId: userObjectId,
          key: f.key,
          type: f.type,
          severity: f.severity,
          title: f.title,
          reason: f.reason,
          actionLabel: f.actionLabel,
          actionHref: f.actionHref,
          linkedEntityType: f.entityType,
          linkedEntityId: f.entityId
            ? new mongoose.Types.ObjectId(f.entityId)
            : undefined,
          meta: f.meta,
          status: "open",
        },
      },
    });
    upserted++;
  }

  // Auto-resolve open items whose finding no longer exists (fixed records).
  const staleKeys = existingItems
    .filter((i) => i.status === "open" && !findingKeys.has(i.key))
    .map((i) => i.key);
  if (staleKeys.length > 0) {
    itemOps.push({
      updateMany: {
        filter: { ownerId: userObjectId, key: { $in: staleKeys }, status: "open" },
        update: { $set: { status: "resolved", resolution: "auto", resolvedAt: now } },
      },
    });
    autoResolved = staleKeys.length;
  }

  if (itemOps.length > 0) {
    await AccountabilityItem.bulkWrite(itemOps, { ordered: false });
  }

  // Date-driven reminders, gated by the user's notification setting.
  let remindersCreated = 0;
  if (user?.settings?.notificationsEnabled !== false) {
    const suggestions = suggestReminders({ liabilities, assets, now });
    if (suggestions.length > 0) {
      const existingReminders = await Reminder.find({
        ownerId: userObjectId,
        key: { $in: suggestions.map((r) => r.key) },
        status: { $in: ["open", "snoozed"] },
      })
        .select("key")
        .lean();
      const takenKeys = new Set(existingReminders.map((r) => r.key));
      const reminderDocs = suggestions
        .filter((r) => !takenKeys.has(r.key))
        .map((r) => ({
          ownerId: userObjectId,
          key: r.key,
          title: r.title,
          body: r.body,
          dueAt: new Date(r.dueAt),
          priority: r.priority,
          entityType: r.entityType,
          entityId: r.entityId ? new mongoose.Types.ObjectId(r.entityId) : undefined,
          source: "auto",
        }));
      if (reminderDocs.length > 0) {
        await Reminder.insertMany(reminderDocs, { ordered: false });
        remindersCreated = reminderDocs.length;
      }
    }
  }

  await logAudit(
    userId,
    "update",
    "settings",
    null,
    null,
    { upserted, autoResolved, remindersCreated, findings: findings.length },
    `Integrity scan: ${findings.length} finding(s), ${autoResolved} auto-resolved`,
    requestMeta(request)
  );

  return NextResponse.json({
    success: true,
    scanned: {
      assets: assets.length,
      liabilities: liabilities.length,
      investments: investments.length,
      transactions: transactions.length,
      documents: documents.length,
    },
    findings: findings.length,
    upserted,
    autoResolved,
    remindersCreated,
  });
}

export const GET = withErrorHandling(getHandler);
export const POST = withErrorHandling(postHandler);
