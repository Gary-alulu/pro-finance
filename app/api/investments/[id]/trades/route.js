// app/api/investments/[id]/trades/route.js
// GET /api/investments/[id]/trades — list manually recorded trades for a holding
// POST /api/investments/[id]/trades — record a buy/sell and update the position

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import InvestmentHolding from "@/lib/db/models/InvestmentHolding";
import InvestmentTrade from "@/lib/db/models/InvestmentTrade";
import { requireUserId, assertOwnership, withErrorHandling, validationError } from "@/lib/auth/session";
import { logAudit, requestMeta } from "@/lib/audit/logAudit";
import { applyTradeToPosition } from "@/lib/finance/calculations";
import { z } from "zod";
import mongoose from "mongoose";
import { readJsonBody } from "@/lib/security/sanitize";

const createTradeSchema = z.object({
  side: z.enum(["buy", "sell"]),
  tradedAt: z.string().datetime({ offset: true }).or(z.string().date()),
  units: z.string().regex(/^\d+(\.\d{1,10})?$/),
  pricePerUnit: z.string().regex(/^\d+(\.\d{1,10})?$/),
  grossAmount: z.string().regex(/^\d+(\.\d{1,10})?$/),
  fees: z.string().regex(/^\d+(\.\d{1,10})?$/).optional(),
  taxes: z.string().regex(/^\d+(\.\d{1,10})?$/).optional(),
  currency: z.string().length(3).toUpperCase().optional(),
  linkedTransactionId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  documentId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
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

  const trades = await InvestmentTrade.find({ ownerId: userId, holdingId: id })
    .sort({ tradedAt: -1 })
    .lean();

  return NextResponse.json({
    trades: trades.map((t) => {
      const { _id, __v, ...rest } = t;
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
  const result = createTradeSchema.safeParse(body);
  if (!result.success) return validationError(result);
  const data = result.data;

  await connectDB();
  const holding = await InvestmentHolding.findById(id);
  if (!holding) return NextResponse.json({ error: "Holding not found" }, { status: 404 });
  assertOwnership(holding.ownerId, userId);

  if (data.side === "sell") {
    const held = holding.units ? Number(holding.units.toString()) : 0;
    if (Number(data.units) > held) {
      return NextResponse.json(
        { error: `Cannot sell ${data.units} units — only ${held} held` },
        { status: 400 }
      );
    }
  }

  const trade = await InvestmentTrade.create({
    ownerId: new mongoose.Types.ObjectId(userId),
    holdingId: holding._id,
    side: data.side,
    tradedAt: new Date(data.tradedAt),
    units: mongoose.Types.Decimal128.fromString(data.units),
    pricePerUnit: mongoose.Types.Decimal128.fromString(data.pricePerUnit),
    grossAmount: mongoose.Types.Decimal128.fromString(data.grossAmount),
    fees: data.fees ? mongoose.Types.Decimal128.fromString(data.fees) : undefined,
    taxes: data.taxes ? mongoose.Types.Decimal128.fromString(data.taxes) : undefined,
    currency: data.currency || holding.currency,
    linkedTransactionId: data.linkedTransactionId
      ? new mongoose.Types.ObjectId(data.linkedTransactionId)
      : undefined,
    documentId: data.documentId ? new mongoose.Types.ObjectId(data.documentId) : undefined,
    notes: data.notes,
  });

  // Update position using deterministic average-cost arithmetic.
  const before = { units: holding.units?.toString(), totalCost: holding.costBasis?.totalCost?.toString() };
  const next = applyTradeToPosition({
    units: holding.units?.toString() ?? "0",
    totalCost: holding.costBasis?.totalCost?.toString() ?? "0",
    side: data.side,
    tradeUnits: data.units,
    grossAmount: data.grossAmount,
    fees: data.fees,
  });

  holding.units = mongoose.Types.Decimal128.fromString(next.units);
  holding.costBasis = {
    totalCost: mongoose.Types.Decimal128.fromString(next.totalCost),
    currency: holding.costBasis?.currency || holding.currency,
    asOf: new Date(data.tradedAt),
  };
  await holding.save();

  await logAudit(
    userId,
    "create",
    "trade",
    trade._id.toString(),
    before,
    { side: data.side, units: data.units, grossAmount: data.grossAmount, position: next },
    `Recorded ${data.side} of ${data.units} units in "${holding.name}"`,
    requestMeta(request)
  );

  return NextResponse.json(
    {
      trade: trade.toJSON(),
      holding: holding.toJSON(),
    },
    { status: 201 }
  );
}

export const GET = withErrorHandling(getHandler);
export const POST = withErrorHandling(postHandler);
