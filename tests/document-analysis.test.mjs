import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeExtraction,
  normalizeAmount,
  normalizeCurrency,
  normalizeDate,
  normalizeDirection,
  normalizeDocumentType,
} from "../lib/ai/documentAnalysis.js";

test("amounts are normalized without inventing or accepting negatives", () => {
  assert.equal(normalizeAmount("KES 12,500.50"), "12500.50");
  assert.equal(normalizeAmount("1 000 000"), "1000000.00");
  assert.equal(normalizeAmount("-10"), null);
  assert.equal(normalizeAmount("-10", { allowNegative: true }), "-10.00");
  assert.equal(normalizeAmount("(1,200.00)"), null);
  assert.equal(normalizeAmount("not a number"), null);
  assert.equal(normalizeAmount(null), null);
});

test("dates and currencies are validated instead of guessed", () => {
  assert.equal(normalizeDate("2026-02-28"), "2026-02-28");
  assert.equal(normalizeDate("2026-02-30"), null);
  assert.equal(normalizeDate("28/02/2026"), null);
  assert.equal(normalizeCurrency("kes"), "KES");
  assert.equal(normalizeCurrency("KSh"), "KES");
  assert.equal(normalizeCurrency("JPY"), null);
});

test("document types accept common aliases but never invent a type", () => {
  assert.equal(normalizeDocumentType("Bank Statement"), "bank_statement");
  assert.equal(normalizeDocumentType("NSE contract note"), "nse_contract_note");
  assert.equal(normalizeDocumentType("dividend"), "dividend_statement");
  assert.equal(normalizeDocumentType("unrecognised paperwork"), "other");
});

test("directions map debit and credit wording to ledger directions", () => {
  assert.equal(normalizeDirection("credit"), "inflow");
  assert.equal(normalizeDirection("deposit"), "inflow");
  assert.equal(normalizeDirection("debit"), "outflow");
  assert.equal(normalizeDirection("withdrawal"), "outflow");
  assert.equal(normalizeDirection("internal transfer"), "unknown");
});

test("line-item totals are calculated deterministically and reconcile", () => {
  const result = analyzeExtraction({
    documentType: "bank_statement",
    proposedEntityType: "transaction",
    currency: "KES",
    date: "2026-03-31",
    totalAmount: "2500.00",
    lineItems: [
      {
        date: "2026-03-01",
        description: "Salary",
        amount: "2000",
        direction: "credit",
        page: 1,
        excerpt: "SALARY CREDIT 2,000.00",
      },
      {
        date: "2026-03-02",
        description: "Rent",
        amount: "500",
        direction: "debit",
        page: 2,
        excerpt: "RENT DEBIT 500.00",
      },
    ],
  });

  assert.equal(result.computed.lineItemsTotal, "2500.00");
  assert.equal(result.computed.reconciles, true);
  assert.equal(result.conflicts.length, 0);
  assert.equal(result.lineItems[0].direction, "inflow");
  assert.equal(result.lineItems[1].direction, "outflow");
});

test("a total that disagrees with the lines is flagged, not silently accepted", () => {
  const result = analyzeExtraction({
    documentType: "bank_statement",
    proposedEntityType: "transaction",
    currency: "KES",
    date: "2026-03-31",
    totalAmount: "1500.00",
    lineItems: [
      { description: "Salary", amount: "2000", direction: "inflow" },
      { description: "Rent", amount: "500", direction: "outflow" },
    ],
  });

  assert.equal(result.computed.reconciles, false);
  assert.ok(result.conflicts.some((item) => item.code === "total_vs_line_items"));
  assert.ok(result.recommendations.some((item) => item.includes("Do not approve")));
});

test("subtotal, tax and fees are reconciled using decimal arithmetic", () => {
  const matching = analyzeExtraction({
    documentType: "invoice",
    proposedEntityType: "transaction",
    currency: "KES",
    date: "2026-03-31",
    subtotal: "1000.00",
    taxAmount: "160.00",
    feesAmount: "40.00",
    totalAmount: "1200.00",
    counterparty: "Supplier Ltd",
  });
  assert.equal(matching.computed.componentsTotal, "1200.00");
  assert.equal(matching.computed.reconciles, true);

  const mismatching = analyzeExtraction({
    documentType: "invoice",
    proposedEntityType: "transaction",
    currency: "KES",
    date: "2026-03-31",
    subtotal: "1000.00",
    taxAmount: "160.00",
    feesAmount: "40.00",
    totalAmount: "1300.00",
    counterparty: "Supplier Ltd",
  });
  assert.equal(mismatching.computed.reconciles, false);
  assert.ok(mismatching.conflicts.some((item) => item.code === "total_vs_components"));
});

test("required fields are reported as missing per document type", () => {
  const receipt = analyzeExtraction({
    documentType: "receipt",
    proposedEntityType: "transaction",
  });
  const missing = new Set(receipt.missingFields.map((item) => item.field));
  assert.ok(missing.has("date"));
  assert.ok(missing.has("currency"));
  assert.ok(missing.has("totalAmount"));
  assert.ok(missing.has("counterparty"));
  assert.equal(
    receipt.missingFields.find((item) => item.field === "totalAmount").importance,
    "critical"
  );

  const statement = analyzeExtraction({
    documentType: "bank_statement",
    proposedEntityType: "transaction",
  });
  assert.ok(statement.missingFields.some((item) => item.field === "lineItems"));
});

test("source evidence keeps page numbers and verbatim excerpts", () => {
  const result = analyzeExtraction({
    documentType: "receipt",
    proposedEntityType: "transaction",
    currency: "KES",
    date: "2026-03-31",
    totalAmount: "1500.00",
    counterparty: "Cafe",
    fieldEvidence: [
      {
        field: "totalAmount",
        page: 2,
        text: "TOTAL KES 1,500.00",
        confidence: 0.94,
      },
    ],
  });

  assert.equal(result.fieldEvidence.length, 1);
  assert.equal(result.fieldEvidence[0].page, 2);
  assert.equal(result.fieldEvidence[0].text, "TOTAL KES 1,500.00");
  assert.equal(result.fieldEvidence[0].label, "Total amount");
});

test("negative line amounts become outflows rather than invalid values", () => {
  const result = analyzeExtraction({
    documentType: "bank_statement",
    proposedEntityType: "transaction",
    lineItems: [{ description: "Card payment", amount: "-500.00", direction: "unknown" }],
  });

  assert.equal(result.lineItems[0].amount, "500.00");
  assert.equal(result.lineItems[0].direction, "outflow");
});

test("AI-reported conflicts are preserved for the reviewer", () => {
  const result = analyzeExtraction({
    documentType: "receipt",
    proposedEntityType: "transaction",
    currency: "KES",
    date: "2026-03-31",
    totalAmount: "1500.00",
    counterparty: "Cafe",
    conflicts: [
      {
        field: "totalAmount",
        message: "Two different totals appear on the document.",
        values: ["1500.00", "1800.00"],
      },
    ],
  });

  assert.equal(result.conflicts.length, 1);
  assert.equal(result.conflicts[0].field, "totalAmount");
  assert.deepEqual(result.conflicts[0].values, ["1500.00", "1800.00"]);
});

test("missing amounts remain null and are never replaced with zero", () => {
  const result = analyzeExtraction({
    documentType: "receipt",
    proposedEntityType: "transaction",
    currency: "KES",
    date: "2026-03-31",
    counterparty: "Cafe",
    totalAmount: null,
  });

  assert.equal(result.totalAmount, null);
  assert.equal(result.amount, null);
  assert.ok(result.missingFields.some((item) => item.field === "totalAmount"));
});
