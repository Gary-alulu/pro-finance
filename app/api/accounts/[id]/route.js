// app/api/accounts/[id]/route.js
// GET /api/accounts/[id] — fetch a single account
// PATCH /api/accounts/[id] — update an account
// DELETE /api/accounts/[id] — delete an account

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Account from "@/lib/db/models/Account";
import { requireUserId, assertOwnership, assertOwnedRef, withErrorHandling, validationError } from "@/lib/auth/session";
import Asset from "@/lib/db/models/Asset";
import { updateAccountSchema } from "@/lib/validations/schemas";
import { logAudit, requestMeta } from "@/lib/audit/logAudit";
import mongoose from "mongoose";
import { readJsonBody } from "@/lib/security/sanitize";

async function getHandler(request, { params }) {
  const userId = await requireUserId();
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid account ID" }, { status: 400 });
  }

  await connectDB();
  const account = await Account.findById(id).lean();
  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  assertOwnership(account.ownerId, userId);

  const { _id, __v, ...rest } = account;
  return NextResponse.json({
    account: { ...rest, id: _id.toString(), currentBalance: account.currentBalance?.toString() ?? null },
  });
}

async function patchHandler(request, { params }) {
  const userId = await requireUserId();
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid account ID" }, { status: 400 });
  }

  const body = await readJsonBody(request);
  const result = updateAccountSchema.safeParse(body);
  if (!result.success) {
    return validationError(result);
  }

  await connectDB();
  const existing = await Account.findById(id);
  if (!existing) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  assertOwnership(existing.ownerId, userId);
  const before = existing.toJSON();

  const data = result.data;
  if (data.name !== undefined) existing.name = data.name;
  if (data.institution !== undefined) existing.institution = data.institution;
  if (data.accountNumberMasked !== undefined) existing.accountNumberMasked = data.accountNumberMasked;
  if (data.type !== undefined) existing.type = data.type;
  if (data.currency !== undefined) existing.currency = data.currency;
  if (data.status !== undefined) existing.status = data.status;
  if (data.notes !== undefined) existing.notes = data.notes;

  if (data.currentBalance !== undefined) {
    existing.currentBalance = data.currentBalance
      ? mongoose.Types.Decimal128.fromString(data.currentBalance)
      : null;
  }
  if (data.balanceAsOf !== undefined) {
    existing.balanceAsOf = data.balanceAsOf ? new Date(data.balanceAsOf) : null;
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

  await existing.save();

  await logAudit(
    userId,
    "update",
    "account",
    existing._id.toString(),
    before,
    existing.toJSON(),
    `Updated account "${existing.name}"`,
    requestMeta(request)
  );

  return NextResponse.json({ account: existing.toJSON() });
}

async function deleteHandler(request, { params }) {
  const userId = await requireUserId();
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid account ID" }, { status: 400 });
  }

  await connectDB();
  const existing = await Account.findById(id);
  if (!existing) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  assertOwnership(existing.ownerId, userId);

  const before = existing.toJSON();
  await Account.findByIdAndDelete(id);

  await logAudit(
    userId,
    "delete",
    "account",
    id,
    before,
    null,
    `Deleted account "${before.name}"`,
    requestMeta(request)
  );

  return NextResponse.json({ success: true, deletedId: id });
}

export const GET = withErrorHandling(getHandler);
export const PATCH = withErrorHandling(patchHandler);
export const DELETE = withErrorHandling(deleteHandler);
