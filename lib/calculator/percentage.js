// lib/calculator/percentage.js
// Percentage math services for the Financial Calculator & Planning Engine.
// Enforces decimal safety and strictly distinguishes Markup vs. Margin.

import { Decimal } from "decimal.js";

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

const ZERO = new Decimal(0);
const HUNDRED = new Decimal(100);

function parse(v, name = "Value") {
  if (v === null || v === undefined || v === "") {
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
 * 1. What is X% of Y?
 * Formula: (X * Y) / 100
 */
export function calculatePercentOf(percent, baseAmount) {
  const p = parse(percent, "Percentage");
  const b = parse(baseAmount, "Base amount");
  const result = p.times(b).dividedBy(HUNDRED);
  return {
    percentage: fixed(p),
    baseAmount: fixed(b),
    result: fixed(result),
    formula: `(${fixed(p)}% × ${fixed(b)}) / 100`,
    explanation: `${fixed(p)}% of ${fixed(b)} is ${fixed(result)}.`,
  };
}

/**
 * 2. X is what percentage of Y?
 * Formula: (X / Y) * 100
 */
export function calculatePercentIs(part, total) {
  const x = parse(part, "Part value");
  const y = parse(total, "Total value");
  if (y.isZero()) {
    throw new Error("Total value cannot be zero when calculating percentage.");
  }
  const result = x.dividedBy(y).times(HUNDRED);
  return {
    part: fixed(x),
    total: fixed(y),
    percentage: fixed(result),
    formula: `(${fixed(x)} / ${fixed(y)}) × 100`,
    explanation: `${fixed(x)} is ${fixed(result)}% of ${fixed(y)}.`,
  };
}

/**
 * 3. Percentage change (Increase / Decrease)
 * Formula: ((To - From) / |From|) * 100
 */
export function calculatePercentageChange(fromValue, toValue) {
  const from = parse(fromValue, "Original value");
  const to = parse(toValue, "New value");
  if (from.isZero()) {
    throw new Error("Original baseline value cannot be zero for percentage change.");
  }
  const diff = to.minus(from);
  const pct = diff.dividedBy(from.abs()).times(HUNDRED);
  const isIncrease = diff.gte(0);

  return {
    fromValue: fixed(from),
    toValue: fixed(to),
    absoluteDifference: fixed(diff),
    percentageChange: fixed(pct),
    isIncrease,
    formula: `((${fixed(to)} - ${fixed(from)}) / |${fixed(from)}|) × 100`,
    explanation: `An ${isIncrease ? "increase" : "decrease"} of ${fixed(pct.abs())}% (absolute difference: ${fixed(diff)}).`,
  };
}

/**
 * 4. Percentage difference between two non-zero positive numbers
 * Formula: (|A - B| / ((A + B) / 2)) * 100
 */
export function calculatePercentageDifference(valA, valB) {
  const a = parse(valA, "Value A");
  const b = parse(valB, "Value B");
  const avg = a.plus(b).dividedBy(2);
  if (avg.isZero()) {
    throw new Error("Average of values cannot be zero.");
  }
  const diff = a.minus(b).abs();
  const pct = diff.dividedBy(avg.abs()).times(HUNDRED);

  return {
    valueA: fixed(a),
    valueB: fixed(b),
    average: fixed(avg),
    percentageDifference: fixed(pct),
    formula: `(|${fixed(a)} - ${fixed(b)}| / ((${fixed(a)} + ${fixed(b)}) / 2)) × 100`,
    explanation: `The relative percentage difference is ${fixed(pct)}%.`,
  };
}

/**
 * 5. Discount Calculation
 * Original Price - (Original Price * Discount% / 100) = Final Price
 */
export function calculateDiscount(originalPrice, discountPercent) {
  const orig = parse(originalPrice, "Original price");
  const disc = parse(discountPercent, "Discount percentage");

  if (orig.lt(0) || disc.lt(0)) {
    throw new Error("Price and discount percentage cannot be negative.");
  }
  if (disc.gt(100)) {
    throw new Error("Discount percentage cannot exceed 100%.");
  }

  const discountAmount = orig.times(disc).dividedBy(HUNDRED);
  const finalPrice = orig.minus(discountAmount);

  return {
    originalPrice: fixed(orig),
    discountPercent: fixed(disc),
    discountAmount: fixed(discountAmount),
    finalPrice: fixed(finalPrice),
    formula: `${fixed(orig)} - (${fixed(orig)} × ${fixed(disc)}%) = ${fixed(finalPrice)}`,
    explanation: `You save ${fixed(discountAmount)} (${fixed(disc)}% off), paying ${fixed(finalPrice)}.`,
  };
}

/**
 * 6. Markup Calculation
 * Selling Price = Cost * (1 + Markup% / 100)
 * Profit = Selling Price - Cost
 * Margin = Profit / Selling Price
 */
export function calculateMarkup(cost, markupPercent) {
  const c = parse(cost, "Cost");
  const m = parse(markupPercent, "Markup percentage");

  if (c.lt(0) || m.lt(0)) {
    throw new Error("Cost and markup percentage cannot be negative.");
  }

  const profit = c.times(m).dividedBy(HUNDRED);
  const sellingPrice = c.plus(profit);
  const marginPct = sellingPrice.isZero() ? ZERO : profit.dividedBy(sellingPrice).times(HUNDRED);

  return {
    cost: fixed(c),
    markupPercent: fixed(m),
    profit: fixed(profit),
    sellingPrice: fixed(sellingPrice),
    resultingMarginPercent: fixed(marginPct),
    distinction: "Markup is profit divided by COST. Margin is profit divided by REVENUE/SELLING PRICE.",
    formula: `Cost (${fixed(c)}) + Markup (${fixed(profit)}) = Selling Price (${fixed(sellingPrice)})`,
    explanation: `Marking up cost by ${fixed(m)}% yields a selling price of ${fixed(sellingPrice)} (effective profit margin of ${fixed(marginPct)}%).`,
  };
}

/**
 * 7. Profit Margin Calculation
 * Given Revenue (Selling Price) and Cost:
 * Profit = Revenue - Cost
 * Margin% = (Profit / Revenue) * 100
 * Markup% = (Profit / Cost) * 100
 */
export function calculateMargin(revenue, cost) {
  const rev = parse(revenue, "Revenue");
  const c = parse(cost, "Cost");

  if (rev.isZero()) {
    throw new Error("Revenue cannot be zero when calculating profit margin.");
  }

  const profit = rev.minus(c);
  const marginPct = profit.dividedBy(rev).times(HUNDRED);
  const markupPct = c.isZero() ? null : profit.dividedBy(c).times(HUNDRED);

  return {
    revenue: fixed(rev),
    cost: fixed(c),
    profit: fixed(profit),
    marginPercent: fixed(marginPct),
    equivalentMarkupPercent: markupPct !== null ? fixed(markupPct) : "N/A",
    isProfitable: profit.gte(0),
    distinction: "Margin represents the share of revenue that is retained as profit.",
    formula: `((${fixed(rev)} - ${fixed(c)}) / ${fixed(rev)}) × 100 = ${fixed(marginPct)}%`,
    explanation: `Gross profit is ${fixed(profit)}, giving a ${fixed(marginPct)}% profit margin (equivalent to a ${markupPct !== null ? fixed(markupPct) : "0"}% markup on cost).`,
  };
}

/**
 * 8. Ownership Percentage / Attributable Share
 * Attributable Value = Total Asset Valuation * (Ownership% / 100)
 */
export function calculateOwnershipShare(totalValuation, ownershipPercent) {
  const tot = parse(totalValuation, "Total valuation");
  const pct = parse(ownershipPercent, "Ownership percentage");

  if (pct.lt(0) || pct.gt(100)) {
    throw new Error("Ownership percentage must be between 0% and 100%.");
  }

  const attributable = tot.times(pct).dividedBy(HUNDRED);

  return {
    totalValuation: fixed(tot),
    ownershipPercent: fixed(pct),
    attributableShare: fixed(attributable),
    formula: `${fixed(tot)} × (${fixed(pct)} / 100) = ${fixed(attributable)}`,
    explanation: `A ${fixed(pct)}% ownership in an asset valued at ${fixed(tot)} yields an attributable balance sheet value of ${fixed(attributable)}.`,
  };
}

