// app/api/investments/[id]/price/route.js
// POST /api/investments/[id]/price — record a new market price observation

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import InvestmentHolding from "@/lib/db/models/InvestmentHolding";
import { requireUserId, assertOwnership, withErrorHandling, validationError } from "@/lib/auth/session";
import { updatePriceSchema } from "@/lib/validations/schemas";
import { logAudit, requestMeta } from "@/lib/audit/logAudit";
import mongoose from "mongoose";
import { readJsonBody } from "@/lib/security/sanitize";

async function postHandler(request, { params }) {
  const userId = await requireUserId();
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid investment ID" }, { status: 400 });
  }

  const body = await readJsonBody(request);
  const parsed = updatePriceSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed);
  }
  const { price, asOf, source, currency } = parsed.data;

  await connectDB();
  const holding = await InvestmentHolding.findById(id);
  if (!holding) {
    return NextResponse.json({ error: "Holding not found" }, { status: 404 });
  }

  assertOwnership(holding.ownerId, userId);

  const effectiveCurrency = currency || holding.currency || "KES";
  const effectiveDate = asOf ? new Date(asOf) : new Date();

  const priceEntry = {
    price: mongoose.Types.Decimal128.fromString(price.toString()),
    currency: effectiveCurrency,
    asOf: effectiveDate,
    source,
  };

  holding.currentPrice = priceEntry;
  holding.priceHistory.push(priceEntry);

  await holding.save();

  await logAudit(
    userId,
    "update",
    "investment",
    holding._id.toString(),
    null,
    { price, currency: effectiveCurrency, asOf: effectiveDate.toISOString(), source },
    `Recorded price for "${holding.name}"`,
    requestMeta(request)
  );

  return NextResponse.json({
    holding: {
      ...holding.toJSON(),
      id: holding._id.toString(),
    },
    priceEntry: {
      price: price.toString(),
      currency: effectiveCurrency,
      asOf: effectiveDate.toISOString(),
      source,
    },
  });
}

export const POST = withErrorHandling(postHandler);
