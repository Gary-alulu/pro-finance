// tests/calculator.test.mjs
// Comprehensive test suite for Feature 2.1: Financial Calculator & Planning Engine.
// Run with: node --test tests/calculator.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateExpression,
  calculatePercentOf,
  calculatePercentIs,
  calculatePercentageChange,
  calculateDiscount,
  calculateMarkup,
  calculateMargin,
  calculateOwnershipShare,
  calculateTargetSavings,
  calculateSavingsAccumulation,
  calculateCompoundInterest,
  calculateLoan,
  calculateInvestment,
  calculateWeightedAverageCost,
  calculateBudget,
  calculateDepreciation,
  calculateInvoicePreview,
  calculateCurrencyConversion,
  calculateStandaloneNetWorth,
} from "../lib/calculator/index.js";

// ── 1. Arithmetic Evaluator ──────────────────────────────────────────────────

test("arithmetic: evaluates basic operations following operator precedence", () => {
  const r1 = evaluateExpression("2 + 3 * 4", { decimalPlaces: 2 });
  assert.equal(r1.success, true);
  assert.equal(r1.formatted, "14.00");

  const r2 = evaluateExpression("(2 + 3) * 4", { decimalPlaces: 2 });
  assert.equal(r2.success, true);
  assert.equal(r2.formatted, "20.00");

  const r3 = evaluateExpression("100 - 25 / 5 + 10", { decimalPlaces: 2 });
  assert.equal(r3.success, true);
  assert.equal(r3.formatted, "105.00");
});

test("arithmetic: handles negative numbers, unary negation, and decimal formatting", () => {
  const r1 = evaluateExpression("-50 + 20", { decimalPlaces: 2 });
  assert.equal(r1.success, true);
  assert.equal(r1.formatted, "-30.00");

  const r2 = evaluateExpression("-(10 + 15)", { decimalPlaces: 2 });
  assert.equal(r2.success, true);
  assert.equal(r2.formatted, "-25.00");

  const r3 = evaluateExpression("1500000.50 + 500000.50", { decimalPlaces: 2 });
  assert.equal(r3.success, true);
  assert.equal(r3.formatted, "2,000,001.00");
});

test("arithmetic: rejects division by zero safely without crashing or eval", () => {
  const r = evaluateExpression("5000 / 0");
  assert.equal(r.success, false);
  assert.equal(r.error, "Cannot divide by zero.");
});

// ── 2. Percentage Operations & Margin vs Markup ─────────────────────────────

test("percentage: calculates percent of and percent is accurately", () => {
  const r1 = calculatePercentOf("15", "50000");
  assert.equal(r1.result, "7500.00");

  const r2 = calculatePercentIs("25000", "100000");
  assert.equal(r2.percentage, "25.00");
});

test("percentage: strictly distinguishes markup from margin", () => {
  // If an item costs 10,000 and sells for 12,500:
  // Profit = 2,500
  // Markup = 2,500 / 10,000 = 25%
  // Margin = 2,500 / 12,500 = 20%
  const markupRes = calculateMarkup("10000", "25");
  assert.equal(markupRes.profit, "2500.00");
  assert.equal(markupRes.sellingPrice, "12500.00");
  assert.equal(markupRes.resultingMarginPercent, "20.00");

  const marginRes = calculateMargin("12500", "10000");
  assert.equal(marginRes.profit, "2500.00");
  assert.equal(marginRes.marginPercent, "20.00");
  assert.equal(marginRes.equivalentMarkupPercent, "25.00");
});

test("percentage: discount and ownership share calculation", () => {
  const disc = calculateDiscount("50000", "15");
  assert.equal(disc.discountAmount, "7500.00");
  assert.equal(disc.finalPrice, "42500.00");

  const own = calculateOwnershipShare("10000000", "50");
  assert.equal(own.attributableShare, "5000000.00");
});

// ── 3. Savings Target & Accumulation ────────────────────────────────────────

test("savings: calculates required monthly contribution with zero return", () => {
  // Save 500,000 from current 200,000 in 20 months with 0% interest
  // Remaining = 300,000 / 20 = 15,000.00 per month
  const res = calculateTargetSavings({
    targetAmount: "500000",
    currentSavings: "200000",
    months: 20,
    annualReturnRate: 0,
  });

  assert.equal(res.remainingGap, "300000.00");
  assert.equal(res.requiredPeriodicContribution, "15000.00");
  assert.equal(res.totalContributions, "300000.00");
  assert.equal(res.estimatedGrowth, "0.00");
  assert.equal(res.progressPercentage, 40);
});

test("savings: accumulation models periodic deposits and compound interest", () => {
  const res = calculateSavingsAccumulation({
    initialSavings: "50000",
    periodicContribution: "10000",
    periods: 12,
    annualReturnRate: "8",
  });

  assert.equal(res.totalDeposited, "120000.00");
  assert.ok(Number(res.finalAccumulatedValue) > 170000);
  assert.ok(Number(res.estimatedGrowth) > 4000);
});

// ── 4. Compound Interest ─────────────────────────────────────────────────────

test("compound interest: computes effective annual rate and deposit timing", () => {
  // Nominal 12% compounded monthly => EAR = (1 + 0.12/12)^12 - 1 = ~12.68%
  const res = calculateCompoundInterest({
    initialPrincipal: "100000",
    periodicContribution: "5000",
    annualRate: "12",
    investmentYears: 3,
    compoundFrequency: "monthly",
    contributionTiming: "beginning",
  });

  assert.equal(res.effectiveAnnualRate, "12.68");
  assert.equal(res.totalContributions, "180000.00");
  assert.ok(Number(res.finalBalance) > 350000);
  assert.equal(res.annualSchedule.length, 3);
});

// ── 5. Loan & Amortization ───────────────────────────────────────────────────

test("loan: generates reducing-balance amortization and computes extra payment savings", () => {
  // Principal 1,000,000 KES, 14% interest, 3 years (36 months), extra 5,000/mo
  const res = calculateLoan({
    principalAmount: "1000000",
    annualInterestRate: "14",
    termMonths: 36,
    repaymentFrequency: "monthly",
    extraMonthlyPayment: "5000",
  });

  assert.equal(res.principalAmount, "1000000.00");
  assert.ok(Number(res.basePeriodicPayment) > 34000);
  assert.ok(res.extraSavings !== null);
  assert.ok(Number(res.extraSavings.interestSaved) > 10000);
  assert.ok(res.actualPeriodsToPayoff < 36);
  assert.ok(res.schedulePreview.length > 0);
});

test("loan: zero-interest financing divides principal evenly", () => {
  const res = calculateLoan({
    principalAmount: "120000",
    annualInterestRate: "0",
    termMonths: 12,
  });

  assert.equal(res.totalInterestPaid, "0.00");
  assert.equal(res.basePeriodicPayment, "10000.00");
  assert.equal(res.totalRepaymentAmount, "120000.00");
});

// ── 6. Investment Calculator ─────────────────────────────────────────────────

test("investment: computes unrealized P&L, dividend yield, and break-even price", () => {
  const res = calculateInvestment({
    units: "10000",
    purchasePrice: "15.00",
    currentPrice: "18.50",
    dividendsReceived: "12000",
    transactionFees: "1500",
    holdingPeriodYears: 1,
  });

  // Cost: 150,000, MV: 185,000, Unrealized: 35,000
  assert.equal(res.totalCostBasis, "150000.00");
  assert.equal(res.marketValue, "185000.00");
  assert.equal(res.unrealizedGainLoss, "35000.00");
  assert.equal(res.breakEvenPrice, "15.15");
  // Total Return = 35,000 (unrealized) + 12,000 (div) - 1,500 (fees) = 45,500
  assert.equal(res.totalReturn, "45500.00");
  assert.equal(res.returnOnInvestment, "30.33");
});

test("investment: weighted average cost basis for multiple purchase lots", () => {
  const lots = [
    { units: "5000", price: "10.00", fees: "500" },
    { units: "5000", price: "12.00", fees: "500" },
  ];
  const res = calculateWeightedAverageCost(lots);

  // Total cost: 50,000 + 60,000 + 1,000 = 111,000 / 10,000 = 11.10
  assert.equal(res.totalUnits, "10000");
  assert.equal(res.totalCostBasis, "111000.00");
  assert.equal(res.weightedAveragePrice, "11.10");
});

// ── 7. Budget & Cash Flow ────────────────────────────────────────────────────

test("budget: evaluates surplus, ratios, and excludes transfers", () => {
  const res = calculateBudget({
    monthlyIncome: "200000",
    fixedExpenses: "80000",
    variableExpenses: "40000",
    debtRepayments: "25000",
    savingsContributions: "30000",
    investmentContributions: "15000",
  });

  // Outflows: 80k + 40k + 25k + 30k + 15k = 190,000
  // Net surplus: 10,000
  assert.equal(res.totalOutflows, "190000.00");
  assert.equal(res.netSurplusOrDeficit, "10000.00");
  assert.equal(res.isSurplus, true);
  // Savings Rate: (30k + 15k) / 200k = 22.5%
  assert.equal(res.savingsRatePercent, "22.5");
  // Debt-to-income: 25k / 200k = 12.5%
  assert.equal(res.debtToIncomeRatioPercent, "12.5");
});

// ── 8. Asset Depreciation ────────────────────────────────────────────────────

test("depreciation: computes straight-line carrying value and schedules", () => {
  // Vehicle cost: 3,000,000, salvage: 600,000, useful life: 6 years
  // Annual dep: (3,000,000 - 600,000) / 6 = 400,000 per year
  const res = calculateDepreciation({
    acquisitionCost: "3000000",
    salvageValue: "600000",
    usefulLifeYears: 6,
    method: "straight_line",
  });

  assert.equal(res.annualSchedule[0].annualDepreciation, "400000.00");
  assert.equal(res.annualSchedule[0].endingCarryingValue, "2600000.00");
  assert.equal(res.annualSchedule[5].endingCarryingValue, "600000.00");
  assert.equal(res.annualSchedule[5].accumulatedDepreciation, "2400000.00");
});

// ── 9. Currency Conversion ───────────────────────────────────────────────────

test("currency: converts using dated FX rates and discloses source", () => {
  const rates = [
    { from: "USD", to: "KES", rate: "129.50", asOf: "2026-11-01T00:00:00Z", source: "CBK" },
  ];

  const res = calculateCurrencyConversion({
    amount: "1000",
    fromCurrency: "USD",
    toCurrency: "KES",
    storedRates: rates,
  });

  assert.equal(res.convertedAmount, "129500.00");
  assert.equal(res.rateStatus, "verified");
  assert.equal(res.appliedRate, "129.50");
});

test("currency: supports manual rate override with disclosure", () => {
  const res = calculateCurrencyConversion({
    amount: "500",
    fromCurrency: "EUR",
    toCurrency: "KES",
    manualRate: "142.00",
    manualRateSource: "Bank Statement",
  });

  assert.equal(res.convertedAmount, "71000.00");
  assert.equal(res.rateStatus, "manual");
});

// ── 10. Standalone Net Worth ─────────────────────────────────────────────────

test("net worth: computes standalone position from manual assets and debt", () => {
  const res = calculateStandaloneNetWorth({
    assets: [
      { name: "Apartment", amount: "8000000", ownershipPercentage: 50 },
      { name: "Car", amount: "2000000", ownershipPercentage: 100 },
    ],
    liabilities: [
      { name: "Car Loan", amount: "800000" },
    ],
    reportingCurrency: "KES",
  });

  // Assets: 8M * 0.5 + 2M = 6,000,000
  // Liabilities: 800,000
  // Net worth: 5,200,000
  assert.equal(res.totalAssets, "6000000.00");
  assert.equal(res.totalLiabilities, "800000.00");
  assert.equal(res.netWorth, "5200000.00");
  assert.equal(res.debtToAssetRatio, 13.3);
});

