// lib/calculator/currency.js
// Currency conversion service for the Financial Calculator & Planning Engine.
// Supports platform-recorded dated FX rates, custom rate overrides, and audit trails.

import { Decimal } from "decimal.js";
import { convertToReporting, pickRate } from "../finance/calculations.js";
import { DEFAULT_CURRENCY, SUPPORTED_CURRENCIES } from "../finance/currency.js";

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

/**
 * Converts an amount from one currency to another with full rate provenance.
 *
 * @param {object} params
 * @param {string|number} params.amount - Source amount
 * @param {string} params.fromCurrency - Source ISO 4217 code
 * @param {string} params.toCurrency - Destination ISO 4217 code
 * @param {Array} [params.storedRates=[]] - Historical platform exchange rate records
 * @param {string|number} [params.manualRate=null] - User-supplied manual exchange rate override
 * @param {string} [params.manualRateSource="User Input"] - Attribution for manual rate
 * @param {string|Date} [params.asOfDate=null] - Date of conversion
 */
export function calculateCurrencyConversion({
  amount,
  fromCurrency,
  toCurrency = DEFAULT_CURRENCY,
  storedRates = [],
  manualRate = null,
  manualRateSource = "User Input",
  asOfDate = null,
}) {
  const from = (fromCurrency || DEFAULT_CURRENCY).toUpperCase();
  const to = (toCurrency || DEFAULT_CURRENCY).toUpperCase();

  if (amount === null || amount === undefined || amount === "") {
    throw new Error("Conversion amount is required.");
  }

  let amtDec;
  try {
    amtDec = new Decimal(amount.toString());
    if (amtDec.isNaN()) throw new Error();
  } catch {
    throw new Error("Conversion amount must be a valid number.");
  }

  const asOf = asOfDate ? new Date(asOfDate) : new Date();

  // Same currency: 1:1 identity
  if (from === to) {
    return {
      originalAmount: amtDec.toFixed(2),
      fromCurrency: from,
      convertedAmount: amtDec.toFixed(2),
      toCurrency: to,
      appliedRate: "1.0000",
      rateStatus: "identity",
      rateSource: "Identical Currency",
      rateAsOf: asOf.toISOString(),
      formula: `${amtDec.toFixed(2)} ${from} = ${amtDec.toFixed(2)} ${to} (Rate: 1.0000)`,
    };
  }

  // 1. If manual rate is supplied, prioritize it and disclose
  if (manualRate !== null && manualRate !== undefined && manualRate !== "") {
    let mRate;
    try {
      mRate = new Decimal(manualRate.toString());
      if (mRate.lte(0) || mRate.isNaN()) throw new Error();
    } catch {
      throw new Error("Manual exchange rate must be a positive number.");
    }

    const converted = amtDec.times(mRate);
    return {
      originalAmount: amtDec.toFixed(2),
      fromCurrency: from,
      convertedAmount: converted.toFixed(2),
      toCurrency: to,
      appliedRate: mRate.toString(),
      rateStatus: "manual",
      rateSource: manualRateSource || "Manual Override",
      rateAsOf: asOf.toISOString(),
      formula: `${amtDec.toFixed(2)} ${from} × ${mRate.toString()} = ${converted.toFixed(2)} ${to}`,
      disclosure: "Converted using a user-specified manual rate. Does not reflect verified central bank market rates.",
    };
  }

  // 2. Direct rate lookup in stored rates
  const directRate = pickRate(storedRates, from, to, asOf);
  if (directRate) {
    const r = new Decimal(directRate.rate.toString());
    const converted = amtDec.times(r);
    return {
      originalAmount: amtDec.toFixed(2),
      fromCurrency: from,
      convertedAmount: converted.toFixed(2),
      toCurrency: to,
      appliedRate: typeof directRate.rate === "string" ? directRate.rate : r.toString(),
      rateStatus: "verified",
      rateSource: directRate.source || "Platform Dated FX Feed",
      rateAsOf: directRate.asOf ? new Date(directRate.asOf).toISOString() : asOf.toISOString(),
      formula: `${amtDec.toFixed(2)} ${from} × ${r.toString()} = ${converted.toFixed(2)} ${to}`,
    };
  }

  // 3. Inverse rate lookup in stored rates (if rate for to -> from exists)
  const inverseRate = pickRate(storedRates, to, from, asOf);
  if (inverseRate) {
    const inv = new Decimal(inverseRate.rate.toString());
    if (!inv.isZero()) {
      const derived = new Decimal(1).dividedBy(inv);
      const converted = amtDec.times(derived);
      return {
        originalAmount: amtDec.toFixed(2),
        fromCurrency: from,
        convertedAmount: converted.toFixed(2),
        toCurrency: to,
        appliedRate: derived.toFixed(6),
        rateStatus: "derived_inverse",
        rateSource: `Inverse of ${to}/${from} (${inverseRate.source || "Platform FX"})`,
        rateAsOf: inverseRate.asOf ? new Date(inverseRate.asOf).toISOString() : asOf.toISOString(),
        formula: `${amtDec.toFixed(2)} ${from} ÷ ${inv.toString()} = ${converted.toFixed(2)} ${to}`,
      };
    }
  }

  // 4. Rate not found: never silently assume 1:1
  return {
    originalAmount: amtDec.toFixed(2),
    fromCurrency: from,
    convertedAmount: null,
    toCurrency: to,
    appliedRate: null,
    rateStatus: "missing",
    rateSource: null,
    rateAsOf: null,
    error: `No dated exchange rate found for ${from} to ${to} on ${asOf.toISOString().slice(0, 10)}. Please supply a manual rate.`,
  };
}
