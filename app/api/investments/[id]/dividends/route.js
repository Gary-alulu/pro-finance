// app/api/investments/[id]/dividends/route.js
// GET /api/investments/[id]/dividends — list dividends for a holding
// POST /api/investments/[id]/dividends — record a dividend (tracked separately from price changes)

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import InvestmentHolding from "@/lib/db/models/InvestmentHolding";
import Dividend from "@/lib/db/models/Dividend";
import { requireUserId, assertOwnership, withErrorHandling, validationError } from "@/lib/auth/session";
import { logAudit, requestMeta } from "@/lib/audit/logAudit";
import { Decimal } from "decimal.js";
import { z } from "zod";
import mongoose from "mongoose";
import { readJsonBody } from "@/lib/security/sanitize";

const createDividendSchema = z.object({
  payDate: z.string().datetime({ offset: true }).or(z.string().date()),
  exDate: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
  amountPerUnit: z.string().regex(/^\d+(\.\d{1,10})?$/).optional(),
  units: z.string().regex(/^\d+(\.\d{1,10})?$/).optional(),
  grossAmount: z.string().regex(/^\d+(\.\d{1,10})?$/),
  taxWithheld: z.string().regex(/^\d+(\.\d{1,10})?$/).optional(),
  netAmount: z.string().regex(/^\d+(\.\d{1,10})?$/).optional(),
  currency: z.string().length(3).toUpperCase().optional(),
  reinvested: z.boolean().default(false),
  linkedTransactionId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  notes: z.string().max(2000).optional(),
});

async function getHandler(request, { params }) {
  const userId = await requireUserId();
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid investment ID" }, { status: 400 });
  }

  await connectDB();
  const holding = await InvestmentHolding.findById(id).lean();
  if (!holding) return NextResponse.json({ error: "Holding not found" }, { status: 404 });
  assertOwnership(holding.ownerId, userId);

  const dividends = await Dividend.find({ ownerId: userId, holdingId: id })
    .sort({ payDate: -1 })
    .lean();

  return NextResponse.json({
    dividends: dividends.map((d) => {
      const { _id, __v, ...rest } = d;
      return { ...rest, id: _id.toString() };
    }),
  });
}

async function postHandler(request, { params }) {
  const userId = await requireUserId();
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid investment ID" }, { status: 400 });
  }

  const body = await readJsonBody(request);
  const result = createDividendSchema.safeParse(body);
  if (!result.success) return validationError(result);
  const data = result.data;

  await connectDB();
  const holding = await InvestmentHolding.findById(id);
  if (!holding) return NextResponse.json({ error: "Holding not found" }, { status: 404 });
  assertOwnership(holding.ownerId, userId);

  // netAmount defaults to gross − tax when both are known.
  let netAmount = data.netAmount;
  if (!netAmount && data.taxWithheld) {
    netAmount = new Decimal(data.grossAmount).minus(data.taxWithheld).toFixed(2);
  }

  const dividend = await Dividend.create({
    ownerId: new mongoose.Types.ObjectId(userId),
    holdingId: holding._id,
    payDate: new Date(data.payDate),
    exDate: data.exDate ? new Date(data.exDate) : undefined,
    amountPerUnit: data.amountPerUnit
      ? mongoose.Types.Decimal128.fromString(data.amountPerUnit)
      : undefined,
    units: data.units ? mongoose.Types.Decimal128.fromString(data.units) : undefined,
    grossAmount: mongoose.Types.Decimal128.fromString(data.grossAmount),
    taxWithheld: data.taxWithheld
      ? mongoose.Types.Decimal128.fromString(data.taxWithheld)
      : undefined,
    netAmount: netAmount ? mongoose.Types.Decimal128.fromString(netAmount) : undefined,
    currency: data.currency || holding.currency,
    reinvested: data.reinvested,
    linkedTransactionId: data.linkedTransactionId
      ? new mongoose.Types.ObjectId(data.linkedTransactionId)
      : undefined,
    notes: data.notes,
  });

  await logAudit(
    userId,
    "create",
    "dividend",
    dividend._id.toString(),
    null,
    dividend.toJSON(),
    `Recorded dividend of ${data.grossAmount} for "${holding.name}"`,
    requestMeta(request)
  );

  return NextResponse.json({ dividend: dividend.toJSON() }, { status: 201 });
}

export const GET = withErrorHandling(getHandler);
export const POST = withErrorHandling(postHandler);
