// app/api/investments/[id]/route.js
// GET /api/investments/[id] — fetch single investment
// PATCH /api/investments/[id] — update investment details
// DELETE /api/investments/[id] — delete an investment holding

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import InvestmentHolding from "@/lib/db/models/InvestmentHolding";
import { requireUserId, assertOwnership, assertOwnedRef, withErrorHandling, validationError } from "@/lib/auth/session";
import Account from "@/lib/db/models/Account";
import { logAudit, requestMeta } from "@/lib/audit/logAudit";
import { updateInvestmentSchema } from "@/lib/validations/schemas";
import mongoose from "mongoose";
import { readJsonBody } from "@/lib/security/sanitize";

async function getHandler(request, { params }) {
  const userId = await requireUserId();
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid investment ID" }, { status: 400 });
  }

  await connectDB();
  const holding = await InvestmentHolding.findById(id)
    .populate("linkedAccountId", "name category")
    .lean();

  if (!holding) {
    return NextResponse.json({ error: "Holding not found" }, { status: 404 });
  }

  assertOwnership(holding.ownerId, userId);

  return NextResponse.json({
    holding: {
      ...holding,
      id: holding._id.toString(),
      units: holding.units ? holding.units.toString() : null,
      costBasis: holding.costBasis
        ? {
            ...holding.costBasis,
            totalCost: holding.costBasis.totalCost ? holding.costBasis.totalCost.toString() : null,
          }
        : null,
      currentPrice: holding.currentPrice
        ? {
            ...holding.currentPrice,
            price: holding.currentPrice.price ? holding.currentPrice.price.toString() : null,
          }
        : null,
      priceHistory: (holding.priceHistory || []).map((p) => ({
        ...p,
        price: p.price ? p.price.toString() : null,
      })),
    },
  });
}

async function patchHandler(request, { params }) {
  const userId = await requireUserId();
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid investment ID" }, { status: 400 });
  }

  const body = await readJsonBody(request);
  const result = updateInvestmentSchema.safeParse(body);
  if (!result.success) {
    return validationError(result);
  }

  await connectDB();
  const existing = await InvestmentHolding.findById(id);
  if (!existing) {
    return NextResponse.json({ error: "Holding not found" }, { status: 404 });
  }

  assertOwnership(existing.ownerId, userId);
  const before = existing.toJSON();

  const data = result.data;
  if (data.name !== undefined) existing.name = data.name;
  if (data.type !== undefined) existing.type = data.type;
  if (data.ticker !== undefined) existing.ticker = data.ticker;
  if (data.exchange !== undefined) existing.exchange = data.exchange;
  if (data.currency !== undefined) existing.currency = data.currency;
  if (data.status !== undefined) existing.status = data.status;
  if (data.notes !== undefined) existing.notes = data.notes;

  if (data.units !== undefined) {
    existing.units = data.units ? mongoose.Types.Decimal128.fromString(data.units) : null;
  }

  if (data.costBasis !== undefined) {
    existing.costBasis = data.costBasis
      ? {
          totalCost: mongoose.Types.Decimal128.fromString(data.costBasis.totalCost),
          currency: data.costBasis.currency || existing.currency,
          asOf: new Date(data.costBasis.asOf),
        }
      : null;
  }

  if (data.currentPrice !== undefined) {
    existing.currentPrice = data.currentPrice
      ? {
          price: mongoose.Types.Decimal128.fromString(data.currentPrice.price),
          currency: data.currentPrice.currency || existing.currency,
          asOf: new Date(data.currentPrice.asOf),
          source: data.currentPrice.source || "manual",
        }
      : null;

    if (data.currentPrice) {
      existing.priceHistory.push({
        price: mongoose.Types.Decimal128.fromString(data.currentPrice.price),
        currency: data.currentPrice.currency || existing.currency,
        asOf: new Date(data.currentPrice.asOf),
        source: data.currentPrice.source || "manual",
      });
    }
  }

  if (data.linkedAccountId !== undefined) {
    // M-5: linked records must be owned by the current user
    if (data.linkedAccountId) {
      await assertOwnedRef(Account, data.linkedAccountId, userId);
    }
    existing.linkedAccountId = data.linkedAccountId
      ? new mongoose.Types.ObjectId(data.linkedAccountId)
      : null;
  }

  await existing.save();

  await logAudit(
    userId,
    "update",
    "investment",
    existing._id.toString(),
    before,
    existing.toJSON(),
    `Updated investment holding "${existing.name}"`,
    requestMeta(request)
  );

  return NextResponse.json({
    holding: {
      ...existing.toJSON(),
      id: existing._id.toString(),
    },
  });
}

async function deleteHandler(request, { params }) {
  const userId = await requireUserId();
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid investment ID" }, { status: 400 });
  }

  await connectDB();
  const existing = await InvestmentHolding.findById(id);
  if (!existing) {
    return NextResponse.json({ error: "Holding not found" }, { status: 404 });
  }

  assertOwnership(existing.ownerId, userId);

  const before = existing.toJSON();
  await InvestmentHolding.findByIdAndDelete(id);

  await logAudit(
    userId,
    "delete",
    "investment",
    id,
    before,
    null,
    `Deleted investment holding "${before.name}"`,
    requestMeta(request)
  );

  return NextResponse.json({ success: true, deletedId: id });
}

export const GET = withErrorHandling(getHandler);
export const PATCH = withErrorHandling(patchHandler);
export const DELETE = withErrorHandling(deleteHandler);
