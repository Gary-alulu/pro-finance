// app/api/transactions/[id]/route.js
// GET /api/transactions/[id] — fetch single transaction
// PATCH /api/transactions/[id] — update transaction
// DELETE /api/transactions/[id] — delete transaction

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Transaction from "@/lib/db/models/Transaction";
import { requireUserId, assertOwnership, assertOwnedRef, withErrorHandling, validationError } from "@/lib/auth/session";
import Asset from "@/lib/db/models/Asset";
import Liability from "@/lib/db/models/Liability";
import Document from "@/lib/db/models/Document";
import { logAudit, requestMeta } from "@/lib/audit/logAudit";
import { updateTransactionSchema } from "@/lib/validations/schemas";
import mongoose from "mongoose";
import { readJsonBody } from "@/lib/security/sanitize";

async function getHandler(request, { params }) {
  const userId = await requireUserId();
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid transaction ID" }, { status: 400 });
  }

  await connectDB();
  const tx = await Transaction.findById(id)
    .populate("linkedAssetId", "name category")
    .populate("linkedLiabilityId", "name category")
    .populate("linkedDocumentId", "originalFilename fileType")
    .lean();

  if (!tx) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  assertOwnership(tx.ownerId, userId);

  return NextResponse.json({
    transaction: {
      ...tx,
      id: tx._id.toString(),
      amount: tx.amount ? tx.amount.toString() : null,
    },
  });
}

async function patchHandler(request, { params }) {
  const userId = await requireUserId();
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid transaction ID" }, { status: 400 });
  }

  const body = await readJsonBody(request);
  const result = updateTransactionSchema.safeParse(body);
  if (!result.success) {
    return validationError(result);
  }

  await connectDB();
  const existing = await Transaction.findById(id);
  if (!existing) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  assertOwnership(existing.ownerId, userId);
  const before = existing.toJSON();

  const data = result.data;
  if (data.date !== undefined) existing.date = new Date(data.date);
  if (data.description !== undefined) existing.description = data.description;
  if (data.currency !== undefined) existing.currency = data.currency;
  if (data.direction !== undefined) existing.direction = data.direction;
  if (data.category !== undefined) existing.category = data.category;
  if (data.evidenceStatus !== undefined) existing.evidenceStatus = data.evidenceStatus;
  if (data.approvalStatus !== undefined) existing.approvalStatus = data.approvalStatus;
  if (data.tags !== undefined) existing.tags = data.tags;
  if (data.notes !== undefined) existing.notes = data.notes;
  if (data.isRecurring !== undefined) existing.isRecurring = data.isRecurring;

  if (data.amount !== undefined) {
    existing.amount = mongoose.Types.Decimal128.fromString(data.amount);
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

  if (data.linkedLiabilityId !== undefined) {
    if (data.linkedLiabilityId) {
      await assertOwnedRef(Liability, data.linkedLiabilityId, userId);
    }
    existing.linkedLiabilityId = data.linkedLiabilityId
      ? new mongoose.Types.ObjectId(data.linkedLiabilityId)
      : null;
  }

  if (data.linkedDocumentId !== undefined) {
    if (data.linkedDocumentId) {
      await assertOwnedRef(Document, data.linkedDocumentId, userId);
    }
    existing.linkedDocumentId = data.linkedDocumentId
      ? new mongoose.Types.ObjectId(data.linkedDocumentId)
      : null;
  }

  await existing.save();

  await logAudit(
    userId,
    "update",
    "transaction",
    existing._id.toString(),
    before,
    existing.toJSON(),
    `Updated transaction "${existing.description || existing.category}"`,
    requestMeta(request)
  );

  return NextResponse.json({
    transaction: {
      ...existing.toJSON(),
      id: existing._id.toString(),
    },
  });
}

async function deleteHandler(request, { params }) {
  const userId = await requireUserId();
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid transaction ID" }, { status: 400 });
  }

  await connectDB();
  const existing = await Transaction.findById(id);
  if (!existing) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  assertOwnership(existing.ownerId, userId);

  const before = existing.toJSON();
  await Transaction.findByIdAndDelete(id);

  await logAudit(
    userId,
    "delete",
    "transaction",
    id,
    before,
    null,
    `Deleted transaction "${before.description || before.category}"`,
    requestMeta(request)
  );

  return NextResponse.json({ success: true, deletedId: id });
}

export const GET = withErrorHandling(getHandler);
export const PATCH = withErrorHandling(patchHandler);
export const DELETE = withErrorHandling(deleteHandler);
