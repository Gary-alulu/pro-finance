// app/api/investments/route.js
// GET /api/investments — list investment holdings with decimal-safe valuations
// POST /api/investments — create a new investment holding

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import InvestmentHolding from "@/lib/db/models/InvestmentHolding";
import { requireUserId, assertOwnedRef, withErrorHandling, validationError } from "@/lib/auth/session";
import Account from "@/lib/db/models/Account";
import { logAudit, requestMeta } from "@/lib/audit/logAudit";
import { createInvestmentSchema } from "@/lib/validations/schemas";
import { Decimal } from "decimal.js";
import mongoose from "mongoose";
import { readJsonBody } from "@/lib/security/sanitize";

async function getHandler(request) {
  const userId = await requireUserId();
  await connectDB();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "active";
  const type = searchParams.get("type");
  const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);
  const skip = parseInt(searchParams.get("skip") || "0");

  const filter = { ownerId: userId };
  if (status !== "all") filter.status = status;
  if (type) filter.type = type;

  const [holdings, total] = await Promise.all([
    InvestmentHolding.find(filter)
      .populate("linkedAccountId", "name category")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    InvestmentHolding.countDocuments(filter),
  ]);

  // Compute market values and gains using Decimal
  const formatted = holdings.map((h) => {
    let marketValue = null;
    let gainLoss = null;
    let gainLossPercent = null;

    if (h.units && h.currentPrice?.price) {
      try {
        const u = new Decimal(h.units.toString());
        const p = new Decimal(h.currentPrice.price.toString());
        const mv = u.times(p);
        marketValue = mv.toFixed(2);

        if (h.costBasis?.totalCost) {
          const cb = new Decimal(h.costBasis.totalCost.toString());
          const diff = mv.minus(cb);
          gainLoss = diff.toFixed(2);
          if (!cb.isZero()) {
            gainLossPercent = diff.dividedBy(cb).times(100).toFixed(2);
          }
        }
      } catch (e) {
        console.error("Error computing investment valuation:", e);
      }
    }

    return {
      ...h,
      id: h._id.toString(),
      units: h.units ? h.units.toString() : null,
      costBasis: h.costBasis
        ? {
            ...h.costBasis,
            totalCost: h.costBasis.totalCost ? h.costBasis.totalCost.toString() : null,
          }
        : null,
      currentPrice: h.currentPrice
        ? {
            ...h.currentPrice,
            price: h.currentPrice.price ? h.currentPrice.price.toString() : null,
          }
        : null,
      marketValue,
      gainLoss,
      gainLossPercent,
      linkedAccount: h.linkedAccountId
        ? {
            id: h.linkedAccountId._id?.toString() || h.linkedAccountId.toString(),
            name: h.linkedAccountId.name,
          }
        : null,
    };
  });

  return NextResponse.json({
    holdings: formatted,
    total,
    skip,
    limit,
  });
}

async function postHandler(request) {
  const userId = await requireUserId();
  const body = await readJsonBody(request);

  const result = createInvestmentSchema.safeParse(body);
  if (!result.success) {
    return validationError(result);
  }

  await connectDB();
  const data = result.data;

  const holdingData = {
    ownerId: new mongoose.Types.ObjectId(userId),
    name: data.name,
    type: data.type,
    ticker: data.ticker,
    exchange: data.exchange,
    currency: data.currency,
    status: data.status,
    notes: data.notes,
  };

  if (data.units) {
    holdingData.units = mongoose.Types.Decimal128.fromString(data.units);
  }

  if (data.costBasis) {
    holdingData.costBasis = {
      totalCost: mongoose.Types.Decimal128.fromString(data.costBasis.totalCost),
      currency: data.costBasis.currency || data.currency,
      asOf: new Date(data.costBasis.asOf),
    };
  }

  if (data.currentPrice) {
    holdingData.currentPrice = {
      price: mongoose.Types.Decimal128.fromString(data.currentPrice.price),
      currency: data.currentPrice.currency || data.currency,
      asOf: new Date(data.currentPrice.asOf),
      source: data.currentPrice.source || "manual",
    };
    holdingData.priceHistory = [
      {
        price: mongoose.Types.Decimal128.fromString(data.currentPrice.price),
        currency: data.currentPrice.currency || data.currency,
        asOf: new Date(data.currentPrice.asOf),
        source: data.currentPrice.source || "manual",
      },
    ];
  }

  if (data.linkedAccountId) {
    // M-5: linked records must be owned by the current user
    await assertOwnedRef(Account, data.linkedAccountId, userId);
    holdingData.linkedAccountId = new mongoose.Types.ObjectId(data.linkedAccountId);
  }

  const holding = await InvestmentHolding.create(holdingData);

  await logAudit(
    userId,
    "create",
    "investment",
    holding._id.toString(),
    null,
    holding.toJSON(),
    `Created investment holding "${holding.name}"`,
    requestMeta(request)
  );

  return NextResponse.json(
    {
      holding: {
        ...holding.toJSON(),
        id: holding._id.toString(),
      },
    },
    { status: 201 }
  );
}

export const GET = withErrorHandling(getHandler);
export const POST = withErrorHandling(postHandler);
