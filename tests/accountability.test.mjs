// tests/accountability.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { runChecks, suggestReminders, SEVERITY } from "../lib/accountability/engine.js";

const NOW = new Date("2026-10-20T12:00:00Z");

function asset(overrides = {}) {
  return {
    _id: "a1",
    name: "Kikuyu Plot",
    category: "property",
    status: "active",
    currency: "KES",
    currentValue: { amount: "12500000", asOf: "2026-10-01" },
    ...overrides,
  };
}

function liability(overrides = {}) {
  return {
    _id: "l1",
    name: "Mortgage",
    category: "mortgage",
    status: "active",
    currency: "KES",
    currentBalance: { amount: "4200000", asOf: "2026-10-01" },
    ...overrides,
  };
}

function investment(overrides = {}) {
  return {
    _id: "i1",
    name: "Safaricom",
    type: "listed_equity",
    status: "active",
    currency: "KES",
    units: "1000",
    currentPrice: { price: "18.50", asOf: "2026-10-15" },
    ...overrides,
  };
}

function transaction(overrides = {}) {
  return {
    _id: "t1",
    description: "Groceries",
    date: "2026-10-01",
    amount: "4500",
    direction: "outflow",
    category: "expense",
    evidenceStatus: "missing",
    ...overrides,
  };
}

function document(overrides = {}) {
  return {
    _id: "d1",
    filename: "statement.pdf",
    processingStatus: "awaiting_review",
    uploadedAt: "2026-10-10",
    ...overrides,
  };
}

test("missing valuation is an error and is NOT treated as zero", () => {
  const f = runChecks({
    assets: [asset({ currentValue: undefined })],
    now: NOW,
  });
  const hit = f.find((x) => x.type === "missing_valuation");
  assert.ok(hit, "expected missing_valuation finding");
  assert.equal(hit.severity, SEVERITY.ERROR);
  assert.equal(hit.meta.valueState, "missing");
});

test("recorded zero valuation produces no finding (zero is a value)", () => {
  const f = runChecks({
    assets: [asset({ currentValue: { amount: "0", asOf: "2026-10-01" } })],
    now: NOW,
  });
  assert.equal(f.filter((x) => x.type === "missing_valuation").length, 0);
  assert.equal(f.filter((x) => x.type === "outdated_valuation").length, 0);
});

test("stale valuation severity escalates with age", () => {
  const warn = runChecks({
    assets: [asset({ currentValue: { amount: "100", asOf: "2026-06-01" } })], // ~141 days
    now: NOW,
  }).find((x) => x.type === "outdated_valuation");
  assert.equal(warn.severity, SEVERITY.WARNING);

  const err = runChecks({
    assets: [asset({ currentValue: { amount: "100", asOf: "2026-01-01" } })], // ~292 days
    now: NOW,
  }).find((x) => x.type === "outdated_valuation");
  assert.equal(err.severity, SEVERITY.ERROR);
});

test("liability maturity: overdue vs upcoming are distinct", () => {
  const overdue = runChecks({
    liabilities: [liability({ maturityDate: "2026-09-01" })],
    now: NOW,
  }).find((x) => x.type === "liability_maturity_overdue");
  assert.ok(overdue);
  assert.equal(overdue.meta.state, "overdue");
  assert.equal(overdue.severity, SEVERITY.ERROR);

  const upcoming = runChecks({
    liabilities: [liability({ maturityDate: "2026-11-01" })],
    now: NOW,
  }).find((x) => x.type === "liability_maturity_upcoming");
  assert.ok(upcoming);
  assert.equal(upcoming.meta.state, "upcoming");
  assert.equal(upcoming.severity, SEVERITY.INFO);
});

test("holding with units but no price is a missing_price error", () => {
  const f = runChecks({
    investments: [investment({ currentPrice: undefined })],
    now: NOW,
  }).find((x) => x.type === "missing_price");
  assert.ok(f);
  assert.equal(f.severity, SEVERITY.ERROR);
  assert.equal(f.meta.valueState, "missing");
});

test("stale price is a warning after 60 days", () => {
  const f = runChecks({
    investments: [investment({ currentPrice: { price: "18", asOf: "2026-07-01" } })],
    now: NOW,
  }).find((x) => x.type === "stale_investment_price");
  assert.ok(f);
  assert.equal(f.severity, SEVERITY.WARNING);
});

test("transaction evidence states differ (missing vs pending)", () => {
  const missing = runChecks({
    transactions: [transaction({ evidenceStatus: "missing" })],
    now: NOW,
  }).find((x) => x.type === "missing_evidence");
  const pending = runChecks({
    transactions: [transaction({ _id: "t2", evidenceStatus: "pending_review" })],
    now: NOW,
  }).find((x) => x.type === "missing_evidence");
  assert.equal(missing.severity, SEVERITY.WARNING);
  assert.equal(pending.severity, SEVERITY.INFO);
});

test("dangling liability→asset link is a conflict", () => {
  const f = runChecks({
    liabilities: [liability({ linkedAssetId: "ghost" })],
    assets: [],
    now: NOW,
  }).find((x) => x.type === "conflicting_data");
  assert.ok(f);
  assert.equal(f.meta.danglingLink.type, "asset");
});

test("duplicate documents by hash are flagged once per extra copy", () => {
  const f = runChecks({
    documents: [
      document({ _id: "d1", fileHash: "abc" }),
      document({ _id: "d2", fileHash: "abc", processingStatus: "approved" }),
      document({ _id: "d3", fileHash: "abc", processingStatus: "approved" }),
    ],
    now: NOW,
  });
  const dupes = f.filter((x) => x.type === "duplicate_document" && x.severity === SEVERITY.WARNING);
  assert.equal(dupes.length, 2); // d2 and d3 are both duplicates of d1
});

test("findings carry stable keys and actionable hrefs", () => {
  const f = runChecks({
    assets: [asset({ currentValue: undefined })],
    now: NOW,
  });
  const hit = f.find((x) => x.type === "missing_valuation");
  assert.equal(hit.key, "missing_valuation:a1");
  assert.ok(hit.actionHref.includes("focus=a1"));
  assert.ok(hit.reason.length > 0);
});

test("severity ordering: errors before warnings before info", () => {
  const f = runChecks({
    assets: [asset({ currentValue: undefined })],
    transactions: [transaction({ evidenceStatus: "pending_review" })],
    now: NOW,
  });
  const severities = f.map((x) => x.severity);
  const rank = { error: 0, warning: 1, info: 2 };
  for (let i = 1; i < severities.length; i++) {
    assert.ok(rank[severities[i - 1]] <= rank[severities[i]]);
  }
});

test("suggestReminders only covers near-term maturities and stale assets", () => {
  const r = suggestReminders({
    liabilities: [
      liability({ _id: "l1", maturityDate: "2026-11-01" }), // 12 days — included
      liability({ _id: "l2", maturityDate: "2027-06-01" }), // far — excluded
      liability({ _id: "l3", maturityDate: "2026-09-01" }), // overdue — excluded (accountability error)
    ],
    assets: [
      asset({ _id: "a1", currentValue: { amount: "1", asOf: "2026-01-01" } }), // stale — included
      asset({ _id: "a2", currentValue: { amount: "1", asOf: "2026-10-01" } }), // fresh — excluded
    ],
    now: NOW,
  });
  const keys = r.map((x) => x.key).sort();
  assert.deepEqual(keys, ["asset-valuation-review:a1", "liability-maturity:l1"]);
});
