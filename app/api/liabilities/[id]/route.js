// app/api/liabilities/[id]/route.js
// GET /api/liabilities/[id] — fetch a single liability
// PATCH /api/liabilities/[id] — update liability details
// DELETE /api/liabilities/[id] — delete a liability

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Liability from "@/lib/db/models/Liability";
import { requireUserId, assertOwnership, assertOwnedRef, withErrorHandling, validationError } from "@/lib/auth/session";
import Asset from "@/lib/db/models/Asset";
import { logAudit, requestMeta } from "@/lib/audit/logAudit";
import { updateLiabilitySchema } from "@/lib/validations/schemas";
import mongoose from "mongoose";
import { readJsonBody } from "@/lib/security/sanitize";

async function getHandler(request, { params }) {
  const userId = await requireUserId();
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid liability ID" }, { status: 400 });
  }

  await connectDB();
  const liability = await Liability.findById(id)
    .populate("linkedAssetId", "name category")
    .lean();

  if (!liability) {
    return NextResponse.json({ error: "Liability not found" }, { status: 404 });
  }

  assertOwnership(liability.ownerId, userId);

  return NextResponse.json({
    liability: {
      ...liability,
      id: liability._id.toString(),
      principalAmount: liability.principalAmount ? liability.principalAmount.toString() : null,
      interestRate: liability.interestRate ? liability.interestRate.toString() : null,
      currentBalance: liability.currentBalance
        ? {
            ...liability.currentBalance,
            amount: liability.currentBalance.amount ? liability.currentBalance.amount.toString() : null,
          }
        : null,
      linkedAsset: liability.linkedAssetId
        ? {
            id: liability.linkedAssetId._id?.toString() || liability.linkedAssetId.toString(),
            name: liability.linkedAssetId.name,
            category: liability.linkedAssetId.category,
          }
        : null,
    },
  });
}

async function patchHandler(request, { params }) {
  const userId = await requireUserId();
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid liability ID" }, { status: 400 });
  }

  const body = await readJsonBody(request);
  const result = updateLiabilitySchema.safeParse(body);
  if (!result.success) {
    return validationError(result);
  }

  await connectDB();
  const existing = await Liability.findById(id);
  if (!existing) {
    return NextResponse.json({ error: "Liability not found" }, { status: 404 });
  }

  assertOwnership(existing.ownerId, userId);
  const before = existing.toJSON();

  const data = result.data;
  if (data.name !== undefined) existing.name = data.name;
  if (data.category !== undefined) existing.category = data.category;
  if (data.currency !== undefined) existing.currency = data.currency;
  if (data.lender !== undefined) existing.lender = data.lender;
  if (data.status !== undefined) existing.status = data.status;
  if (data.notes !== undefined) existing.notes = data.notes;

  if (data.principalAmount !== undefined) {
    existing.principalAmount = data.principalAmount
      ? mongoose.Types.Decimal128.fromString(data.principalAmount)
      : null;
  }

  if (data.interestRate !== undefined) {
    existing.interestRate = data.interestRate
      ? mongoose.Types.Decimal128.fromString(data.interestRate)
      : null;
  }

  if (data.startDate !== undefined) {
    existing.startDate = data.startDate ? new Date(data.startDate) : null;
  }

  if (data.maturityDate !== undefined) {
    existing.maturityDate = data.maturityDate ? new Date(data.maturityDate) : null;
  }

  if (data.linkedAssetId !== undefined) {
    // M-5: linked records must be owned by the current user
    if (data.linkedAssetId) {
      await assertOwnedRef(Asset, data.linkedAssetId, userId);
    }
    existing.linkedAssetId = data.linkedAssetId
      ? new mongoose.Types.ObjectId(data.linkedAssetId)
      : null;
  }

  if (data.currentBalance) {
    existing.currentBalance = {
      amount: mongoose.Types.Decimal128.fromString(data.currentBalance.amount),
      asOf: new Date(data.currentBalance.asOf),
      source: data.currentBalance.source || "manual",
    };
  }

  await existing.save();

  await logAudit(
    userId,
    "update",
    "liability",
    existing._id.toString(),
    before,
    existing.toJSON(),
    `Updated liability "${existing.name}"`,
    requestMeta(request)
  );

  return NextResponse.json({
    liability: {
      ...existing.toJSON(),
      id: existing._id.toString(),
    },
  });
}

async function deleteHandler(request, { params }) {
  const userId = await requireUserId();
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid liability ID" }, { status: 400 });
  }

  await connectDB();
  const existing = await Liability.findById(id);
  if (!existing) {
    return NextResponse.json({ error: "Liability not found" }, { status: 404 });
  }

  assertOwnership(existing.ownerId, userId);

  const before = existing.toJSON();
  await Liability.findByIdAndDelete(id);

  await logAudit(
    userId,
    "delete",
    "liability",
    id,
    before,
    null,
    `Deleted liability "${before.name}"`,
    requestMeta(request)
  );

  return NextResponse.json({ success: true, deletedId: id });
}

export const GET = withErrorHandling(getHandler);
export const PATCH = withErrorHandling(patchHandler);
export const DELETE = withErrorHandling(deleteHandler);
