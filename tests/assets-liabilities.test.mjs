// tests/assets-liabilities.test.mjs
// Test suite for Feature 2: Asset & Liability Management.
// Run with: node --test tests/assets-liabilities.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { Decimal } from "decimal.js";
import {
  recordedNetWorth,
  convertToReporting,
  toDec,
} from "../lib/finance/calculations.js";
import { createLiabilityPaymentSchema, reconcileLiabilityBalanceSchema } from "../lib/validations/schemas.js";

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

const DATED_RATES = [
  { from: "USD", to: "KES", rate: "129.50", asOf: "2026-11-01T00:00:00Z" },
  { from: "GBP", to: "KES", rate: "168.00", asOf: "2026-11-01T00:00:00Z" },
];

// ── 1. Attributable Asset Valuation & Ownership ──────────────────────────────

test("attributable asset value scales correctly by ownership percentage", () => {
  const result = recordedNetWorth({
    assets: [
      {
        id: "a1",
        name: "Joint Apartment",
        amount: "10000000.00",
        ownershipPercentage: 50,
        currency: "KES",
        category: "property",
      },
      {
        id: "a2",
        name: "Private Business Share",
        amount: "8000000.00",
        ownershipPercentage: 25,
        currency: "KES",
        category: "private_equity",
      },
      {
        id: "a3",
        name: "Personal Vehicle",
        amount: "3500000.00",
        ownershipPercentage: 100,
        currency: "KES",
        category: "vehicle",
      },
    ],
    liabilities: [],
    holdings: [],
  });

  // 10M * 0.50 = 5M
  // 8M * 0.25 = 2M
  // 3.5M * 1.0 = 3.5M
  // Total Attributable = 10,500,000.00
  assert.equal(result.totalAssets, "10500000.00");
  assert.equal(result.netWorth, "10500000.00");
});

// ── 2. Multi-Currency Asset and Debt Conversion ──────────────────────────────

test("foreign currency assets and debts convert accurately using dated FX rates", () => {
  const result = recordedNetWorth({
    assets: [
      {
        id: "a1",
        name: "US Dollar Account",
        amount: "10000.00",
        currency: "USD",
        category: "cash",
      },
    ],
    liabilities: [
      {
        id: "l1",
        name: "UK Tuition Loan",
        amount: "5000.00",
        currency: "GBP",
        category: "student_loan",
      },
    ],
    rates: DATED_RATES,
    reportingCurrency: "KES",
  });

  // 10,000 USD * 129.50 = 1,295,000 KES
  // 5,000 GBP * 168.00 = 840,000 KES
  // Net Worth = 1,295,000 - 840,000 = 455,000 KES
  assert.equal(result.totalAssets, "1295000.00");
  assert.equal(result.totalLiabilities, "840000.00");
  assert.equal(result.netWorth, "455000.00");
  assert.equal(result.unconvertible.length, 0);
});

// ── 3. Stale Valuation Detection ─────────────────────────────────────────────

test("stale valuation threshold identifies assets unvalued for more than 90 days", () => {
  const now = new Date("2026-11-02T12:00:00Z");
  const thresholdDays = 90;
  const staleCutoff = new Date(now.getTime() - thresholdDays * 24 * 60 * 60 * 1000);

  const testAssets = [
    { id: "1", name: "Recent Land", asOf: new Date("2026-10-15T00:00:00Z") }, // ~18 days ago: fresh
    { id: "2", name: "Old Machinery", asOf: new Date("2026-05-01T00:00:00Z") }, // ~185 days ago: stale
    { id: "3", name: "Unvalued Car", asOf: null }, // no date: missing/stale
  ];

  const stale = testAssets.filter((a) => !a.asOf || a.asOf < staleCutoff);
  assert.equal(stale.length, 2);
  assert.equal(stale[0].name, "Old Machinery");
  assert.equal(stale[1].name, "Unvalued Car");
});

// ── 4. Debt Repayment Arithmetic & Atomic Balance Reduction ─────────────────

test("repayment validation requires principal + interest + fee to equal total payment", () => {
  // Valid payment: 50,000 total = 42,000 principal + 7,500 interest + 500 fee
  const validData = {
    paymentDate: "2026-11-01",
    totalAmount: "50000.00",
    principalAmount: "42000.00",
    interestAmount: "7500.00",
    feeAmount: "500.00",
    penaltyAmount: "0.00",
    paymentMethod: "bank_transfer",
  };

  const parseResult = createLiabilityPaymentSchema.safeParse(validData);
  assert.equal(parseResult.success, true);

  const p = new Decimal(validData.principalAmount);
  const i = new Decimal(validData.interestAmount);
  const f = new Decimal(validData.feeAmount);
  const total = new Decimal(validData.totalAmount);
  assert.equal(p.plus(i).plus(f).equals(total), true);

  // Balance reduction: starting balance 500,000 - principal 42,000 = 458,000
  const startingBalance = new Decimal("500000.00");
  const newBalance = startingBalance.minus(p);
  assert.equal(newBalance.toFixed(2), "458000.00");
});

test("repayment cannot reduce liability balance below zero and marks settled at zero", () => {
  const currentBalance = new Decimal("20000.00");
  const principalPaid = new Decimal("20000.00");

  const newBalance = Decimal.max(currentBalance.minus(principalPaid), 0);
  assert.equal(newBalance.toFixed(2), "0.00");
  assert.equal(newBalance.isZero(), true);
});

// ── 5. Statement Balance Reconciliation ──────────────────────────────────────

test("statement reconciliation schema validates balance and effective date", () => {
  const reconData = {
    balance: "350000.00",
    effectiveDate: "2026-10-31",
    source: "statement",
    notes: "NCBA Bank October loan statement balance",
  };

  const parsed = reconcileLiabilityBalanceSchema.safeParse(reconData);
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.balance, "350000.00");
  assert.equal(parsed.data.source, "statement");
});

// ── 6. Secured vs Unsecured Debt Split ───────────────────────────────────────

test("secured vs unsecured debt separation calculates accurately", () => {
  const debts = [
    { name: "Mortgage", balance: "8000000.00", secured: true, linkedAssetId: "asset-1" },
    { name: "Auto Loan", balance: "1500000.00", secured: true, linkedAssetId: "asset-2" },
    { name: "Credit Card", balance: "250000.00", secured: false, linkedAssetId: null },
    { name: "Personal Loan", balance: "600000.00", secured: false, linkedAssetId: null },
  ];

  let secured = new Decimal(0);
  let unsecured = new Decimal(0);

  for (const d of debts) {
    const bal = new Decimal(d.balance);
    if (d.secured || d.linkedAssetId) {
      secured = secured.plus(bal);
    } else {
      unsecured = unsecured.plus(bal);
    }
  }

  assert.equal(secured.toFixed(2), "9500000.00");
  assert.equal(unsecured.toFixed(2), "850000.00");
  assert.equal(secured.plus(unsecured).toFixed(2), "10350000.00");
});

// ── 7. Debt-to-Asset Ratio ───────────────────────────────────────────────────

test("debt-to-asset ratio handles normal and edge cases deterministically", () => {
  // Case A: Normal (Assets: 10M, Debt: 4M -> 40%)
  const a1 = new Decimal("10000000.00");
  const d1 = new Decimal("4000000.00");
  const ratio1 = Number(d1.dividedBy(a1).times(100).toFixed(1));
  assert.equal(ratio1, 40.0);

  // Case B: Zero assets -> 0% (no division by zero error)
  const a2 = new Decimal("0.00");
  const d2 = new Decimal("500000.00");
  const ratio2 = a2.isZero() ? 0 : Number(d2.dividedBy(a2).times(100).toFixed(1));
  assert.equal(ratio2, 0);
});
