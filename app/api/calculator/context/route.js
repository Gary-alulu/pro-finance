// app/api/calculator/context/route.js
// GET /api/calculator/context
// Provides verified platform record data to prefill integrated calculator modes.

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Asset from "@/lib/db/models/Asset";
import Liability from "@/lib/db/models/Liability";
import InvestmentHolding from "@/lib/db/models/InvestmentHolding";
import ExchangeRate from "@/lib/db/models/ExchangeRate";
import { requireUserId, withErrorHandling } from "@/lib/auth/session";

async function getHandler(request) {
  const userId = await requireUserId();
  await connectDB();

  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entityType") || "all";
  const entityId = searchParams.get("entityId");

  const result = {};

  if (entityType === "asset" || entityType === "all") {
    const filter = { ownerId: userId, status: "active" };
    if (entityId && entityType === "asset") filter._id = entityId;

    const assets = await Asset.find(filter)
      .select("name category currency currentValue purchasePrice acquisitionDate ownershipPercentage")
      .lean();

    result.assets = assets.map((a) => ({
      id: a._id.toString(),
      name: a.name,
      category: a.category,
      currency: a.currency || "KES",
      currentValue: a.currentValue?.amount ? a.currentValue.amount.toString() : "0.00",
      purchasePrice: a.purchasePrice ? a.purchasePrice.toString() : "0.00",
      acquisitionDate: a.acquisitionDate,
      ownershipPercentage: a.ownershipPercentage || 100,
    }));
  }

  if (entityType === "liability" || entityType === "all") {
    const filter = { ownerId: userId, status: "active" };
    if (entityId && entityType === "liability") filter._id = entityId;

    const liabilities = await Liability.find(filter)
      .select("name category currency currentBalance principalAmount interestRate repaymentFrequency minimumRepayment termMonths")
      .lean();

    result.liabilities = liabilities.map((l) => ({
      id: l._id.toString(),
      name: l.name,
      category: l.category,
      currency: l.currency || "KES",
      currentBalance: l.currentBalance?.amount ? l.currentBalance.amount.toString() : "0.00",
      principalAmount: l.principalAmount ? l.principalAmount.toString() : "0.00",
      interestRate: l.interestRate ? l.interestRate.toString() : "0.00",
      repaymentFrequency: l.repaymentFrequency || "monthly",
      minimumRepayment: l.minimumRepayment ? l.minimumRepayment.toString() : "0.00",
      termMonths: l.termMonths || 0,
    }));
  }

  if (entityType === "investment" || entityType === "all") {
    const filter = { ownerId: userId, status: "active" };
    if (entityId && entityType === "investment") filter._id = entityId;

    const holdings = await InvestmentHolding.find(filter)
      .select("symbol assetName assetClass quantity costBasis currentPrice currency")
      .lean();

    result.investments = holdings.map((h) => ({
      id: h._id.toString(),
      symbol: h.symbol,
      assetName: h.assetName,
      assetClass: h.assetClass,
      currency: h.currency || "KES",
      quantity: h.quantity ? h.quantity.toString() : "0",
      costBasis: h.costBasis ? h.costBasis.toString() : "0.00",
      currentPrice: h.currentPrice?.price ? h.currentPrice.price.toString() : "0.00",
    }));
  }

  if (entityType === "fx_rates" || entityType === "all") {
    const rates = await ExchangeRate.find({ ownerId: userId })
      .sort({ asOf: -1 })
      .limit(50)
      .lean();

    result.rates = rates.map((r) => ({
      id: r._id.toString(),
      from: r.from,
      to: r.to,
      rate: r.rate ? r.rate.toString() : "1.0",
      asOf: r.asOf,
      source: r.source,
    }));
  }

  return NextResponse.json(result);
}

export const GET = withErrorHandling(getHandler);

