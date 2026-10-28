// tests/commandCentre.test.mjs
// Unit tests for the Financial Command Centre & Early-Warning System engine.

import test from "node:test";
import assert from "node:assert/strict";
import { runMonitoring, isLiquidCashAsset } from "../lib/command-centre/engine.js";
import { SEVERITY_LEVELS, ALERT_CATEGORIES } from "../lib/command-centre/constants.js";

const NOW = new Date("2026-10-28T12:00:00.000Z");

test("liquid cash asset identification", () => {
  assert.equal(isLiquidCashAsset({ category: "cash" }), true);
  assert.equal(isLiquidCashAsset({ category: "bank_account" }), true);
  assert.equal(isLiquidCashAsset({ category: "other", name: "KCB Checking Account" }), true);
  assert.equal(isLiquidCashAsset({ category: "other", subCategory: "High Yield Savings" }), true);
  assert.equal(isLiquidCashAsset({ category: "property", name: "Kilimani Apartment" }), false);
  assert.equal(isLiquidCashAsset({ category: "vehicle", name: "Toyota Prado" }), false);
});

test("cash shortfall alert triggered when 30-day obligations exceed liquid cash", () => {
  const assets = [
    {
      id: "a1",
      name: "Primary Checking",
      category: "bank_account",
      currentValue: { amount: "12000", asOf: NOW },
    },
    {
      id: "a2",
      name: "Residential Plot",
      category: "property",
      currentValue: { amount: "5000000", asOf: NOW },
    },
  ];

  const liabilities = [
    {
      id: "l1",
      name: "KCB Loan Facility",
      currentBalance: { amount: "15000" },
      maturityDate: new Date("2026-11-15T00:00:00.000Z"), // 18 days away
    },
  ];

  const result = runMonitoring({
    assets,
    liabilities,
    now: NOW,
  });

  assert.equal(result.healthOverview.availableCash, "12000.00");
  assert.equal(result.healthOverview.upcomingObligations30d, "15000.00");

  const shortfallAlert = result.alerts.find((a) => a.ruleKey === "cash_shortfall");
  assert.ok(shortfallAlert, "Expected cash_shortfall alert to be created");
  assert.equal(shortfallAlert.severity, SEVERITY_LEVELS.CRITICAL);
  assert.equal(shortfallAlert.category, ALERT_CATEGORIES.CASHFLOW);
  assert.equal(shortfallAlert.metrics.availableCash, "12000.00");
  assert.equal(shortfallAlert.metrics.upcomingObligations, "15000.00");
  assert.equal(shortfallAlert.metrics.potentialShortfall, "3000.00");
  assert.equal(shortfallAlert.estimatedImpact, 3000);
});

test("no cash shortfall alert when liquid cash covers obligations", () => {
  const assets = [
    {
      id: "a1",
      name: "Checking",
      category: "bank_account",
      currentValue: { amount: "25000", asOf: NOW },
    },
  ];

  const liabilities = [
    {
      id: "l1",
      name: "Loan",
      currentBalance: { amount: "10000" },
      maturityDate: new Date("2026-11-10T00:00:00.000Z"),
    },
  ];

  const result = runMonitoring({ assets, liabilities, now: NOW });
  const shortfallAlert = result.alerts.find((a) => a.ruleKey === "cash_shortfall");
  assert.equal(shortfallAlert, undefined, "Cash shortfall alert should not trigger when cash >= obligations");
});

test("overdue invoice receivable creates high priority alert", () => {
  const invoices = [
    {
      id: "inv-101",
      numbering: { fullNumber: "INV-2026-001" },
      recipient: { name: "Acme Corp" },
      totals: { balanceDue: 45000, total: 45000 },
      paymentTerms: { dueDate: "2026-10-10T00:00:00.000Z" }, // 18 days overdue
      direction: "outward",
    },
  ];

  const result = runMonitoring({ invoices, now: NOW });
  assert.equal(result.healthOverview.overdueReceivables, "45000.00");

  const alert = result.alerts.find((a) => a.ruleKey === "invoice_overdue");
  assert.ok(alert, "Expected invoice_overdue alert");
  assert.equal(alert.severity, SEVERITY_LEVELS.HIGH);
  assert.ok(alert.metrics.daysPastDue >= 18, "Expected daysPastDue >= 18");
  assert.equal(alert.estimatedImpact, 45000);
});

test("portfolio concentration alert triggers when single position exceeds 30%", () => {
  const investments = [
    {
      id: "inv1",
      name: "Safaricom Plc",
      units: "10000",
      currentPrice: { price: "25.00", asOf: NOW }, // 250,000
    },
    {
      id: "inv2",
      name: "KCB Group",
      units: "1000",
      currentPrice: { price: "40.00", asOf: NOW }, // 40,000
    },
  ];
  // Total portfolio: 290,000. Safaricom = 250k / 290k = 86.2% (> 30%)

  const result = runMonitoring({ investments, now: NOW });
  const alert = result.alerts.find((a) => a.ruleKey === "portfolio_concentration");
  assert.ok(alert, "Expected concentration alert");
  assert.equal(alert.affectedRecords[0].title, "Safaricom Plc");
  assert.equal(alert.metrics.concentrationPct, 86);
  assert.equal(result.healthOverview.portfolioExposure.name, "Safaricom Plc");
});

test("missing investment price is reported without inventing a zero price", () => {
  const investments = [
    {
      id: "inv-noprice",
      name: "Unlisted Tech Bond",
      units: "50",
      currentPrice: null, // missing price
    },
  ];

  const result = runMonitoring({ investments, now: NOW });
  const alert = result.alerts.find((a) => a.ruleKey === "missing_investment_price");
  assert.ok(alert, "Expected missing_investment_price alert");
  assert.equal(alert.severity, SEVERITY_LEVELS.HIGH);
});

test("stale asset valuation escalates with age", () => {
  const assets = [
    {
      id: "ast-stale",
      name: "Industrial Land",
      category: "property",
      currentValue: {
        amount: "15000000",
        asOf: new Date("2026-03-01T00:00:00.000Z"), // ~241 days ago (> 180 days)
      },
    },
  ];

  const result = runMonitoring({ assets, now: NOW });
  const alert = result.alerts.find((a) => a.ruleKey === "stale_asset_valuation");
  assert.ok(alert, "Expected stale_asset_valuation alert");
  assert.equal(alert.severity, SEVERITY_LEVELS.HIGH, "Valuation older than 180 days should escalate to high");
});

test("duplicate documents detected by hash", () => {
  const documents = [
    { id: "d1", filename: "bank_stmt_jan.pdf", fileHash: "hash-xyz-12345" },
    { id: "d2", filename: "bank_stmt_jan_copy.pdf", fileHash: "hash-xyz-12345" },
  ];

  const result = runMonitoring({ documents, now: NOW });
  const alert = result.alerts.find((a) => a.ruleKey === "duplicate_document");
  assert.ok(alert, "Expected duplicate_document alert");
  assert.equal(alert.affectedRecords.length, 2);
});

test("duplicate transactions detected by amount, date and direction", () => {
  const transactions = [
    {
      id: "t1",
      description: "Monthly Software License",
      amount: "14500",
      direction: "outflow",
      date: new Date("2026-10-25T10:00:00.000Z"),
    },
    {
      id: "t2",
      description: "Monthly Software License (duplicate entry)",
      amount: "14500",
      direction: "outflow",
      date: new Date("2026-10-25T10:00:00.000Z"),
    },
  ];

  const result = runMonitoring({ transactions, now: NOW });
  const alert = result.alerts.find((a) => a.ruleKey === "duplicate_transaction");
  assert.ok(alert, "Expected duplicate_transaction alert");
  assert.equal(alert.severity, SEVERITY_LEVELS.HIGH);
});

test("priority queue correctly orders tasks by severity and urgency", () => {
  const assets = [
    {
      id: "a1",
      name: "Cash Account",
      category: "cash",
      currentValue: { amount: "5000", asOf: NOW },
    },
  ];
  const liabilities = [
    {
      id: "l1",
      name: "Urgent Loan",
      currentBalance: { amount: "20000" },
      maturityDate: new Date("2026-11-05T00:00:00.000Z"),
    },
  ];
  const documents = [
    {
      id: "doc1",
      filename: "contract.pdf",
      processingStatus: "awaiting_review",
    },
  ];

  const result = runMonitoring({ assets, liabilities, documents, now: NOW });
  assert.ok(result.priorityQueue.length >= 2);
  // First item must be critical severity (cash shortfall or maturity)
  assert.equal(result.priorityQueue[0].priority, SEVERITY_LEVELS.CRITICAL);
});
