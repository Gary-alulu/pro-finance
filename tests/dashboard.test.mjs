// tests/dashboard.test.mjs
// Comprehensive test suite for Functional Specification 01: Financial Dashboard & Overview.
// Run with: npm test

import test from "node:test";
import assert from "node:assert/strict";
import {
  recordedNetWorth,
  holdingMarketValue,
  unrealizedProfitLoss,
  classifyTransaction,
  cashflowSummary,
  convertToReporting,
  calculateSavingsRate,
} from "../lib/finance/calculations.js";
import { percentageChange, formatCurrency } from "../lib/finance/currency.js";

const DATED_RATES = [
  { from: "USD", to: "KES", rate: "129.50", asOf: "2026-06-01T00:00:00Z" },
  { from: "EUR", to: "KES", rate: "141.20", asOf: "2026-06-01T00:00:00Z" },
];

// ── 1. Net worth and attributable ownership ─────────────────────────────────

test("net worth correctly equals eligible assets minus eligible liabilities", () => {
  const result = recordedNetWorth({
    assets: [
      { id: "a1", name: "Land", amount: "5000000.00", currency: "KES", category: "property" },
      { id: "a2", name: "Savings", amount: "1000000.00", currency: "KES", category: "bank_account" },
    ],
    liabilities: [
      { id: "l1", name: "Mortgage", amount: "2500000.00", currency: "KES", category: "mortgage" },
    ],
    holdings: [
      { id: "h1", name: "Safaricom", units: "10000", price: "18.50", currency: "KES" },
    ],
  });

  // Assets: 6,000,000 + Holdings: 185,000 = 6,185,000
  // Liabilities: 2,500,000
  // Net Worth: 3,685,000
  assert.equal(result.totalAssets, "6185000.00");
  assert.equal(result.totalLiabilities, "2500000.00");
  assert.equal(result.netWorth, "3685000.00");
  assert.equal(result.isPartial, false);
});

test("jointly owned assets recognize owner's attributable share only", () => {
  // Spec example: 50% of KSh 4,000,000 property should recognize KSh 2,000,000
  const result = recordedNetWorth({
    assets: [
      {
        id: "a1",
        name: "Joint Commercial Property",
        amount: "4000000.00",
        ownershipPercentage: 50,
        currency: "KES",
        category: "property",
      },
    ],
    liabilities: [],
    holdings: [],
  });

  assert.equal(result.totalAssets, "2000000.00");
  assert.equal(result.netWorth, "2000000.00");

  // Trace should clearly indicate ownership percentage and attributable amount
  const traceItem = result.trace.assets[0];
  assert.equal(traceItem.ownershipPercentage, 50);
  assert.equal(traceItem.originalAmount, "4000000.00");
  assert.equal(traceItem.attributableAmount, "2000000.00");
  assert.equal(traceItem.convertedAmount, "2000000.00");
});

test("unknown valuations are excluded and never silently assumed to be zero", () => {
  const result = recordedNetWorth({
    assets: [
      { id: "a1", name: "Classic Car", amount: null, currency: "KES", category: "vehicle" },
      { id: "a2", name: "Bank Balance", amount: "50000.00", currency: "KES", category: "cash" },
    ],
    liabilities: [],
    holdings: [],
  });

  assert.equal(result.totalAssets, "50000.00");
  assert.equal(result.missing.assets, 1);
  assert.equal(result.isPartial, true);

  const excluded = result.trace.assets.find((a) => !a.isIncluded);
  assert.ok(excluded);
  assert.equal(excluded.reason, "missing_valuation");
});

// ── 2. Cash flow classification & Transfer isolation ────────────────────────

test("transfers between accounts are NEVER counted as income or expenses", () => {
  const transactions = [
    { direction: "inflow", category: "income", amount: "100000.00" },
    { direction: "outflow", category: "expense", amount: "40000.00" },
    { direction: "transfer", category: "transfer", amount: "50000.00" },
    { direction: "outflow", category: "transfer", amount: "25000.00" },
  ];

  const summary = cashflowSummary(transactions);

  assert.equal(summary.income, "100000.00");
  assert.equal(summary.expenses, "40000.00");
  assert.equal(summary.net, "60000.00");
  assert.equal(summary.transfers, "75000.00");
  assert.equal(summary.transferCount, 2);
});

test("investment purchases and loan repayments are capital movements, not consumption", () => {
  assert.equal(classifyTransaction({ direction: "outflow", category: "investment_purchase" }), "transfer");
  assert.equal(classifyTransaction({ direction: "outflow", category: "loan_repayment" }), "transfer");
  assert.equal(classifyTransaction({ direction: "inflow", category: "dividend" }), "income");
  assert.equal(classifyTransaction({ direction: "outflow", category: "interest" }), "expense");
});

// ── 3. Multi-currency and Exchange Rate handling ────────────────────────────

test("foreign currency amounts require dated exchange rates and are never assumed 1:1", () => {
  const converted = convertToReporting("1000.00", "USD", DATED_RATES, "KES", "2026-07-01");
  assert.equal(converted.converted, "129500.00");
  assert.equal(converted.rate, "129.50");

  const missingRate = convertToReporting("1000.00", "JPY", DATED_RATES, "KES", "2026-07-01");
  assert.equal(missingRate.converted, null);
  assert.equal(missingRate.reason, "missing_rate");
});

// ── 4. Percentage Changes with edge baselines ────────────────────────────────

test("percentage change handles zero and negative baselines gracefully", () => {
  // Zero baseline must return null, never Infinity or NaN
  assert.equal(percentageChange("0.00", "15000.00"), null);

  // Positive growth
  assert.equal(percentageChange("100.00", "120.00"), "20.00");

  // Negative previous baseline (e.g. from -100 to -50 is +50% recovery)
  assert.equal(percentageChange("-100.00", "-50.00"), "50.00");
});

// ── 5. Savings Rate calculation ──────────────────────────────────────────────

test("savings rate calculates net cash flow over eligible income correctly", () => {
  // Income 100k, Net cash flow 30k -> 30% savings rate
  const rate = calculateSavingsRate({
    income: "100000.00",
    netCashFlow: "30000.00",
  });
  assert.equal(rate, "30.00");

  // Zero or negative income returns null
  assert.equal(calculateSavingsRate({ income: "0.00", netCashFlow: "5000.00" }), null);
  assert.equal(calculateSavingsRate({ income: "-1000.00", netCashFlow: "5000.00" }), null);
});

// ── 6. Investment calculations ───────────────────────────────────────────────

test("investment market value and unrealized profit/loss calculation", () => {
  const mv = holdingMarketValue({ units: "500", price: "240.00" });
  assert.equal(mv, "120000.00");

  const pnl = unrealizedProfitLoss({
    units: "500",
    price: "240.00",
    costBasis: "100000.00",
  });
  assert.equal(pnl, "20000.00");
});
