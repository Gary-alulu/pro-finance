// lib/finance/calculations.js
// Deterministic, pure financial calculations.
// Rules enforced here (see Phase 3 spec):
//   1. Recorded net worth = recorded assets − recorded liabilities (+ investment holdings at market value).
//   2. Market value of a listed holding = recorded quantity × applicable recorded price.
//   3. Unrealized P&L = market value − remaining cost basis.
//   4. Transfers are NEVER counted as income or expenses.
//   5. Investment purchases must not double-count: they move value between cash and
//      holdings and are excluded from income/expense totals.
//   6. Dividends are income, tracked separately from share-price changes (unrealized P&L).
//   7. Multi-currency totals require an explicit, dated exchange rate — never assumed 1:1.
// All arithmetic uses Decimal (decimal.js). Never use Number for money.

import { Decimal } from "decimal.js";
import { SUPPORTED_CURRENCIES, DEFAULT_CURRENCY } from "./currency.js";

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

const ZERO = new Decimal(0);

/** Safe Decimal parse — returns null for missing/invalid (distinct from genuine 0). */
export function toDec(value) {
  if (value === null || value === undefined || value === "") return null;
  try {
    const d = new Decimal(value.toString());
    return d.isNaN() ? null : d;
  } catch {
    return null;
  }
}

function fixed2(d) {
  return d.toFixed(2);
}

// ── Holding valuation ────────────────────────────────────────────────────────

/**
 * Market value of a holding = units × price.
 * Returns null when either input is missing — a missing value is NOT zero.
 */
export function holdingMarketValue({ units, price } = {}) {
  const u = toDec(units);
  const p = toDec(price);
  if (u === null || p === null) return null;
  return fixed2(u.times(p));
}

/**
 * Unrealized P&L = market value − remaining cost basis.
 * Returns null when market value or cost basis is missing.
 */
export function unrealizedProfitLoss({ units, price, costBasis } = {}) {
  const mv = holdingMarketValue({ units, price });
  const cb = toDec(costBasis);
  if (mv === null || cb === null) return null;
  return fixed2(new Decimal(mv).minus(cb));
}

/**
 * Remaining cost basis after a sell, using average-cost method.
 * @returns {{ units: string, totalCost: string }}
 */
export function applyTradeToPosition({ units, totalCost, side, tradeUnits, grossAmount, fees = null }) {
  const u = toDec(units) ?? ZERO;
  const c = toDec(totalCost) ?? ZERO;
  const tu = toDec(tradeUnits);
  const g = toDec(grossAmount);
  const f = toDec(fees) ?? ZERO;
  if (tu === null || g === null) {
    throw new Error("Trade units and gross amount are required");
  }

  if (side === "buy") {
    return {
      units: fixed2(u.plus(tu)).replace(/\.00$/, ""),
      totalCost: fixed2(c.plus(g).plus(f)),
    };
  }

  // Sell: reduce units, and reduce cost basis proportionally (average cost).
  const newUnits = u.minus(tu);
  const ratio = u.isZero() ? ZERO : tu.dividedBy(u);
  const newCost = c.times(new Decimal(1).minus(ratio));
  return {
    units: Decimal.max(newUnits, ZERO).toFixed(0),
    totalCost: fixed2(Decimal.max(newCost, ZERO)),
  };
}

// ── Transaction classification ───────────────────────────────────────────────

// Categories that move money between the owner's own buckets without creating
// income or expense. Loan repayment reduces cash and debt (balance-sheet only).
const TRANSFER_CATEGORIES = new Set([
  "transfer",
  "investment_purchase",
  "investment_sale",
  "asset_purchase",
  "asset_sale",
  "loan_repayment",
]);

const INCOME_CATEGORIES = new Set(["income", "dividend", "interest"]);
const EXPENSE_CATEGORIES = new Set(["expense", "fee", "tax"]);

/**
 * Classify a transaction for reporting.
 * @returns {"income"|"expense"|"transfer"|"unknown"}
 */
export function classifyTransaction({ direction, category } = {}) {
  if (direction === "transfer" || category === "transfer") return "transfer";
  if (TRANSFER_CATEGORIES.has(category)) return "transfer";
  if (direction === "inflow") {
    if (INCOME_CATEGORIES.has(category)) return "income";
    return "income"; // an inflow without a known income category is still income
  }
  if (direction === "outflow") {
    if (EXPENSE_CATEGORIES.has(category)) return "expense";
    return "expense";
  }
  return "unknown";
}

/**
 * Income/expense/cashflow summary over a set of transactions.
 * Transfers are counted separately and NEVER enter income or expenses.
 */
export function cashflowSummary(transactions = []) {
  let income = ZERO;
  let expenses = ZERO;
  let transfers = ZERO;
  let transferCount = 0;
  const byCategory = {};

  for (const tx of transactions) {
    const kind = classifyTransaction(tx);
    const amount = toDec(tx.amount);
    if (amount === null) continue;
    const abs = amount.abs();

    if (kind === "transfer") {
      transfers = transfers.plus(abs);
      transferCount += 1;
      continue;
    }
    if (kind === "income") {
      income = income.plus(abs);
    } else if (kind === "expense") {
      expenses = expenses.plus(abs);
    }

    const cat = tx.category || "other";
    byCategory[cat] = fixed2(new Decimal(byCategory[cat] || "0").plus(abs));
  }

  return {
    income: fixed2(income),
    expenses: fixed2(expenses),
    net: fixed2(income.minus(expenses)),
    transfers: fixed2(transfers),
    transferCount,
    byCategory,
  };
}

// ── Multi-currency ───────────────────────────────────────────────────────────

/**
 * Pick the applicable dated exchange rate: the latest rate with asOf <= atDate.
 * @param {Array<{rate:string|number, asOf:Date|string, from:string, to:string}>} rates
 */
export function pickRate(rates = [], from, to, atDate) {
  if (!from || !to) return null;
  if (from === to) {
    return { rate: "1", asOf: atDate ? new Date(atDate).toISOString() : null, synthetic: true };
  }
  const at = atDate ? new Date(atDate).getTime() : Date.now();
  let best = null;
  for (const r of rates || []) {
    if (r.from !== from || r.to !== to) continue;
    const t = new Date(r.asOf).getTime();
    if (t > at) continue;
    if (!best || t > new Date(best.asOf).getTime()) best = r;
  }
  return best;
}

/**
 * Convert an amount into the reporting currency using an explicit dated rate.
 * Returns null (and a reason) when no rate is available — NEVER assumes 1:1.
 */
export function convertToReporting(amount, currency, rates, reportingCurrency = DEFAULT_CURRENCY, atDate = null) {
  const a = toDec(amount);
  if (a === null) return { converted: null, rate: null, reason: "missing_amount" };
  const cur = (currency || reportingCurrency).toUpperCase();
  const rep = (reportingCurrency || DEFAULT_CURRENCY).toUpperCase();

  if (cur === rep) {
    return { converted: fixed2(a), rate: "1", rateAsOf: null, reason: null };
  }

  const rate = pickRate(rates, cur, rep, atDate);
  if (!rate) {
    return { converted: null, rate: null, reason: "missing_rate" };
  }
  return {
    converted: fixed2(a.times(toDec(rate.rate))),
    rate: rate.rate.toString(),
    rateAsOf: rate.asOf ? new Date(rate.asOf).toISOString() : null,
    reason: null,
  };
}

// ── Recorded net worth ───────────────────────────────────────────────────────

/**
 * Recorded net worth from persisted records.
 *
 * @param {object} input
 * @param {Array<{amount?:string|null, currency?:string}>} input.assets      - active assets with currentValue.amount
 * @param {Array<{amount?:string|null, currency?:string}>} input.liabilities - active liabilities with currentBalance.amount
 * @param {Array<{units?:string|null, price?:string|null, currency?:string}>} input.holdings - active holdings
 * @param {Array} [input.rates] - exchange rate records for multi-currency conversion
 * @param {string} [input.reportingCurrency]
 * @param {string|Date} [input.atDate] - date for selecting dated rates (defaults to now)
 * @returns {{
 *   netWorth:string, totalAssets:string, totalLiabilities:string,
 *   assetsTotal:string, holdingsTotal:string,
 *   missing:{assets:number,liabilities:number,holdings:number},
 *   unconvertible:Array<{entity:string,index:number,currency:string}>,
 *   breakdown:{byAssetCategory:Array, byLiabilityCategory:Array},
 *   reportingCurrency:string, asOf:string
 * }}
 */
export function recordedNetWorth({
  assets = [],
  liabilities = [],
  holdings = [],
  rates = [],
  reportingCurrency = DEFAULT_CURRENCY,
  atDate = null,
} = {}) {
  const rep = (reportingCurrency || DEFAULT_CURRENCY).toUpperCase();
  const asOf = atDate ? new Date(atDate) : new Date();

  let assetsTotal = ZERO;
  let holdingsTotal = ZERO;
  let liabilitiesTotal = ZERO;
  let missingAssets = 0;
  let missingLiabilities = 0;
  let missingHoldings = 0;
  const unconvertible = [];
  const byAssetCategory = {};
  const byLiabilityCategory = {};

  assets.forEach((a, i) => {
    const d = toDec(a.amount);
    if (d === null) {
      missingAssets += 1;
      return;
    }
    const { converted, reason } = convertToReporting(d, a.currency, rates, rep, asOf);
    if (converted === null) {
      unconvertible.push({ entity: "asset", index: i, currency: a.currency, reason });
      return;
    }
    assetsTotal = assetsTotal.plus(converted);
    const cat = a.category || "other";
    byAssetCategory[cat] = fixed2(new Decimal(byAssetCategory[cat] || "0").plus(converted));
  });

  holdings.forEach((h, i) => {
    const mv = holdingMarketValue(h);
    if (mv === null) {
      missingHoldings += 1;
      return;
    }
    const { converted, reason } = convertToReporting(mv, h.currency, rates, rep, asOf);
    if (converted === null) {
      unconvertible.push({ entity: "investment", index: i, currency: h.currency, reason });
      return;
    }
    holdingsTotal = holdingsTotal.plus(converted);
    const cat = h.type || "investment";
    byAssetCategory[cat] = fixed2(new Decimal(byAssetCategory[cat] || "0").plus(converted));
  });

  liabilities.forEach((l, i) => {
    const d = toDec(l.amount);
    if (d === null) {
      missingLiabilities += 1;
      return;
    }
    const { converted, reason } = convertToReporting(d, l.currency, rates, rep, asOf);
    if (converted === null) {
      unconvertible.push({ entity: "liability", index: i, currency: l.currency, reason });
      return;
    }
    liabilitiesTotal = liabilitiesTotal.plus(converted);
    const cat = l.category || "other";
    byLiabilityCategory[cat] = fixed2(new Decimal(byLiabilityCategory[cat] || "0").plus(converted));
  });

  const totalAssets = assetsTotal.plus(holdingsTotal);

  return {
    netWorth: fixed2(totalAssets.minus(liabilitiesTotal)),
    totalAssets: fixed2(totalAssets),
    totalLiabilities: fixed2(liabilitiesTotal),
    assetsTotal: fixed2(assetsTotal),
    holdingsTotal: fixed2(holdingsTotal),
    missing: {
      assets: missingAssets,
      liabilities: missingLiabilities,
      holdings: missingHoldings,
    },
    unconvertible,
    breakdown: {
      byAssetCategory: Object.entries(byAssetCategory).map(([category, amount]) => ({ category, amount })),
      byLiabilityCategory: Object.entries(byLiabilityCategory).map(([category, amount]) => ({ category, amount })),
    },
    reportingCurrency: rep,
    asOf: asOf.toISOString(),
    isPartial:
      missingAssets + missingLiabilities + missingHoldings > 0 || unconvertible.length > 0,
  };
}

/** True if a currency code is recognised. */
export function isSupportedCurrency(code) {
  return SUPPORTED_CURRENCIES.some((c) => c.code === code);
}
