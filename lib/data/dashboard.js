// lib/data/dashboard.js
// Server-side data loaders for the Overview dashboard.
// These mirror the read paths of the corresponding API routes so pages can
// render on the server (no client fetch waterfall on first paint). The API
// routes remain the source of truth for client-side refreshes.

import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import Asset from "@/lib/db/models/Asset";
import Liability from "@/lib/db/models/Liability";
import InvestmentHolding from "@/lib/db/models/InvestmentHolding";
import ExchangeRate from "@/lib/db/models/ExchangeRate";
import AccountabilityItem from "@/lib/db/models/AccountabilityItem";
import Transaction from "@/lib/db/models/Transaction";
import FinancialSnapshot from "@/lib/db/models/FinancialSnapshot";
import { recordedNetWorth, unrealizedProfitLoss } from "@/lib/finance/calculations";
import { DEFAULT_CURRENCY } from "@/lib/finance/currency";
import { Decimal } from "decimal.js";

// Mirrors GET /api/networth/summary
export async function getNetWorthSummary(userId) {
  await connectDB();

  const [assets, liabilities, investments, rateDocs] = await Promise.all([
    Asset.find({ ownerId: userId, status: "active" }).select("-valuationHistory").lean(),
    Liability.find({ ownerId: userId, status: "active" }).lean(),
    InvestmentHolding.find({ ownerId: userId, status: "active" }).select("-priceHistory").lean(),
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
    atDate: null,
  });

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

  return JSON.parse(
    JSON.stringify({
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
    })
  );
}

// Mirrors GET /api/networth/snapshots (list only)
export async function getNetWorthSnapshots(userId, limit = 365) {
  await connectDB();
  const snapshots = await FinancialSnapshot.find({ ownerId: userId })
    .sort({ takenAt: 1 })
    .limit(Math.min(limit, 1000))
    .lean();
  return JSON.parse(
    JSON.stringify(
      snapshots.map((s) => ({
        id: s._id.toString(),
        takenAt: s.takenAt,
        netWorth: s.netWorth?.toString(),
        totalAssets: s.totalAssets?.toString(),
        totalLiabilities: s.totalLiabilities?.toString(),
        currency: s.currency,
        isManual: s.isManual,
      }))
    )
  );
}

// Mirrors GET /api/assets?summary=true
export async function getAssetAllocation(userId) {
  await connectDB();
  const byCategory = await Asset.aggregate([
    { $match: { ownerId: new mongoose.Types.ObjectId(userId), status: "active" } },
    { $group: { _id: "$category", amount: { $sum: "$currentValue.amount" } } },
    { $project: { _id: 0, category: "$_id", amount: { $toString: "$amount" } } },
  ]);
  return JSON.parse(JSON.stringify(byCategory));
}

// Mirrors GET /api/transactions?limit=8&sort=-date
export async function getRecentTransactions(userId, limit = 8) {
  await connectDB();
  const transactions = await Transaction.find({ ownerId: userId })
    .sort({ date: -1 })
    .limit(limit)
    .lean();
  return JSON.parse(
    JSON.stringify(
      transactions.map((t) => ({
        ...t,
        id: t._id.toString(),
        amount: t.amount?.toString(),
      }))
    )
  );
}

// Mirrors GET /api/accountability — returns { items, summary }
export async function getAccountability(userId, { status = "open", limit = 6 } = {}) {
  await connectDB();

  const filter = { ownerId: userId };
  if (status !== "all") filter.status = status;

  const [items, counts] = await Promise.all([
    AccountabilityItem.find(filter)
      .sort({ severity: 1, createdAt: -1 })
      .limit(Math.min(limit, 500))
      .lean(),
    AccountabilityItem.aggregate([
      { $match: { ownerId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: { status: "$status", severity: "$severity" }, count: { $sum: 1 } } },
    ]),
  ]);

  const summary = { open: 0, resolved: 0, dismissed: 0, errors: 0, warnings: 0, infos: 0 };
  for (const c of counts) {
    summary[c._id.status] = (summary[c._id.status] || 0) + c.count;
    if (c._id.status === "open") {
      if (c._id.severity === "error" || c._id.severity === "high") summary.errors += c.count;
      else if (c._id.severity === "warning" || c._id.severity === "medium") summary.warnings += c.count;
      else summary.infos += c.count;
    }
  }

  return JSON.parse(
    JSON.stringify({
      items: items.map(({ _id, __v, ownerId, ...rest }) => ({
        ...rest,
        id: _id.toString(),
      })),
      summary,
    })
  );
}
