// lib/services/dashboard/getNetWorthSummary.js
// Deterministic Net Worth aggregation service.
// Single source of truth: recorded assets, holdings at market value, recorded liabilities.
// Accounts for asset ownership percentages, multi-currency dated FX conversion,
// and separates cash & equivalents from investment holdings without double counting.

import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import Asset from "@/lib/db/models/Asset";
import Liability from "@/lib/db/models/Liability";
import InvestmentHolding from "@/lib/db/models/InvestmentHolding";
import Account from "@/lib/db/models/Account";
import ExchangeRate from "@/lib/db/models/ExchangeRate";
import FinancialSnapshot from "@/lib/db/models/FinancialSnapshot";
import {
  recordedNetWorth,
  unrealizedProfitLoss,
  holdingMarketValue,
  convertToReporting,
} from "@/lib/finance/calculations";
import { DEFAULT_CURRENCY, percentageChange } from "@/lib/finance/currency";
import { Decimal } from "decimal.js";

const CASH_CATEGORIES = new Set([
  "cash",
  "bank_account",
  "mobile_money",
  "bank_checking",
  "bank_savings",
  "money_market",
]);

/**
 * Retrieve verified deterministic net worth summary.
 *
 * @param {string} userId - Authenticated user ObjectId
 * @param {object} options
 * @param {string} [options.reportingCurrency] - Currency to convert into (default: KES)
 * @param {Date|string} [options.asOf] - Target valuation date
 * @param {boolean} [options.includeComparison] - Compare with prior snapshot
 */
export async function getNetWorthSummary(
  userId,
  { reportingCurrency = DEFAULT_CURRENCY, asOf = null, includeComparison = true } = {}
) {
  await connectDB();
  const rep = (reportingCurrency || DEFAULT_CURRENCY).toUpperCase();

  const [assets, liabilities, investments, accounts, rateDocs, latestSnapshot] =
    await Promise.all([
      Asset.find({ ownerId: userId, status: "active" }).select("-valuationHistory").lean(),
      Liability.find({ ownerId: userId, status: "active" }).lean(),
      InvestmentHolding.find({ ownerId: userId, status: "active" }).select("-priceHistory").lean(),
      Account.find({ ownerId: userId, status: "active" }).lean(),
      ExchangeRate.find({ ownerId: userId }).lean(),
      includeComparison
        ? FinancialSnapshot.findOne({ ownerId: userId }).sort({ takenAt: -1 }).lean()
        : null,
    ]);

  const rates = rateDocs.map((r) => ({
    from: r.from,
    to: r.to,
    rate: r.rate?.toString(),
    asOf: r.asOf,
  }));

  // Identify linked account IDs to avoid double counting assets that link to accounts
  const linkedAssetIds = new Set(
    accounts.map((a) => a.linkedAssetId?.toString()).filter(Boolean)
  );

  // Prepare assets payload with attributable ownership
  const assetsPayload = assets.map((a) => ({
    id: a._id.toString(),
    name: a.name,
    category: a.category,
    amount: a.currentValue?.amount?.toString() ?? null,
    ownershipPercentage: a.ownershipPercentage ?? 100,
    currency: a.currency || rep,
    asOf: a.currentValue?.asOf || a.updatedAt,
  }));

  // Add any active cash accounts that are NOT already represented as linked assets
  for (const acc of accounts) {
    if (acc.linkedAssetId) continue;
    if (acc.currentBalance == null) continue;
    assetsPayload.push({
      id: acc._id.toString(),
      name: acc.name,
      category: acc.type === "mobile_money" ? "cash" : "bank_account",
      amount: acc.currentBalance.toString(),
      ownershipPercentage: 100,
      currency: acc.currency || rep,
      asOf: acc.balanceAsOf || acc.updatedAt,
      isAccountDoc: true,
    });
  }

  const liabilitiesPayload = liabilities.map((l) => ({
    id: l._id.toString(),
    name: l.name,
    category: l.category,
    amount: l.currentBalance?.amount?.toString() ?? null,
    currency: l.currency || rep,
    asOf: l.currentBalance?.asOf || l.updatedAt,
  }));

  const holdingsPayload = investments.map((h) => ({
    id: h._id.toString(),
    name: h.name,
    ticker: h.ticker,
    type: h.type,
    units: h.units?.toString() ?? null,
    price: h.currentPrice?.price?.toString() ?? null,
    costBasis: h.costBasis?.totalCost?.toString() ?? null,
    currency: h.currency || rep,
    asOf: h.currentPrice?.asOf || h.updatedAt,
  }));

  const nw = recordedNetWorth({
    assets: assetsPayload,
    liabilities: liabilitiesPayload,
    holdings: holdingsPayload,
    rates,
    reportingCurrency: rep,
    atDate: asOf,
  });

  // Calculate Cash & Equivalents specifically
  let cashTotal = new Decimal(0);
  for (const item of nw.trace?.assets || []) {
    if (!item.isIncluded || item.convertedAmount == null) continue;
    if (CASH_CATEGORIES.has(item.category)) {
      cashTotal = cashTotal.plus(item.convertedAmount);
    }
  }

  // Calculate Unrealized P&L
  const pnlList = investments
    .map((h) =>
      unrealizedProfitLoss({
        units: h.units?.toString(),
        price: h.currentPrice?.price?.toString(),
        costBasis: h.costBasis?.totalCost?.toString(),
      })
    )
    .filter((v) => v !== null);

  const totalUnrealized = pnlList
    .reduce((acc, v) => acc.plus(v), new Decimal(0))
    .toFixed(2);

  // Period comparison (against previous snapshot or baseline)
  let comparison = null;
  if (latestSnapshot && latestSnapshot.netWorth) {
    const prevNW = latestSnapshot.netWorth.toString();
    const pct = percentageChange(prevNW, nw.netWorth);
    comparison = {
      previousNetWorth: prevNW,
      percentageChange: pct,
      previousTakenAt: latestSnapshot.takenAt,
      isPositive: pct !== null ? new Decimal(pct).greaterThanOrEqualTo(0) : null,
    };
  }

  // Freshness calculation
  let oldestValuationDate = null;
  let newestValuationDate = null;
  for (const a of assets) {
    const d = a.currentValue?.asOf || a.updatedAt;
    if (!d) continue;
    const time = new Date(d).getTime();
    if (!oldestValuationDate || time < oldestValuationDate) oldestValuationDate = time;
    if (!newestValuationDate || time > newestValuationDate) newestValuationDate = time;
  }

  return {
    netWorth: nw.netWorth,
    totalAssets: nw.totalAssets,
    totalLiabilities: nw.totalLiabilities,
    assetsTotal: nw.assetsTotal,
    holdingsTotal: nw.holdingsTotal,
    cashAndEquivalents: cashTotal.toFixed(2),
    investmentValue: nw.holdingsTotal,
    totalUnrealizedPL: totalUnrealized,
    reportingCurrency: nw.reportingCurrency,
    asOf: nw.asOf,
    breakdown: nw.breakdown,
    comparison,
    recordCounts: {
      totalAssets: assets.length + accounts.filter((a) => !a.linkedAssetId).length,
      totalInvestments: investments.length,
      totalLiabilities: liabilities.length,
    },
    dataQuality: {
      assetsWithMissingValue: nw.missing.assets,
      liabilitiesWithMissingBalance: nw.missing.liabilities,
      holdingsWithMissingPrice: nw.missing.holdings,
      unconvertible: nw.unconvertible,
      isPartial: nw.isPartial,
      oldestValuationDate: oldestValuationDate ? new Date(oldestValuationDate).toISOString() : null,
      newestValuationDate: newestValuationDate ? new Date(newestValuationDate).toISOString() : null,
    },
    trace: nw.trace,
  };
}
