// tests/simulator.test.mjs
// Unit tests for the Wealth Simulator deterministic projection engine.

import test from "node:test";
import assert from "node:assert/strict";
import { projectWealth, toDec, DEFAULT_ASSUMPTIONS } from "../lib/simulator/engine.js";

test("toDec safely parses valid decimals and returns null for missing", () => {
  assert.equal(toDec("15000.50").toString(), "15000.5");
  assert.equal(toDec(0).toString(), "0");
  assert.equal(toDec("0.00").toString(), "0");
  assert.equal(toDec(null), null);
  assert.equal(toDec(undefined), null);
  assert.equal(toDec(""), null);
  assert.equal(toDec("invalid-number"), null);
});

test("zero contribution with zero return preserves initial net worth", () => {
  const snapshot = {
    recordedCash: "50000.00",
    recordedInvestments: "100000.00",
    recordedOtherAssets: "0.00",
    recordedLiabilities: "20000.00",
  };

  const assumptions = {
    monthlyInvestment: 0,
    annualContributionIncreasePct: 0,
    assumedAnnualReturnPct: 0,
    inflationPct: 0,
    otherAssetGrowthPct: 0,
    debtInterestPct: 0,
    monthlyDebtPayment: 0,
  };

  const result = projectWealth({ snapshot, assumptions, timeHorizonYears: 5 });

  assert.equal(result.summary.startingNetWorth, "130000.00");
  assert.equal(result.summary.finalNetWorth, "130000.00");
  assert.equal(result.summary.finalRealNetWorth, "130000.00");
  assert.equal(result.summary.netWorthGrowth, "0.00");
  assert.equal(result.summary.totalContributions, "0.00");
  assert.equal(result.summary.cumulativeInvestmentGains, "0.00");
});

test("monthly investment compounding matches standard financial mathematics", () => {
  // If starting balance = 0, monthly contribution = 3000, 5 years (60 months), 8% annual return
  // Monthly rate r = 0.08 / 12
  // Future Value of ordinary annuity with monthly compounding:
  // FV = PMT * [ ( (1 + r)^n - 1 ) / r ]
  const snapshot = {
    recordedCash: "0.00",
    recordedInvestments: "0.00",
    recordedOtherAssets: "0.00",
    recordedLiabilities: "0.00",
  };

  const assumptions = {
    monthlyInvestment: 3000,
    annualContributionIncreasePct: 0,
    assumedAnnualReturnPct: 8,
    inflationPct: 0,
    otherAssetGrowthPct: 0,
    debtInterestPct: 0,
    monthlyDebtPayment: 0,
  };

  const result = projectWealth({ snapshot, assumptions, timeHorizonYears: 5 });

  // Total contributions = 3000 * 60 = 180,000.00
  assert.equal(result.summary.totalContributions, "180000.00");

  const finalInv = Number(result.summary.finalInvestments);
  // FV of 3000 monthly at 8%/yr over 60 mos is ~220,400 to 221,000
  assert.ok(finalInv > 218000 && finalInv < 225000, `Expected ~220k, got ${finalInv}`);

  const gains = Number(result.summary.cumulativeInvestmentGains);
  assert.ok(gains > 38000 && gains < 45000, `Expected ~40k gains, got ${gains}`);
});

test("annual contribution step-up increases contributions after each 12-month period", () => {
  const snapshot = {
    recordedCash: "0.00",
    recordedInvestments: "0.00",
    recordedOtherAssets: "0.00",
    recordedLiabilities: "0.00",
  };

  const assumptions = {
    monthlyInvestment: 1000,
    annualContributionIncreasePct: 10, // Year 1: 1000/mo, Year 2: 1100/mo
    assumedAnnualReturnPct: 0,
    inflationPct: 0,
    otherAssetGrowthPct: 0,
    debtInterestPct: 0,
    monthlyDebtPayment: 0,
  };

  const result = projectWealth({ snapshot, assumptions, timeHorizonYears: 2 });

  // Year 1: 12 * 1000 = 12,000
  // Year 2: 12 * 1100 = 13,200
  // Total = 25,200
  assert.equal(result.summary.totalContributions, "25200.00");
  assert.equal(result.summary.finalInvestments, "25200.00");
});

test("inflation adjustment discounts purchasing power properly over time", () => {
  const snapshot = {
    recordedCash: "100000.00",
    recordedInvestments: "0.00",
    recordedOtherAssets: "0.00",
    recordedLiabilities: "0.00",
  };

  const assumptions = {
    monthlyInvestment: 0,
    annualContributionIncreasePct: 0,
    assumedAnnualReturnPct: 0,
    inflationPct: 10, // 10% annual inflation
    otherAssetGrowthPct: 0,
    debtInterestPct: 0,
    monthlyDebtPayment: 0,
  };

  const result = projectWealth({ snapshot, assumptions, timeHorizonYears: 1 });

  // Nominal Net Worth stays 100,000.00
  assert.equal(result.summary.finalNetWorth, "100000.00");

  // Real purchasing power after 1 year of 10% inflation: 100,000 / 1.10 = ~90,909.09
  const realNW = Number(result.summary.finalRealNetWorth);
  assert.ok(Math.abs(realNW - 90909.09) < 1, `Expected ~90909.09, got ${realNW}`);
});

test("debt amortization reduces liabilities and tracks debt-freedom horizon", () => {
  const snapshot = {
    recordedCash: "0.00",
    recordedInvestments: "0.00",
    recordedOtherAssets: "0.00",
    recordedLiabilities: "10000.00",
  };

  const assumptions = {
    monthlyInvestment: 0,
    annualContributionIncreasePct: 0,
    assumedAnnualReturnPct: 0,
    inflationPct: 0,
    otherAssetGrowthPct: 0,
    debtInterestPct: 0,
    monthlyDebtPayment: 1000, // Pays off in exactly 10 months
  };

  const result = projectWealth({ snapshot, assumptions, timeHorizonYears: 1 });

  assert.equal(result.summary.debtFreeMonth, 10);
  assert.equal(result.summary.debtFreeYear, 0.8);
  assert.equal(result.summary.finalLiabilities, "0.00");
});

test("missing snapshot balances are flagged and not silently assumed to be zero", () => {
  const snapshot = {
    recordedCash: null,
    recordedInvestments: undefined,
    recordedOtherAssets: "50000.00",
    recordedLiabilities: null,
  };

  const result = projectWealth({ snapshot, timeHorizonYears: 3 });

  assert.equal(result.missingFlags.cashMissing, true);
  assert.equal(result.missingFlags.investmentsMissing, true);
  assert.equal(result.missingFlags.liabilitiesMissing, true);
  assert.equal(result.missingFlags.otherAssetsMissing, false);
});
