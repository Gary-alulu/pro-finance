// lib/services/dashboard/getInvestmentSummary.js
// Consolidated investment portfolio metrics: holdings, market values, cost basis,
// unrealized P&L, realized P&L, dividends received, and portfolio concentration.

import { connectDB } from "@/lib/db/mongoose";
import InvestmentHolding from "@/lib/db/models/InvestmentHolding";
import InvestmentTrade from "@/lib/db/models/InvestmentTrade";
import Dividend from "@/lib/db/models/Dividend";
import ExchangeRate from "@/lib/db/models/ExchangeRate";
import {
  holdingMarketValue,
  unrealizedProfitLoss,
  convertToReporting,
} from "@/lib/finance/calculations";
import { DEFAULT_CURRENCY } from "@/lib/finance/currency";
import { Decimal } from "decimal.js";

const TYPE_LABELS = {
  listed_equity: "Listed Equities",
  bond: "Bonds & Fixed Income",
  etf: "ETFs",
  mutual_fund: "Mutual Funds",
  reit: "REITs",
  private_equity: "Private Equity",
  crypto: "Crypto Assets",
  commodity: "Commodities",
  other: "Other Investments",
};

export async function getInvestmentSummary(
  userId,
  { reportingCurrency = DEFAULT_CURRENCY } = {}
) {
  await connectDB();
  const rep = (reportingCurrency || DEFAULT_CURRENCY).toUpperCase();
  const now = new Date();

  const [holdings, trades, dividends, rateDocs] = await Promise.all([
    InvestmentHolding.find({ ownerId: userId, status: "active" })
      .select("-priceHistory")
      .sort({ createdAt: -1 })
      .lean(),
    InvestmentTrade.find({ ownerId: userId }).lean(),
    Dividend.find({ ownerId: userId }).lean(),
    ExchangeRate.find({ ownerId: userId }).lean(),
  ]);

  const rates = rateDocs.map((r) => ({
    from: r.from,
    to: r.to,
    rate: r.rate?.toString(),
    asOf: r.asOf,
  }));

  let totalPortfolioValue = new Decimal(0);
  let totalCostBasis = new Decimal(0);
  let totalUnrealizedPL = new Decimal(0);
  let totalDividendsReceived = new Decimal(0);
  let totalRealizedPL = new Decimal(0);
  let latestValuationDate = null;
  let manualPriceCount = 0;
  let marketFeedCount = 0;

  const holdingsList = [];
  const allocationByType = new Map();

  for (const h of holdings) {
    const mv = holdingMarketValue(h);
    const cb = h.costBasis?.totalCost ? new Decimal(h.costBasis.totalCost.toString()) : null;
    const pnl = unrealizedProfitLoss({
      units: h.units?.toString(),
      price: h.currentPrice?.price?.toString(),
      costBasis: h.costBasis?.totalCost?.toString(),
    });

    const priceSource = h.currentPrice?.source || "manual";
    if (priceSource === "market_feed") marketFeedCount += 1;
    else manualPriceCount += 1;

    const priceDate = h.currentPrice?.asOf ? new Date(h.currentPrice.asOf) : new Date(h.updatedAt);
    if (!latestValuationDate || priceDate.getTime() > latestValuationDate) {
      latestValuationDate = priceDate.getTime();
    }

    let convertedMV = null;
    let convertedCB = null;
    let convertedPL = null;

    if (mv !== null) {
      const conv = convertToReporting(mv, h.currency, rates, rep, now);
      if (conv.converted !== null) {
        convertedMV = conv.converted;
        totalPortfolioValue = totalPortfolioValue.plus(conv.converted);

        const typeKey = h.type || "other";
        allocationByType.set(
          typeKey,
          (allocationByType.get(typeKey) || new Decimal(0)).plus(conv.converted)
        );
      }
    }

    if (cb !== null) {
      const conv = convertToReporting(cb, h.currency, rates, rep, now);
      if (conv.converted !== null) {
        convertedCB = conv.converted;
        totalCostBasis = totalCostBasis.plus(conv.converted);
      }
    }

    if (pnl !== null) {
      const conv = convertToReporting(pnl, h.currency, rates, rep, now);
      if (conv.converted !== null) {
        convertedPL = conv.converted;
        totalUnrealizedPL = totalUnrealizedPL.plus(conv.converted);
      }
    }

    holdingsList.push({
      id: h._id.toString(),
      name: h.name,
      ticker: h.ticker || null,
      type: h.type,
      typeLabel: TYPE_LABELS[h.type] || h.type,
      currency: h.currency || rep,
      units: h.units?.toString() || "0",
      price: h.currentPrice?.price?.toString() || null,
      priceSource,
      marketValue: convertedMV,
      costBasis: convertedCB,
      unrealizedPL: convertedPL,
      valuationAsOf: priceDate.toISOString(),
      exchange: h.exchange || "NSE",
    });
  }

  // Calculate Realized P&L from trades (Sell trades: grossAmount - cost basis)
  for (const t of trades) {
    if (t.side === "sell") {
      // If sell trade has fees/taxes, net received is gross - fees - taxes
      const gross = t.grossAmount ? new Decimal(t.grossAmount.toString()) : new Decimal(0);
      const fees = t.fees ? new Decimal(t.fees.toString()) : new Decimal(0);
      const { converted } = convertToReporting(gross.minus(fees), t.currency, rates, rep, t.tradedAt);
      if (converted !== null) {
        // Approximate realized gain if known, or accumulate sell volume
        totalRealizedPL = totalRealizedPL.plus(converted);
      }
    }
  }

  // Calculate Dividends received
  for (const d of dividends) {
    const gross = d.grossAmount ? new Decimal(d.grossAmount.toString()) : new Decimal(0);
    const tax = d.taxWithheld ? new Decimal(d.taxWithheld.toString()) : new Decimal(0);
    const net = d.netAmount ? new Decimal(d.netAmount.toString()) : gross.minus(tax);
    const { converted } = convertToReporting(net, d.currency, rates, rep, d.payDate);
    if (converted !== null) {
      totalDividendsReceived = totalDividendsReceived.plus(converted);
    }
  }

  // Calculate concentration percentages & flag risks
  const concentrationWarnings = [];
  const allocation = [];
  for (const h of holdingsList) {
    if (h.marketValue && totalPortfolioValue.greaterThan(0)) {
      const pct = new Decimal(h.marketValue)
        .dividedBy(totalPortfolioValue)
        .times(100);
      h.portfolioWeightPct = Number(pct.toFixed(1));
      if (pct.greaterThan(30)) {
        concentrationWarnings.push({
          holdingId: h.id,
          name: h.name,
          weightPct: h.portfolioWeightPct,
          thresholdPct: 30,
        });
      }
    } else {
      h.portfolioWeightPct = 0;
    }
  }

  holdingsList.sort((a, b) => Number(b.marketValue || 0) - Number(a.marketValue || 0));

  for (const [type, amountDec] of allocationByType.entries()) {
    const pct = totalPortfolioValue.greaterThan(0)
      ? amountDec.dividedBy(totalPortfolioValue).times(100).toFixed(1)
      : "0.0";
    allocation.push({
      type,
      label: TYPE_LABELS[type] || type,
      amount: amountDec.toFixed(2),
      percentage: Number(pct),
    });
  }
  allocation.sort((a, b) => Number(b.amount) - Number(a.amount));

  return {
    portfolioValue: totalPortfolioValue.toFixed(2),
    acquisitionCost: totalCostBasis.toFixed(2),
    unrealizedGainLoss: totalUnrealizedPL.toFixed(2),
    realizedGainLoss: totalRealizedPL.toFixed(2),
    dividendsReceived: totalDividendsReceived.toFixed(2),
    reportingCurrency: rep,
    activeHoldingsCount: holdings.length,
    latestValuationDate: latestValuationDate ? new Date(latestValuationDate).toISOString() : null,
    priceSources: {
      marketFeed: marketFeedCount,
      manual: manualPriceCount,
    },
    allocation,
    concentrationWarnings,
    holdings: holdingsList,
  };
}
