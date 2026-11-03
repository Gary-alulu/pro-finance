// app/api/liabilities/[id]/payments/route.js
// GET /api/liabilities/[id]/payments — list repayment history for a liability
// POST /api/liabilities/[id]/payments — record a new repayment with principal/interest split

import { NextResponse } from "next/server";
import { requireUserId, withErrorHandling, validationError } from "@/lib/auth/session";
import { logAudit, requestMeta } from "@/lib/audit/logAudit";
import { createLiabilityPaymentSchema } from "@/lib/validations/schemas";
import { recordLiabilityPayment, getLiabilityPayments } from "@/lib/services/assets-liabilities/repaymentService";
import mongoose from "mongoose";
import { readJsonBody } from "@/lib/security/sanitize";

async function getHandler(request, { params }) {
  const userId = await requireUserId();
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid liability ID" }, { status: 400 });
  }

  const payments = await getLiabilityPayments({ ownerId: userId, liabilityId: id });
  return NextResponse.json({ payments });
}

async function postHandler(request, { params }) {
  const userId = await requireUserId();
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid liability ID" }, { status: 400 });
  }

  const body = await readJsonBody(request);
  const result = createLiabilityPaymentSchema.safeParse(body);
  if (!result.success) {
    return validationError(result);
  }

  const resultData = await recordLiabilityPayment({
    ownerId: userId,
    liabilityId: id,
    data: result.data,
  });

  await logAudit(
    userId,
    "create",
    "liability_payment",
    resultData.payment.id || resultData.payment._id?.toString(),
    null,
    {
      totalAmount: result.data.totalAmount,
      principalAmount: result.data.principalAmount,
      interestAmount: result.data.interestAmount,
      liabilityId: id,
    },
    `Recorded payment of ${result.data.currency || "KES"} ${result.data.totalAmount} for liability`,
    requestMeta(request)
  );

  return NextResponse.json(resultData, { status: 201 });
}

export const GET = withErrorHandling(getHandler);
export const POST = withErrorHandling(postHandler);
