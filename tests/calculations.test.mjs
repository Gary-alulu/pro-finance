// tests/calculations.test.mjs
// Deterministic calculation tests for Phase 3 exit criteria.
// Run with: npm test   (node --experimental-default-type=module --test tests/)

import test from "node:test";
import assert from "node:assert/strict";
import {
  holdingMarketValue,
  unrealizedProfitLoss,
  applyTradeToPosition,
  classifyTransaction,
  cashflowSummary,
  convertToReporting,
  pickRate,
  recordedNetWorth,
} from "../lib/finance/calculations.js";

// ── Market value ─────────────────────────────────────────────────────────────

test("market value = quantity × recorded price", () => {
  assert.equal(holdingMarketValue({ units: "50000", price: "16.85" }), "842500.00");
});

test("market value is null when price is missing (not zero)", () => {
  assert.equal(holdingMarketValue({ units: "50000", price: null }), null);
  assert.equal(holdingMarketValue({ units: null, price: "16.85" }), null);
});

test("market value of zero units is a genuine 0.00", () => {
  assert.equal(holdingMarketValue({ units: "0", price: "16.85" }), "0.00");
});

// ── Unrealized P&L ───────────────────────────────────────────────────────────

test("unrealized P&L = market value − cost basis", () => {
  assert.equal(
    unrealizedProfitLoss({ units: "50000", price: "16.85", costBasis: "750000.00" }),
    "92500.00"
  );
});

test("unrealized P&L can be negative (loss)", () => {
  assert.equal(
    unrealizedProfitLoss({ units: "100", price: "8.00", costBasis: "1000.00" }),
    "-200.00"
  );
});

test("unrealized P&L is null when cost basis missing", () => {
  assert.equal(unrealizedProfitLoss({ units: "100", price: "8.00", costBasis: null }), null);
});

// ── Trades ───────────────────────────────────────────────────────────────────

test("buy increases units and cost basis by gross + fees", () => {
  const pos = applyTradeToPosition({
    units: "100",
    totalCost: "1000.00",
    side: "buy",
    tradeUnits: "50",
    grossAmount: "900.00",
    fees: "10.00",
  });
  assert.equal(pos.units, "150");
  assert.equal(pos.totalCost, "1910.00");
});

test("sell reduces units and removes proportional cost (average cost)", () => {
  const pos = applyTradeToPosition({
    units: "100",
    totalCost: "1000.00",
    side: "sell",
    tradeUnits: "50",
    grossAmount: "1200.00",
  });
  assert.equal(pos.units, "50");
  assert.equal(pos.totalCost, "500.00");
});

test("sell never drives units or cost below zero", () => {
  const pos = applyTradeToPosition({
    units: "10",
    totalCost: "100.00",
    side: "sell",
    tradeUnits: "25",
    grossAmount: "300.00",
  });
  assert.equal(pos.units, "0");
  assert.equal(pos.totalCost, "0.00");
});

// ── Classification & transfers ───────────────────────────────────────────────

test("transfer direction is never income or expense", () => {
  assert.equal(classifyTransaction({ direction: "transfer", category: "transfer" }), "transfer");
});

test("investment purchase/sale and loan repayment are capital movements, not P&L", () => {
  assert.equal(classifyTransaction({ direction: "outflow", category: "investment_purchase" }), "transfer");
  assert.equal(classifyTransaction({ direction: "inflow", category: "investment_sale" }), "transfer");
  assert.equal(classifyTransaction({ direction: "outflow", category: "loan_repayment" }), "transfer");
  assert.equal(classifyTransaction({ direction: "outflow", category: "asset_purchase" }), "transfer");
});

test("dividends are income and tracked separately from price changes", () => {
  assert.equal(classifyTransaction({ direction: "inflow", category: "dividend" }), "income");
});

test("fees and taxes are expenses", () => {
  assert.equal(classifyTransaction({ direction: "outflow", category: "fee" }), "expense");
  assert.equal(classifyTransaction({ direction: "outflow", category: "tax" }), "expense");
});

test("cashflow summary excludes transfers from income and expenses", () => {
  const s = cashflowSummary([
    { direction: "inflow", category: "income", amount: "100000.00" },
    { direction: "outflow", category: "expense", amount: "40000.00" },
    { direction: "outflow", category: "investment_purchase", amount: "50000.00" },
    { direction: "transfer", category: "transfer", amount: "30000.00" },
    { direction: "inflow", category: "dividend", amount: "5000.00" },
  ]);
  assert.equal(s.income, "105000.00");
  assert.equal(s.expenses, "40000.00");
  assert.equal(s.net, "65000.00");
  assert.equal(s.transfers, "80000.00");
  assert.equal(s.transferCount, 2);
});

// ── Multi-currency ───────────────────────────────────────────────────────────

const RATES = [
  { from: "USD", to: "KES", rate: "129.10", asOf: "2026-01-01T00:00:00Z" },
  { from: "USD", to: "KES", rate: "129.50", asOf: "2026-06-01T00:00:00Z" },
];

test("conversion uses the latest dated rate at or before the date", () => {
  const r = pickRate(RATES, "USD", "KES", "2026-03-15T00:00:00Z");
  assert.equal(r.rate, "129.10");
  const r2 = pickRate(RATES, "USD", "KES", "2026-07-01T00:00:00Z");
  assert.equal(r2.rate, "129.50");
});

test("multi-currency conversion requires an explicit dated rate — never 1:1", () => {
  const ok = convertToReporting("100.00", "USD", RATES, "KES", "2026-07-01T00:00:00Z");
  assert.equal(ok.converted, "12950.00");
  assert.equal(ok.rate, "129.50");

  const missing = convertToReporting("100.00", "TZS", RATES, "KES", "2026-07-01T00:00:00Z");
  assert.equal(missing.converted, null);
  assert.equal(missing.reason, "missing_rate");
});

// ── Recorded net worth ───────────────────────────────────────────────────────

test("recorded net worth = recorded assets − recorded liabilities (+ holdings at market value)", () => {
  const nw = recordedNetWorth({
    assets: [
      { amount: "14500000.00", currency: "KES", category: "property" },
      { amount: "1850000.00", currency: "KES", category: "bank_account" },
    ],
    liabilities: [
      { amount: "8420000.00", currency: "KES", category: "mortgage" },
      { amount: "185000.00", currency: "KES", category: "credit_card" },
    ],
    holdings: [{ units: "50000", price: "16.85", currency: "KES", type: "listed_equity" }],
  });
  // assets 16,350,000 + holdings 842,500 − liabilities 8,605,000 = 8,587,500
  assert.equal(nw.totalAssets, "17192500.00");
  assert.equal(nw.totalLiabilities, "8605000.00");
  assert.equal(nw.netWorth, "8587500.00");
  assert.equal(nw.isPartial, false);
});

test("missing values are counted, not treated as zero", () => {
  const nw = recordedNetWorth({
    assets: [{ amount: null, currency: "KES" }, { amount: "100.00", currency: "KES" }],
    liabilities: [{ amount: null, currency: "KES" }],
    holdings: [{ units: "10", price: null, currency: "KES" }],
  });
  assert.equal(nw.totalAssets, "100.00");
  assert.equal(nw.missing.assets, 1);
  assert.equal(nw.missing.liabilities, 1);
  assert.equal(nw.missing.holdings, 1);
  assert.equal(nw.isPartial, true);
});

test("unconvertible multi-currency records are excluded and flagged, never assumed 1:1", () => {
  const nw = recordedNetWorth({
    assets: [
      { amount: "100.00", currency: "KES" },
      { amount: "100.00", currency: "USD" },
    ],
    liabilities: [],
    holdings: [],
    rates: RATES,
    reportingCurrency: "KES",
    atDate: "2026-07-01T00:00:00Z",
  });
  // 100 KES + (100 USD × 129.50) = 13,050
  assert.equal(nw.totalAssets, "13050.00");
  assert.equal(nw.unconvertible.length, 0);

  const nwNoRate = recordedNetWorth({
    assets: [{ amount: "100.00", currency: "USD" }],
    liabilities: [],
    holdings: [],
    rates: [],
    reportingCurrency: "KES",
  });
  assert.equal(nwNoRate.totalAssets, "0.00");
  assert.equal(nwNoRate.unconvertible.length, 1);
  assert.equal(nwNoRate.isPartial, true);
});

test("investment purchase does not change recorded net worth (no double counting)", () => {
  // Cash asset drops by 500k, holding appears with 500k market value → NW unchanged.
  const before = recordedNetWorth({
    assets: [{ amount: "1000000.00", currency: "KES" }],
    liabilities: [],
    holdings: [],
  });
  const after = recordedNetWorth({
    assets: [{ amount: "500000.00", currency: "KES" }],
    liabilities: [],
    holdings: [{ units: "1000", price: "500.00", currency: "KES" }],
  });
  assert.equal(before.netWorth, after.netWorth);
});
