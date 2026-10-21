// lib/finance/currency.js
// Decimal-safe currency formatting and calculation helpers.
// All monetary arithmetic MUST go through these utilities.
// Never use plain JavaScript number arithmetic for financial values.

import { Decimal } from "decimal.js";

// ── Configure Decimal precision ─────────────────────────────────────────────
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

/**
 * Format a monetary value for display.
 * @param {string|number|Decimal} amount
 * @param {string} currency - ISO 4217 code, e.g. "KES", "USD"
 * @param {string} [locale] - BCP 47 locale tag, defaults to "en-KE"
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currency = "KES", locale = "en-KE") {
  if (amount === null || amount === undefined || amount === "") return "—";
  try {
    const num = new Decimal(amount.toString()).toNumber();
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return "—";
  }
}

/**
 * Format a plain number with thousand separators (no currency symbol).
 * @param {string|number|Decimal} amount
 * @param {number} [decimalPlaces=2]
 * @returns {string}
 */
export function formatNumber(amount, decimalPlaces = 2) {
  if (amount === null || amount === undefined || amount === "") return "—";
  try {
    return new Decimal(amount.toString()).toFixed(decimalPlaces).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  } catch {
    return "—";
  }
}

/**
 * Sum an array of string/number amounts using Decimal arithmetic.
 * @param {Array<string|number|null|undefined>} amounts
 * @returns {Decimal} Total as Decimal instance
 */
export function sumAmounts(amounts) {
  return amounts.reduce((acc, v) => {
    if (v === null || v === undefined || v === "") return acc;
    try {
      return acc.plus(new Decimal(v.toString()));
    } catch {
      return acc;
    }
  }, new Decimal(0));
}

/**
 * Calculate net worth from asset total and liability total.
 * @param {string|number} totalAssets
 * @param {string|number} totalLiabilities
 * @returns {{ netWorth: string, totalAssets: string, totalLiabilities: string }}
 */
export function calculateNetWorth(totalAssets, totalLiabilities) {
  const assets = new Decimal(totalAssets?.toString() || "0");
  const liabilities = new Decimal(totalLiabilities?.toString() || "0");
  return {
    netWorth: assets.minus(liabilities).toFixed(2),
    totalAssets: assets.toFixed(2),
    totalLiabilities: liabilities.toFixed(2),
  };
}

/**
 * Calculate percentage change between two values.
 * @param {string|number} from
 * @param {string|number} to
 * @returns {string|null} Percentage change as fixed-2 string, or null if from is 0
 */
export function percentageChange(from, to) {
  try {
    const f = new Decimal(from.toString());
    const t = new Decimal(to.toString());
    if (f.isZero()) return null;
    return t.minus(f).dividedBy(f.abs()).times(100).toFixed(2);
  } catch {
    return null;
  }
}

/**
 * Convert an amount from one currency to another using a stored rate.
 * @param {string|number} amount
 * @param {string|number} rate - Exchange rate (1 sourceCurrency = rate targetCurrency)
 * @returns {string} Converted amount as fixed-2 string
 */
export function convertCurrency(amount, rate) {
  try {
    return new Decimal(amount.toString()).times(new Decimal(rate.toString())).toFixed(2);
  } catch {
    return null;
  }
}

/**
 * Safe parse: convert a string to Decimal, returning null if invalid.
 * @param {*} value
 * @returns {Decimal|null}
 */
export function safeDecimal(value) {
  if (value === null || value === undefined || value === "") return null;
  try {
    return new Decimal(value.toString());
  } catch {
    return null;
  }
}

/**
 * Return the absolute value of a Decimal-compatible input.
 * @param {string|number} amount
 * @returns {string}
 */
export function absoluteAmount(amount) {
  try {
    return new Decimal(amount.toString()).abs().toFixed(2);
  } catch {
    return "0.00";
  }
}

// ── Currency metadata ────────────────────────────────────────────────────────
export const SUPPORTED_CURRENCIES = [
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh", locale: "en-KE" },
  { code: "USD", name: "US Dollar",        symbol: "$",   locale: "en-US" },
  { code: "EUR", name: "Euro",             symbol: "€",   locale: "de-DE" },
  { code: "GBP", name: "British Pound",    symbol: "£",   locale: "en-GB" },
  { code: "UGX", name: "Ugandan Shilling", symbol: "USh", locale: "en-UG" },
  { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh", locale: "sw-TZ" },
  { code: "ZAR", name: "South African Rand", symbol: "R", locale: "en-ZA" },
];

export const DEFAULT_CURRENCY = "KES";
export const DEFAULT_LOCALE = "en-KE";
