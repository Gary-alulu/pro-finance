// app/api/accounts/route.js
// GET /api/accounts — list accounts for the authenticated user
// POST /api/accounts — create a new account

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Account from "@/lib/db/models/Account";
import { requireUserId, assertOwnedRef, withErrorHandling, validationError } from "@/lib/auth/session";
import Asset from "@/lib/db/models/Asset";
import { createAccountSchema } from "@/lib/validations/schemas";
import { logAudit, requestMeta } from "@/lib/audit/logAudit";
import mongoose from "mongoose";
import { readJsonBody } from "@/lib/security/sanitize";

async function getHandler(request) {
  const userId = await requireUserId();
  await connectDB();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "active";
  const type = searchParams.get("type");

  const filter = { ownerId: userId };
  if (status !== "all") filter.status = status;
  if (type) filter.type = type;

  const accounts = await Account.find(filter).sort({ createdAt: -1 }).lean();

  return NextResponse.json({
    accounts: accounts.map((a) => {
      const { _id, __v, ...rest } = a;
      return { ...rest, id: _id.toString(), currentBalance: a.currentBalance?.toString() ?? null };
    }),
  });
}

async function postHandler(request) {
  const userId = await requireUserId();
  const body = await readJsonBody(request);

  const result = createAccountSchema.safeParse(body);
  if (!result.success) {
    return validationError(result);
  }

  await connectDB();
  const data = result.data;

  if (data.linkedAssetId) {
    // M-5: linked records must be owned by the current user
    await assertOwnedRef(Asset, data.linkedAssetId, userId);
  }

  const account = await Account.create({
    ownerId: new mongoose.Types.ObjectId(userId),
    name: data.name,
    institution: data.institution,
    accountNumberMasked: data.accountNumberMasked,
    type: data.type,
    currency: data.currency,
    // Explicit null vs undefined: only set when provided, so "missing" stays distinct from 0.
    currentBalance:
      data.currentBalance !== undefined
        ? mongoose.Types.Decimal128.fromString(data.currentBalance)
        : undefined,
    balanceAsOf: data.balanceAsOf ? new Date(data.balanceAsOf) : undefined,
    status: data.status,
    linkedAssetId: data.linkedAssetId
      ? new mongoose.Types.ObjectId(data.linkedAssetId)
      : undefined,
    notes: data.notes,
  });

  await logAudit(
    userId,
    "create",
    "account",
    account._id.toString(),
    null,
    account.toJSON(),
    `Created account "${account.name}"`,
    requestMeta(request)
  );

  return NextResponse.json({ account: account.toJSON() }, { status: 201 });
}

export const GET = withErrorHandling(getHandler);
export const POST = withErrorHandling(postHandler);
