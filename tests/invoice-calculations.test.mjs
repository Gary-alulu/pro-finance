import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  calculateInvoiceTotals,
  calculateLineItem,
  deriveInvoiceStatus,
  isInvoiceOverdue,
} from "../lib/invoices/calculations.js";
import {
  clampPadding,
  formatInvoiceNumber,
  previewInvoiceNumber,
} from "../lib/invoices/numbering.js";
import { createEmptyInvoice, duplicateInvoice } from "../lib/invoices/factories.js";
import { defaultInvoiceSettings } from "../lib/invoices/constants.js";

function line(overrides = {}) {
  return {
    id: overrides.id || "line-1",
    description: overrides.description || "Service",
    quantity: "1",
    unitPrice: "100",
    discountType: "none",
    discountValue: "",
    taxRate: "16",
    taxExempt: false,
    ...overrides,
  };
}

describe("line items", () => {
  it("computes gross, discount, tax and total", () => {
    const result = calculateLineItem({
      quantity: "2",
      unitPrice: "100",
      discountType: "percent",
      discountValue: "10",
      taxRate: "16",
    });
    assert.equal(result.gross, "200.00");
    assert.equal(result.discount, "20.00");
    assert.equal(result.net, "180.00");
    assert.equal(result.tax, "28.80");
    assert.equal(result.total, "208.80");
    assert.deepEqual(result.errors, []);
  });

  it("clamps a fixed discount to the line gross", () => {
    const result = calculateLineItem({
      quantity: "1",
      unitPrice: "200",
      discountType: "amount",
      discountValue: "500",
      taxRate: "0",
    });
    assert.equal(result.discount, "200.00");
    assert.equal(result.net, "0.00");
    assert.ok(result.errors.length > 0);
  });

  it("rounds half-up to two decimals", () => {
    const result = calculateLineItem({
      quantity: "1.005",
      unitPrice: "1",
      taxRate: "16",
    });
    assert.equal(result.gross, "1.01");
    assert.equal(result.tax, "0.16");
    assert.equal(result.total, "1.17");
  });
});

describe("invoice totals", () => {
  it("sums multiple lines and tax", () => {
    const totals = calculateInvoiceTotals({
      currency: "USD",
      lineItems: [
        line({ id: "a", quantity: "2", unitPrice: "100" }),
        line({ id: "b", quantity: "1", unitPrice: "50" }),
      ],
    });
    assert.equal(totals.grossSubtotal, "250.00");
    assert.equal(totals.netSubtotal, "250.00");
    assert.equal(totals.taxTotal, "40.00");
    assert.equal(totals.total, "290.00");
    assert.deepEqual(totals.taxBreakdown, [
      { rate: "16", taxable: "250.00", tax: "40.00" },
    ]);
    assert.deepEqual(totals.errors, []);
  });

  it("allocates an invoice discount proportionally across line nets", () => {
    const totals = calculateInvoiceTotals({
      lineItems: [
        line({ id: "a", unitPrice: "100", taxRate: "0" }),
        line({ id: "b", unitPrice: "300", taxRate: "0" }),
      ],
      discount: { enabled: true, type: "amount", value: "40" },
    });
    assert.equal(totals.invoiceDiscount, "40.00");
    assert.equal(totals.discountedSubtotal, "360.00");
    assert.equal(totals.total, "360.00");
    assert.deepEqual(
      totals.lines.map((item) => item.invoiceDiscount),
      ["10.00", "30.00"]
    );
    assert.equal(
      totals.lines.reduce((sum, item) => sum + Number(item.invoiceDiscount), 0),
      40
    );
  });

  it("puts the allocation rounding remainder on the last line", () => {
    const totals = calculateInvoiceTotals({
      lineItems: [
        line({ id: "a", unitPrice: "100", taxRate: "0" }),
        line({ id: "b", unitPrice: "100", taxRate: "0" }),
        line({ id: "c", unitPrice: "100", taxRate: "0" }),
      ],
      discount: { enabled: true, type: "amount", value: "100" },
    });
    assert.equal(totals.invoiceDiscount, "100.00");
    assert.deepEqual(
      totals.lines.map((item) => item.invoiceDiscount),
      ["33.33", "33.33", "33.34"]
    );
    assert.equal(totals.total, "200.00");
  });

  it("taxes the post-discount taxable amount per line", () => {
    const totals = calculateInvoiceTotals({
      lineItems: [line({ unitPrice: "100", taxRate: "16" })],
      discount: { enabled: true, type: "percent", value: "10" },
    });
    assert.equal(totals.invoiceDiscount, "10.00");
    assert.equal(totals.taxableTotal, "90.00");
    assert.equal(totals.taxTotal, "14.40");
    assert.equal(totals.total, "104.40");
  });

  it("treats exempt lines as zero tax", () => {
    const totals = calculateInvoiceTotals({
      lineItems: [
        line({ id: "a", unitPrice: "100", taxExempt: true }),
        line({ id: "b", unitPrice: "100", taxRate: "16" }),
      ],
    });
    assert.equal(totals.taxTotal, "16.00");
    assert.equal(totals.total, "216.00");
    assert.deepEqual(totals.taxBreakdown, [
      { rate: "16", taxable: "100.00", tax: "16.00" },
    ]);
  });

  it("separates outstanding balance from overpayment credit", () => {
    const base = {
      lineItems: [line({ quantity: "2", unitPrice: "100" })],
    };
    const partial = calculateInvoiceTotals({ ...base, amountPaid: "100" });
    assert.equal(partial.total, "232.00");
    assert.equal(partial.outstanding, "132.00");
    assert.equal(partial.credit, "0.00");
    assert.equal(partial.isOverpaid, false);

    const overpaid = calculateInvoiceTotals({ ...base, amountPaid: "300" });
    assert.equal(overpaid.outstanding, "0.00");
    assert.equal(overpaid.credit, "68.00");
    assert.equal(overpaid.isOverpaid, true);
  });

  it("reports invalid quantities and prices without throwing", () => {
    const totals = calculateInvoiceTotals({
      lineItems: [line({ quantity: "abc", unitPrice: "" })],
    });
    assert.equal(totals.total, "0.00");
    assert.ok(totals.errors.length >= 2);
  });

  it("requires an explicit tax rate unless the line is exempt", () => {
    const missing = calculateInvoiceTotals({
      lineItems: [line({ taxRate: "" })],
    });
    assert.ok(
      missing.errors.some((message) => message.toLowerCase().includes("tax rate"))
    );
    assert.equal(missing.taxTotal, "0.00");

    const explicitZero = calculateInvoiceTotals({
      lineItems: [line({ taxRate: "0" })],
    });
    assert.deepEqual(explicitZero.errors, []);
    assert.equal(explicitZero.taxTotal, "0.00");

    const exempt = calculateInvoiceTotals({
      lineItems: [line({ taxRate: "", taxExempt: true })],
    });
    assert.deepEqual(exempt.errors, []);
    assert.equal(exempt.taxTotal, "0.00");
  });
});

describe("status derivation", () => {
  const now = new Date(2026, 5, 15, 12, 0, 0);
  const base = {
    status: "issued",
    issueDate: "2026-05-01",
    dueDate: "2026-08-01",
    lineItems: [line({ unitPrice: "100" })],
    amountPaid: "0.00",
  };

  it("never marks drafts as overdue", () => {
    const draft = { ...base, status: "draft", dueDate: "2026-05-01" };
    assert.equal(isInvoiceOverdue(draft, now), false);
    assert.equal(deriveInvoiceStatus(draft, { now }), "draft");
  });

  it("derives overdue from the due date and outstanding balance", () => {
    const overdue = { ...base, dueDate: "2026-05-01" };
    assert.equal(isInvoiceOverdue(overdue, now), true);
    assert.equal(deriveInvoiceStatus(overdue, { now }), "overdue");
  });

  it("keeps issued when not yet due and unpaid", () => {
    assert.equal(deriveInvoiceStatus(base, { now }), "issued");
  });

  it("derives partially paid", () => {
    assert.equal(
      deriveInvoiceStatus({ ...base, amountPaid: "50.00" }, { now }),
      "partially_paid"
    );
  });

  it("derives paid when the balance reaches zero", () => {
    assert.equal(
      deriveInvoiceStatus({ ...base, amountPaid: "116.00" }, { now }),
      "paid"
    );
  });

  it("does not mark a fully paid past-due invoice as overdue", () => {
    const paid = {
      ...base,
      dueDate: "2026-05-01",
      amountPaid: "116.00",
    };
    assert.equal(deriveInvoiceStatus(paid, { now }), "paid");
  });
});

describe("numbering", () => {
  it("formats the configured preview number", () => {
    assert.equal(
      formatInvoiceNumber(
        { prefix: "INV", separator: "-", includeYear: true, padding: 4 },
        { year: 2026, sequence: 7 }
      ),
      "INV-2026-0007"
    );
  });

  it("supports no year and a custom separator", () => {
    assert.equal(
      formatInvoiceNumber(
        { prefix: "BILL", separator: "/", includeYear: false, padding: 3 },
        { year: 2026, sequence: 12 }
      ),
      "BILL/012"
    );
  });

  it("clamps padding to a safe range", () => {
    assert.equal(clampPadding(0), 1);
    assert.equal(clampPadding(99), 12);
    assert.equal(clampPadding("abc"), 4);
  });

  it("prefers an existing issued number over the preview", () => {
    assert.equal(
      previewInvoiceNumber(
        { invoiceNumber: "INV-2026-0009" },
        { numbering: { nextNumber: 1 } }
      ),
      "INV-2026-0009"
    );
  });
});

describe("factories", () => {
  it("creates a draft with issuer defaults, due date and one line", () => {
    const settings = {
      ...defaultInvoiceSettings(),
      defaultCurrency: "USD",
      defaultDueDays: 30,
      defaultTaxRate: "8",
      issuer: { name: "Acme Studio", email: "billing@acme.test" },
    };
    const draft = createEmptyInvoice(settings, { now: new Date(2026, 0, 10, 9, 0, 0) });
    assert.equal(draft.status, "draft");
    assert.equal(draft.invoiceNumber, "");
    assert.equal(draft.currency, "USD");
    assert.equal(draft.issueDate, "2026-01-10");
    assert.equal(draft.dueDate, "2026-02-09");
    assert.equal(draft.issuer.name, "Acme Studio");
    assert.equal(draft.lineItems.length, 1);
    assert.equal(draft.lineItems[0].taxRate, "8");
  });

  it("duplicates as a fresh unpaid draft without a number", () => {
    const source = {
      id: "old",
      status: "issued",
      invoiceNumber: "INV-2026-0001",
      issueDate: "2026-01-01",
      dueDate: "2026-01-31",
      amountPaid: "100.00",
      lineItems: [line()],
    };
    const copy = duplicateInvoice(source, { now: new Date(2026, 5, 1, 12, 0, 0) });
    assert.notEqual(copy.id, source.id);
    assert.equal(copy.status, "draft");
    assert.equal(copy.invoiceNumber, "");
    assert.equal(copy.amountPaid, "0.00");
    assert.equal(copy.issueDate, "2026-06-01");
    assert.equal(copy.lineItems[0].id, source.lineItems[0].id);
  });
});
