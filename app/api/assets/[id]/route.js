// app/api/assets/[id]/route.js
// GET /api/assets/[id] — fetch a single asset
// PATCH /api/assets/[id] — update asset details
// DELETE /api/assets/[id] — delete an asset

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Asset from "@/lib/db/models/Asset";
import Liability from "@/lib/db/models/Liability";
import { requireUserId, assertOwnership, withErrorHandling, validationError } from "@/lib/auth/session";
import { logAudit, requestMeta } from "@/lib/audit/logAudit";
import { updateAssetSchema } from "@/lib/validations/schemas";
import mongoose from "mongoose";
import { readJsonBody } from "@/lib/security/sanitize";

async function getHandler(request, { params }) {
  const userId = await requireUserId();
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid asset ID" }, { status: 400 });
  }

  await connectDB();
  const asset = await Asset.findById(id).lean();

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  assertOwnership(asset.ownerId, userId);

  // Also query linked liabilities if any
  const linkedLiabilities = await Liability.find({
    ownerId: userId,
    linkedAssetId: id,
    status: "active",
  }).lean();

  return NextResponse.json({
    asset: {
      ...asset,
      id: asset._id.toString(),
      valuationHistory: (asset.valuationHistory || []).map((v) => ({
        ...v,
        amount: v.amount ? v.amount.toString() : null,
      })),
      currentValue: asset.currentValue
        ? {
            ...asset.currentValue,
            amount: asset.currentValue.amount ? asset.currentValue.amount.toString() : null,
          }
        : null,
    },
    linkedLiabilities: linkedLiabilities.map((l) => ({
      ...l,
      id: l._id.toString(),
      currentBalance: l.currentBalance
        ? {
            ...l.currentBalance,
            amount: l.currentBalance.amount ? l.currentBalance.amount.toString() : null,
          }
        : null,
    })),
  });
}

async function patchHandler(request, { params }) {
  const userId = await requireUserId();
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid asset ID" }, { status: 400 });
  }

  const body = await readJsonBody(request);
  const result = updateAssetSchema.safeParse(body);
  if (!result.success) {
    return validationError(result);
  }

  await connectDB();
  const existing = await Asset.findById(id);
  if (!existing) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  assertOwnership(existing.ownerId, userId);

  const before = existing.toJSON();

  const data = result.data;
  if (data.name !== undefined) existing.name = data.name;
  if (data.category !== undefined) existing.category = data.category;
  if (data.subCategory !== undefined) existing.subCategory = data.subCategory;
  if (data.description !== undefined) existing.description = data.description;
  if (data.currency !== undefined) existing.currency = data.currency;
  if (data.status !== undefined) existing.status = data.status;
  if (data.tags !== undefined) existing.tags = data.tags;
  if (data.notes !== undefined) existing.notes = data.notes;

  if (data.currentValue) {
    existing.currentValue = {
      amount: mongoose.Types.Decimal128.fromString(data.currentValue.amount),
      asOf: new Date(data.currentValue.asOf),
      source: data.currentValue.source || "manual",
      approvedBy: new mongoose.Types.ObjectId(userId),
      approvedAt: new Date(),
    };
    // Also push to history
    existing.valuationHistory.push({
      amount: mongoose.Types.Decimal128.fromString(data.currentValue.amount),
      currency: data.currency || existing.currency,
      asOf: new Date(data.currentValue.asOf),
      source: data.currentValue.source || "manual",
      note: "Updated via edit",
    });
  }

  await existing.save();

  await logAudit(
    userId,
    "update",
    "asset",
    existing._id.toString(),
    before,
    existing.toJSON(),
    `Updated asset "${existing.name}"`,
    requestMeta(request)
  );

  return NextResponse.json({
    asset: {
      ...existing.toJSON(),
      id: existing._id.toString(),
    },
  });
}

async function deleteHandler(request, { params }) {
  const userId = await requireUserId();
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid asset ID" }, { status: 400 });
  }

  await connectDB();
  const existing = await Asset.findById(id);
  if (!existing) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  assertOwnership(existing.ownerId, userId);

  const before = existing.toJSON();
  await Asset.findByIdAndDelete(id);

  await logAudit(
    userId,
    "delete",
    "asset",
    id,
    before,
    null,
    `Deleted asset "${before.name}"`,
    requestMeta(request)
  );

  return NextResponse.json({ success: true, deletedId: id });
}

export const GET = withErrorHandling(getHandler);
export const PATCH = withErrorHandling(patchHandler);
export const DELETE = withErrorHandling(deleteHandler);
