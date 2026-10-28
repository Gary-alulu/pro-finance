// app/api/command-centre/alerts/[id]/route.js
// Updates an alert status: in_progress, snoozed, dismissed, or resolved.

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import FinancialAlert from "@/lib/db/models/FinancialAlert";
import { requireUserId, withErrorHandling } from "@/lib/auth/session";
import { logAudit, requestMeta } from "@/lib/audit/logAudit";

async function patchHandler(request, { params }) {
  const userId = await requireUserId();
  await connectDB();

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { status, snoozedDays, dismissReason } = body;

  const validStatuses = ["open", "in_progress", "snoozed", "resolved", "dismissed"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
  }

  const alert = await FinancialAlert.findOne({ _id: id, ownerId: userId });
  if (!alert) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }

  const updates = { status };
  const now = new Date();

  if (status === "snoozed") {
    const days = Math.max(1, Math.min(365, Number(snoozedDays) || 7));
    updates.snoozedUntil = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  } else if (status === "dismissed") {
    updates.dismissedAt = now;
    updates.dismissReason = dismissReason || "Dismissed by user";
  } else if (status === "resolved") {
    updates.resolvedAt = now;
    updates.resolvedBy = "manual";
  }

  const updated = await FinancialAlert.findOneAndUpdate(
    { _id: id, ownerId: userId },
    { $set: updates },
    { new: true }
  ).lean();

  await logAudit({
    ownerId: userId,
    action: "update",
    entityType: "financial_alert",
    entityId: id,
    summary: `Changed alert "${alert.title}" status to ${status}${status === "snoozed" ? ` until ${updates.snoozedUntil?.toISOString().slice(0, 10)}` : ""}.`,
    ...requestMeta(request),
  });

  return NextResponse.json({
    alert: {
      ...updated,
      id: updated._id.toString(),
    },
    message: `Alert updated to ${status}.`,
  });
}

export const PATCH = withErrorHandling(patchHandler);
