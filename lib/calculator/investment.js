// lib/calculator/investment.js
// Investment returns, weighted cost basis, total return, dividend yields, and CAGR.

import { Decimal } from "decimal.js";

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

const ZERO = new Decimal(0);
const HUNDRED = new Decimal(100);

function parse(v, name, def = null) {
  if (v === null || v === undefined || v === "") {
    if (def !== null) return new Decimal(def);
    throw new Error(`${name} is required.`);
  }
  try {
    const d = new Decimal(v.toString());
    if (d.isNaN()) throw new Error();
    return d;
  } catch {
    throw new Error(`${name} must be a valid number.`);
  }
}

function fixed(d, places = 2) {
  return d.toFixed(places);
}

/**
 * Calculate comprehensive investment metrics for a single position or portfolio allocation.
 */
export function calculateInvestment({
  units,
  costBasisTotal = null,
  purchasePrice = null,
  currentPrice = null,
  dividendsReceived = 0,
  realizedGains = 0,
  transactionFees = 0,
  holdingPeriodYears = 1,
}) {
  const u = parse(units, "Units/Quantity");
  if (u.lte(0)) {
    throw new Error("Units/Quantity must be greater than zero.");
  }

  // Cost basis can come from total cost or unit purchase price
  let totalCost;
  let avgPrice;
  if (costBasisTotal !== null && costBasisTotal !== undefined && costBasisTotal !== "") {
    totalCost = parse(costBasisTotal, "Cost basis");
    avgPrice = totalCost.dividedBy(u);
  } else if (purchasePrice !== null && purchasePrice !== undefined && purchasePrice !== "") {
    avgPrice = parse(purchasePrice, "Purchase price");
    totalCost = avgPrice.times(u);
  } else {
    throw new Error("Either total cost basis or purchase price is required.");
  }

  const curPrice = currentPrice !== null && currentPrice !== "" ? parse(currentPrice, "Current price") : null;
  const fees = parse(transactionFees, "Transaction fees", 0);
  const dividends = parse(dividendsReceived, "Dividends received", 0);
  const realized = parse(realizedGains, "Realized gain/loss", 0);
  const years = Math.max(0.083, Number(holdingPeriodYears) || 1); // min 1 month

  // Market value and Unrealized P&L
  let marketValue = null;
  let unrealizedGainLoss = null;
  let unrealizedPercentage = null;

  if (curPrice !== null) {
    marketValue = curPrice.times(u);
    unrealizedGainLoss = marketValue.minus(totalCost);
    unrealizedPercentage = totalCost.isZero()
      ? ZERO
      : unrealizedGainLoss.dividedBy(totalCost).times(HUNDRED);
  }

  // Break-even price = (Total Cost + Fees) / Units
  const breakEvenPrice = totalCost.plus(fees).dividedBy(u);

  // Total Return = Realized P&L + Unrealized P&L + Dividends - Fees
  let totalReturn = null;
  let roi = null;
  let annualizedReturn = null;
  let dividendYield = null;

  if (marketValue !== null) {
    totalReturn = realized.plus(unrealizedGainLoss).plus(dividends).minus(fees);
    roi = totalCost.isZero() ? ZERO : totalReturn.dividedBy(totalCost).times(HUNDRED);

    // CAGR = (Final Value + Dividends / Total Cost)^(1 / years) - 1
    const grossGrowthFactor = marketValue.plus(dividends).dividedBy(totalCost.plus(fees));
    if (grossGrowthFactor.gt(0)) {
      try {
        const cagr = new Decimal(Math.pow(grossGrowthFactor.toNumber(), 1 / years) - 1).times(100);
        annualizedReturn = fixed(cagr);
      } catch {
        annualizedReturn = null;
      }
    }

    // Dividend Yield = (Dividends / Market Value) * 100
    if (!marketValue.isZero()) {
      dividendYield = fixed(dividends.dividedBy(marketValue).times(HUNDRED));
    }
  }

  return {
    units: fixed(u, 4).replace(/\.0000$/, ""),
    averagePurchasePrice: fixed(avgPrice),
    totalCostBasis: fixed(totalCost),
    currentPrice: curPrice !== null ? fixed(curPrice) : null,
    marketValue: marketValue !== null ? fixed(marketValue) : null,
    breakEvenPrice: fixed(breakEvenPrice),
    unrealizedGainLoss: unrealizedGainLoss !== null ? fixed(unrealizedGainLoss) : null,
    unrealizedPercentage: unrealizedPercentage !== null ? fixed(unrealizedPercentage) : null,
    realizedGains: fixed(realized),
    dividendsReceived: fixed(dividends),
    transactionFees: fixed(fees),
    totalReturn: totalReturn !== null ? fixed(totalReturn) : null,
    returnOnInvestment: roi !== null ? fixed(roi) : null,
    annualizedReturnCAGR: annualizedReturn,
    dividendYield,
    holdingPeriodYears: years,
    explanation:
      unrealizedGainLoss !== null
        ? `Position value is ${fixed(marketValue)} with an unrealized ${
            unrealizedGainLoss.gte(0) ? "gain" : "loss"
          } of ${fixed(unrealizedGainLoss)} (${fixed(unrealizedPercentage)}%). Overall ROI is ${fixed(roi)}%.`
        : `Cost basis is ${fixed(totalCost)} at an average price of ${fixed(avgPrice)} per unit.`,
  };
}

/**
 * Weighted Average Cost Basis for multiple lots:
 * Given array of lots: [{ units, price, fees }]
 */
export function calculateWeightedAverageCost(lots = []) {
  if (!Array.isArray(lots) || lots.length === 0) {
    throw new Error("At least one purchase lot is required.");
  }

  let totalUnits = ZERO;
  let totalCost = ZERO;
  let totalFees = ZERO;

  for (const lot of lots) {
    const u = parse(lot.units, "Lot units");
    const p = parse(lot.price, "Lot purchase price");
    const f = parse(lot.fees, "Lot fees", 0);

    totalUnits = totalUnits.plus(u);
    totalCost = totalCost.plus(u.times(p)).plus(f);
    totalFees = totalFees.plus(f);
  }

  if (totalUnits.isZero()) {
    throw new Error("Total purchase units cannot be zero.");
  }

  const weightedAverage = totalCost.dividedBy(totalUnits);

  return {
    lotCount: lots.length,
    totalUnits: fixed(totalUnits, 4).replace(/\.0000$/, ""),
    totalCostBasis: fixed(totalCost),
    totalFees: fixed(totalFees),
    weightedAveragePrice: fixed(weightedAverage),
  };
}

