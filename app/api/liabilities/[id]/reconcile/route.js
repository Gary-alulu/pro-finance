// app/api/liabilities/[id]/reconcile/route.js
// POST /api/liabilities/[id]/reconcile — statement balance reconciliation
// GET /api/liabilities/[id]/reconcile — statement balance history

import { NextResponse } from "next/server";
import { requireUserId, withErrorHandling, validationError } from "@/lib/auth/session";
import { logAudit, requestMeta } from "@/lib/audit/logAudit";
import { reconcileLiabilityBalanceSchema } from "@/lib/validations/schemas";
import {
  reconcileLiabilityBalance,
  getLiabilityBalanceSnapshots,
} from "@/lib/services/assets-liabilities/reconciliationService";
import mongoose from "mongoose";
import { readJsonBody } from "@/lib/security/sanitize";

async function getHandler(request, { params }) {
  const userId = await requireUserId();
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid liability ID" }, { status: 400 });
  }

  const snapshots = await getLiabilityBalanceSnapshots({ ownerId: userId, liabilityId: id });
  return NextResponse.json({ snapshots });
}

async function postHandler(request, { params }) {
  const userId = await requireUserId();
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid liability ID" }, { status: 400 });
  }

  const body = await readJsonBody(request);
  const result = reconcileLiabilityBalanceSchema.safeParse(body);
  if (!result.success) {
    return validationError(result);
  }

  const resultData = await reconcileLiabilityBalance({
    ownerId: userId,
    liabilityId: id,
    data: result.data,
  });

  await logAudit(
    userId,
    "update",
    "liability_reconcile",
    id,
    { previousBalance: resultData.previousBalance },
    { newBalance: resultData.newBalance, effectiveDate: result.data.effectiveDate },
    `Reconciled statement balance for liability to ${result.data.currency || "KES"} ${result.data.balance}`,
    requestMeta(request)
  );

  return NextResponse.json(resultData);
}

export const GET = withErrorHandling(getHandler);
export const POST = withErrorHandling(postHandler);
