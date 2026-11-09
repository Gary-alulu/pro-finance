// lib/calculator/invoiceCalc.js
// Invoice calculation adapter connecting to the platform's authoritative invoice math.

import { calculateInvoiceTotals, calculateLineItem } from "../invoices/calculations.js";
import { Decimal } from "decimal.js";

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

/**
 * Calculates complete invoice totals, line item taxes, discounts, and outstanding balance.
 */
export function calculateInvoicePreview({
  lineItems = [],
  discount = { enabled: false, type: "percent", value: "" },
  amountPaid = "0.00",
  currency = "KES",
}) {
  const invoiceData = {
    lineItems: lineItems.map((item, idx) => ({
      id: item.id || `line-${idx}`,
      description: item.description || `Item ${idx + 1}`,
      quantity: item.quantity?.toString() || "1",
      unitPrice: item.unitPrice?.toString() || "0",
      discountType: item.discountType || "none",
      discountValue: item.discountValue?.toString() || "",
      taxRate: item.taxRate != null ? item.taxRate.toString() : "16",
      taxExempt: Boolean(item.taxExempt),
    })),
    discount: {
      enabled: Boolean(discount?.enabled),
      type: discount?.type || "percent",
      value: discount?.value?.toString() || "",
    },
    amountPaid: amountPaid?.toString() || "0.00",
    currency: currency || "KES",
  };

  const totals = calculateInvoiceTotals(invoiceData);

  return {
    currency,
    lineCount: invoiceData.lineItems.length,
    grossSubtotal: totals.grossSubtotal,
    lineDiscountsTotal: totals.lineDiscountsTotal,
    netSubtotal: totals.netSubtotal,
    invoiceDiscountTotal: totals.invoiceDiscountTotal,
    taxableTotal: totals.taxableTotal,
    taxTotal: totals.taxTotal,
    taxBreakdown: totals.taxBreakdown,
    total: totals.total,
    amountPaid: totals.amountPaid,
    outstandingBalance: totals.outstandingBalance,
    creditAmount: totals.creditAmount,
    isFullyPaid: totals.isFullyPaid,
    lines: totals.lines,
    errors: totals.errors,
    disclosure: "Invoice tax rates and totals are calculated using standard Kenyan VAT rules (default 16%) or configured custom rates.",
  };
}

/**
 * Flexible adapter function for calculator endpoints and UI forms.
 */
export function calculateInvoice(params = {}) {
  const lineItems = params.lineItems || (params.lines || []).map((l, idx) => ({
    id: l.id || `line-${idx}`,
    description: l.description,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    taxRate: l.taxRate,
    discountType: l.discountAmount ? "fixed" : "none",
    discountValue: l.discountAmount || "",
    taxExempt: Boolean(l.taxExempt),
  }));

  let discount = params.discount;
  if (!discount && params.invoiceDiscount) {
    if (typeof params.invoiceDiscount === "object") {
      discount = {
        enabled: Boolean(params.invoiceDiscount.value && Number(params.invoiceDiscount.value) > 0),
        type: params.invoiceDiscount.type || "fixed",
        value: params.invoiceDiscount.value || "",
      };
    } else if (params.invoiceDiscount && Number(params.invoiceDiscount) > 0) {
      discount = { enabled: true, type: "fixed", value: params.invoiceDiscount.toString() };
    }
  }

  let amountPaid = params.amountPaid || "0.00";
  if (Array.isArray(params.payments) && params.payments.length > 0) {
    amountPaid = params.payments
      .reduce((acc, p) => acc.plus(new Decimal((p.amount || 0).toString())), new Decimal(0))
      .toFixed(2);
  }

  const result = calculateInvoicePreview({
    lineItems,
    discount,
    amountPaid,
    currency: params.currency || "KES",
  });

  return {
    ...result,
    subtotal: result.grossSubtotal,
    balanceRemaining: result.outstandingBalance,
  };
}
