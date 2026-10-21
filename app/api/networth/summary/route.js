// app/api/networth/summary/route.js
// GET /api/networth/summary
// Recorded net worth from persisted records using the deterministic calculation engine:
//   net worth = recorded assets + holdings at market value − recorded liabilities.
// Multi-currency amounts are converted only with explicit, dated stored rates.

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Asset from "@/lib/db/models/Asset";
import Liability from "@/lib/db/models/Liability";
import InvestmentHolding from "@/lib/db/models/InvestmentHolding";
import ExchangeRate from "@/lib/db/models/ExchangeRate";
import { requireUserId, withErrorHandling } from "@/lib/auth/session";
import { recordedNetWorth, unrealizedProfitLoss } from "@/lib/finance/calculations";
import { DEFAULT_CURRENCY } from "@/lib/finance/currency";
import { Decimal } from "decimal.js";

async function handler(request) {
  const userId = await requireUserId();
  await connectDB();

  const { searchParams } = new URL(request.url);
  const asOfParam = searchParams.get("asOf");

  const [assets, liabilities, investments, rateDocs] = await Promise.all([
    Asset.find({ ownerId: userId, status: "active" }).lean(),
    Liability.find({ ownerId: userId, status: "active" }).lean(),
    InvestmentHolding.find({ ownerId: userId, status: "active" }).lean(),
    ExchangeRate.find({ ownerId: userId }).lean(),
  ]);

  const rates = rateDocs.map((r) => ({
    from: r.from,
    to: r.to,
    rate: r.rate?.toString(),
    asOf: r.asOf,
  }));

  const nw = recordedNetWorth({
    assets: assets.map((a) => ({
      amount: a.currentValue?.amount?.toString() ?? null,
      currency: a.currency,
      category: a.category,
      name: a.name,
    })),
    liabilities: liabilities.map((l) => ({
      amount: l.currentBalance?.amount?.toString() ?? null,
      currency: l.currency,
      category: l.category,
      name: l.name,
    })),
    holdings: investments.map((h) => ({
      units: h.units?.toString() ?? null,
      price: h.currentPrice?.price?.toString() ?? null,
      currency: h.currency,
      type: h.type,
      name: h.name,
      costBasis: h.costBasis?.totalCost?.toString() ?? null,
    })),
    rates,
    reportingCurrency: DEFAULT_CURRENCY,
    atDate: asOfParam || null,
  });

  // Unrealized P&L across holdings (market value vs remaining cost basis)
  const pnl = investments
    .map((h) =>
      unrealizedProfitLoss({
        units: h.units?.toString(),
        price: h.currentPrice?.price?.toString(),
        costBasis: h.costBasis?.totalCost?.toString(),
      })
    )
    .filter((v) => v !== null);
  const totalUnrealized = pnl.reduce((acc, v) => acc.plus(v), new Decimal(0)).toFixed(2);

  return NextResponse.json({
    netWorth: nw.netWorth,
    totalAssets: nw.totalAssets,
    totalLiabilities: nw.totalLiabilities,
    assetsTotal: nw.assetsTotal,
    holdingsTotal: nw.holdingsTotal,
    totalUnrealizedPL: totalUnrealized,
    reportingCurrency: nw.reportingCurrency,
    asOf: nw.asOf,
    breakdown: nw.breakdown,
    recordCounts: {
      totalAssets: assets.length,
      totalInvestments: investments.length,
      totalLiabilities: liabilities.length,
    },
    dataQuality: {
      assetsWithMissingValue: nw.missing.assets,
      liabilitiesWithMissingBalance: nw.missing.liabilities,
      holdingsWithMissingPrice: nw.missing.holdings,
      unconvertible: nw.unconvertible,
      isPartial: nw.isPartial,
    },
  });
}

export const GET = withErrorHandling(handler);
