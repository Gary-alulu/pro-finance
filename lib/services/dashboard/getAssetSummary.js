// lib/services/dashboard/getAssetSummary.js
// Assets composition, category breakdown, valuation freshness and attributable share.

import { connectDB } from "@/lib/db/mongoose";
import Asset from "@/lib/db/models/Asset";
import ExchangeRate from "@/lib/db/models/ExchangeRate";
import InvestmentHolding from "@/lib/db/models/InvestmentHolding";
import { convertToReporting, holdingMarketValue } from "@/lib/finance/calculations";
import { DEFAULT_CURRENCY } from "@/lib/finance/currency";
import { Decimal } from "decimal.js";

const CATEGORY_LABELS = {
  cash: "Cash & Bank Accounts",
  bank_account: "Cash & Bank Accounts",
  money_market: "Money Market Funds",
  listed_equity: "Listed Shares & Equities",
  property: "Property & Land",
  vehicle: "Vehicles",
  private_equity: "Business Ownership & Assets",
  equipment: "Equipment & Electronics",
  retirement: "Retirement Funds",
  bond: "Bonds & Fixed Income",
  crypto: "Crypto Assets",
  receivable: "Receivables",
  other: "Other Recorded Assets",
};

export async function getAssetSummary(
  userId,
  { reportingCurrency = DEFAULT_CURRENCY, staleThresholdDays = 90 } = {}
) {
  await connectDB();
  const rep = (reportingCurrency || DEFAULT_CURRENCY).toUpperCase();
  const now = new Date();
  const DAY_MS = 24 * 60 * 60 * 1000;

  const [assets, rateDocs, holdings] = await Promise.all([
    Asset.find({ ownerId: userId, status: "active" }).sort({ createdAt: -1 }).lean(),
    ExchangeRate.find({ ownerId: userId }).lean(),
    InvestmentHolding.find({ ownerId: userId, status: "active" }).lean(),
  ]);

  const rates = rateDocs.map((r) => ({
    from: r.from,
    to: r.to,
    rate: r.rate?.toString(),
    asOf: r.asOf,
  }));

  let totalAttributable = new Decimal(0);
  const byCategoryMap = new Map();
  const enrichedRecords = [];
  let staleCount = 0;
  let missingValuationCount = 0;

  // Process physical/recorded assets
  for (const a of assets) {
    const rawVal = a.currentValue?.amount ? new Decimal(a.currentValue.amount.toString()) : null;
    const ownPct = a.ownershipPercentage != null ? new Decimal(a.ownershipPercentage) : new Decimal(100);

    if (rawVal === null) {
      missingValuationCount += 1;
      enrichedRecords.push({
        id: a._id.toString(),
        name: a.name,
        category: a.category,
        categoryLabel: CATEGORY_LABELS[a.category] || "Other Assets",
        currency: a.currency || rep,
        originalValue: null,
        attributableValue: null,
        ownershipPercentage: ownPct.toNumber(),
        convertedValue: null,
        valuationAsOf: null,
        daysSinceValuation: null,
        isStale: true,
        hasValuation: false,
        status: a.status,
      });
      continue;
    }

    const attributable = rawVal.times(ownPct.dividedBy(100));
    const { converted, rate, rateAsOf } = convertToReporting(
      attributable,
      a.currency,
      rates,
      rep,
      now
    );

    const asOfDate = a.currentValue?.asOf ? new Date(a.currentValue.asOf) : new Date(a.updatedAt);
    const daysSince = Math.floor((now.getTime() - asOfDate.getTime()) / DAY_MS);
    const isStale = daysSince > staleThresholdDays;
    if (isStale) staleCount += 1;

    if (converted !== null) {
      totalAttributable = totalAttributable.plus(converted);
      const catKey = a.category || "other";
      const curCatTotal = byCategoryMap.get(catKey) || new Decimal(0);
      byCategoryMap.set(catKey, curCatTotal.plus(converted));
    }

    enrichedRecords.push({
      id: a._id.toString(),
      name: a.name,
      category: a.category,
      categoryLabel: CATEGORY_LABELS[a.category] || "Other Assets",
      currency: a.currency || rep,
      originalValue: rawVal.toFixed(2),
      attributableValue: attributable.toFixed(2),
      ownershipPercentage: ownPct.toNumber(),
      convertedValue: converted,
      rate,
      rateAsOf,
      valuationAsOf: asOfDate.toISOString(),
      daysSinceValuation: daysSince,
      isStale,
      hasValuation: true,
      status: a.status,
    });
  }

  // Also account for investment holdings as asset category
  for (const h of holdings) {
    const mv = holdingMarketValue(h);
    if (mv === null) continue;
    const { converted } = convertToReporting(mv, h.currency, rates, rep, now);
    if (converted !== null) {
      totalAttributable = totalAttributable.plus(converted);
      const catKey = h.type === "bond" ? "bond" : "listed_equity";
      const curCatTotal = byCategoryMap.get(catKey) || new Decimal(0);
      byCategoryMap.set(catKey, curCatTotal.plus(converted));
    }
  }

  // Build allocation percentages
  const allocation = [];
  for (const [category, amountDec] of byCategoryMap.entries()) {
    const amountStr = amountDec.toFixed(2);
    const pct = totalAttributable.greaterThan(0)
      ? amountDec.dividedBy(totalAttributable).times(100).toFixed(1)
      : "0.0";
    allocation.push({
      category,
      label: CATEGORY_LABELS[category] || category,
      amount: amountStr,
      percentage: Number(pct),
    });
  }

  allocation.sort((a, b) => Number(b.amount) - Number(a.amount));

  return {
    totalAssetValue: totalAttributable.toFixed(2),
    reportingCurrency: rep,
    allocation,
    records: enrichedRecords,
    summary: {
      totalCount: assets.length,
      staleCount,
      missingValuationCount,
      freshCount: assets.length - staleCount - missingValuationCount,
    },
  };
}
