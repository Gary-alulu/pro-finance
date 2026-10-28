// lib/invoices/calculations.js
// Pure, deterministic invoice arithmetic shared by the live preview and, in
// Stage 2, by the server-side validator. The server must always recalculate;
// browser totals are never authoritative.
//
// Documented calculation order:
//   1. line gross       = round2(quantity x unitPrice)
//   2. line discount    = round2(percent of gross | fixed amount), clamped to gross
//   3. line net         = gross - line discount
//   4. gross subtotal   = sum of line gross
//   5. line discounts   = sum of line discounts
//   6. net subtotal     = sum of line net
//   7. invoice discount = round2(percent of net subtotal | fixed amount), clamped
//                         to net subtotal, allocated proportionally across lines
//   8. taxable line     = line net - allocated invoice discount
//   9. line tax         = round2(taxable line x taxRate / 100); 0 when exempt
//  10. total            = net subtotal - invoice discount + sum of line taxes
//  11. outstanding      = max(total - amountPaid, 0)
//  12. credit           = max(amountPaid - total, 0)
//
// Rounding: Decimal.js, ROUND_HALF_UP, monetary outputs fixed to 2 decimals.
// Tax rates are entered as percentages (e.g. 16 means 16%).
// A missing quantity or unit price is treated as 0 for preview purposes and is
// reported in `errors`; it is never silently persisted by the future server.

import { Decimal } from "decimal.js";

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

const ZERO = new Decimal(0);
const HUNDRED = new Decimal(100);

function parseDecimal(value) {
  if (value === null || value === undefined || value === "") return null;
  try {
    const d = new Decimal(String(value));
    return d.isFinite() ? d : null;
  } catch {
    return null;
  }
}

function round2(d) {
  return d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

function money(d) {
  return round2(d).toFixed(2);
}

function clampZero(value) {
  return Decimal.max(value, ZERO);
}

function lineDiscount(gross, type, rawValue, errors, index) {
  if (type !== "percent" && type !== "amount") return ZERO;
  const value = parseDecimal(rawValue);
  if (value === null) {
    errors.push(`Line ${index + 1}: enter a discount value or remove the discount.`);
    return ZERO;
  }
  if (value.lt(0)) {
    errors.push(`Line ${index + 1}: a discount cannot be negative.`);
    return ZERO;
  }
  if (type === "percent") {
    if (value.gt(HUNDRED)) {
      errors.push(`Line ${index + 1}: a percentage discount cannot exceed 100%.`);
    }
    return round2(gross.times(Decimal.min(value, HUNDRED)).dividedBy(HUNDRED));
  }
  if (value.gt(gross)) {
    errors.push(`Line ${index + 1}: a fixed discount cannot exceed the line gross.`);
  }
  return round2(Decimal.min(value, gross));
}

/**
 * Calculate one line item in isolation (no invoice-level discount allocation).
 * Useful for editor summaries.
 */
export function calculateLineItem(item = {}) {
  const errors = [];
  const quantity = parseDecimal(item.quantity);
  const unitPrice = parseDecimal(item.unitPrice);
  const qty = quantity === null ? ZERO : clampZero(quantity);
  const price = unitPrice === null ? ZERO : clampZero(unitPrice);
  const gross = round2(qty.times(price));
  const discount = lineDiscount(gross, item.discountType, item.discountValue, errors, 0);
  const net = round2(gross.minus(discount));
  const taxExempt = Boolean(item.taxExempt);
  let rate = ZERO;
  if (!taxExempt) {
    if (item.taxRate === null || item.taxRate === undefined || item.taxRate === "") {
      errors.push("Enter a tax rate, or mark the line tax-exempt.");
    } else {
      const parsedRate = parseDecimal(item.taxRate);
      if (parsedRate === null) {
        errors.push("Enter a valid tax rate.");
      } else if (parsedRate.lt(0)) {
        errors.push("Tax rate cannot be negative.");
      } else {
        rate = parsedRate;
      }
    }
  }
  const tax = taxExempt ? ZERO : round2(net.times(rate).dividedBy(HUNDRED));

  return {
    gross: money(gross),
    discount: money(discount),
    net: money(net),
    tax: money(tax),
    total: money(net.plus(tax)),
    errors,
  };
}

/**
 * @param {object} invoice
 * @param {Array} invoice.lineItems
 * @param {{enabled?:boolean,type?:'percent'|'amount',value?:string|number}} [invoice.discount]
 * @param {string|number} [invoice.amountPaid]
 * @param {string} [invoice.currency]
 */
export function calculateInvoiceTotals(invoice = {}) {
  const currency = invoice.currency || "KES";
  const errors = [];
  const rawLines = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];

  const lines = rawLines.map((item, index) => {
    const quantity = parseDecimal(item.quantity);
    const unitPrice = parseDecimal(item.unitPrice);

    if (quantity === null) {
      errors.push(`Line ${index + 1}: enter a valid quantity.`);
    } else if (quantity.lt(0)) {
      errors.push(`Line ${index + 1}: quantity cannot be negative.`);
    }
    if (unitPrice === null) {
      errors.push(`Line ${index + 1}: enter a valid unit price.`);
    } else if (unitPrice.lt(0)) {
      errors.push(`Line ${index + 1}: unit price cannot be negative.`);
    }

    const qty = quantity === null ? ZERO : clampZero(quantity);
    const price = unitPrice === null ? ZERO : clampZero(unitPrice);
    const gross = round2(qty.times(price));
    const discount = lineDiscount(
      gross,
      item.discountType,
      item.discountValue,
      errors,
      index
    );
    const net = round2(gross.minus(discount));
    const taxExempt = Boolean(item.taxExempt);
    let rate = ZERO;
    if (!taxExempt) {
      if (item.taxRate === null || item.taxRate === undefined || item.taxRate === "") {
        errors.push(`Line ${index + 1}: enter a tax rate, or mark the line tax-exempt.`);
      } else {
        const parsedRate = parseDecimal(item.taxRate);
        if (parsedRate === null) {
          errors.push(`Line ${index + 1}: enter a valid tax rate.`);
        } else if (parsedRate.lt(0)) {
          errors.push(`Line ${index + 1}: tax rate cannot be negative.`);
        } else {
          rate = parsedRate;
        }
      }
    }

    return {
      id: item.id,
      description: item.description || "",
      quantity: item.quantity ?? "",
      unitOfMeasure: item.unitOfMeasure || "",
      unitPrice: item.unitPrice ?? "",
      discountType: item.discountType || "none",
      discountValue: item.discountValue ?? "",
      taxRate: item.taxRate ?? "",
      taxExempt,
      notes: item.notes || "",
      gross,
      discount,
      net,
      invoiceDiscount: ZERO,
      taxable: net,
      tax: ZERO,
      total: net,
      rate,
      valid: quantity !== null && unitPrice !== null,
    };
  });

  const grossSubtotal = lines.reduce((acc, line) => acc.plus(line.gross), ZERO);
  const lineDiscountTotal = lines.reduce((acc, line) => acc.plus(line.discount), ZERO);
  const netSubtotal = lines.reduce((acc, line) => acc.plus(line.net), ZERO);

  // Invoice-level discount.
  let invoiceDiscount = ZERO;
  const discountConfig = invoice.discount || {};
  if (discountConfig.enabled) {
    const value = parseDecimal(discountConfig.value);
    if (value === null) {
      errors.push("Invoice discount: enter a valid value.");
    } else if (value.lt(0)) {
      errors.push("Invoice discount cannot be negative.");
    } else if (discountConfig.type === "percent") {
      if (value.gt(HUNDRED)) {
        errors.push("Invoice discount cannot exceed 100%.");
      }
      invoiceDiscount = round2(
        netSubtotal.times(Decimal.min(value, HUNDRED)).dividedBy(HUNDRED)
      );
    } else {
      if (value.gt(netSubtotal)) {
        errors.push("Invoice discount cannot exceed the net subtotal.");
      }
      invoiceDiscount = round2(Decimal.min(value, netSubtotal));
    }
  }
  invoiceDiscount = clampZero(Decimal.min(invoiceDiscount, netSubtotal));

  // Allocate the invoice discount proportionally to line nets. The last line
  // absorbs the rounding remainder so the allocated total always reconciles.
  if (invoiceDiscount.gt(0) && netSubtotal.gt(0)) {
    const eligible = lines.filter((line) => line.net.gt(0));
    let allocated = ZERO;
    eligible.forEach((line, index) => {
      if (index === eligible.length - 1) {
        line.invoiceDiscount = invoiceDiscount.minus(allocated);
      } else {
        line.invoiceDiscount = round2(
          invoiceDiscount.times(line.net).dividedBy(netSubtotal)
        );
      }
      line.invoiceDiscount = clampZero(
        Decimal.min(line.invoiceDiscount, line.net)
      );
      allocated = allocated.plus(line.invoiceDiscount);
    });

    const residual = invoiceDiscount.minus(allocated);
    if (!residual.isZero() && eligible.length > 0) {
      const last = eligible[eligible.length - 1];
      const room = last.net.minus(last.invoiceDiscount);
      const applied = clampZero(Decimal.min(residual, room));
      last.invoiceDiscount = last.invoiceDiscount.plus(applied);
    }
  }

  // Tax per line and tax breakdown by rate.
  const taxGroups = new Map();
  let taxTotal = ZERO;
  let taxableTotal = ZERO;

  lines.forEach((line) => {
    line.taxable = round2(clampZero(line.net.minus(line.invoiceDiscount)));
    if (!line.taxExempt) taxableTotal = taxableTotal.plus(line.taxable);
    line.tax = line.taxExempt
      ? ZERO
      : round2(line.taxable.times(line.rate).dividedBy(HUNDRED));
    line.total = round2(line.taxable.plus(line.tax));
    taxTotal = taxTotal.plus(line.tax);

    if (line.tax.gt(0)) {
      const key = line.rate.toString();
      const group = taxGroups.get(key) || { rate: key, taxable: ZERO, tax: ZERO };
      group.taxable = group.taxable.plus(line.taxable);
      group.tax = group.tax.plus(line.tax);
      taxGroups.set(key, group);
    }
  });

  const discountedSubtotal = round2(netSubtotal.minus(invoiceDiscount));
  const total = round2(discountedSubtotal.plus(taxTotal));

  const paidRaw = parseDecimal(invoice.amountPaid) ?? ZERO;
  if (paidRaw.lt(0)) errors.push("Amount paid cannot be negative.");
  const amountPaid = round2(clampZero(paidRaw));
  const outstanding = round2(clampZero(total.minus(amountPaid)));
  const credit = round2(clampZero(amountPaid.minus(total)));

  return {
    currency,
    lines: lines.map((line) => ({
      id: line.id,
      description: line.description,
      quantity: line.quantity,
      unitOfMeasure: line.unitOfMeasure,
      unitPrice: line.unitPrice,
      discountType: line.discountType,
      discountValue: line.discountValue,
      taxRate: line.taxRate,
      taxExempt: line.taxExempt,
      notes: line.notes,
      valid: line.valid,
      gross: money(line.gross),
      discount: money(line.discount),
      net: money(line.net),
      invoiceDiscount: money(line.invoiceDiscount),
      taxable: money(line.taxable),
      tax: money(line.tax),
      total: money(line.total),
    })),
    grossSubtotal: money(grossSubtotal),
    lineDiscountTotal: money(lineDiscountTotal),
    netSubtotal: money(netSubtotal),
    invoiceDiscount: money(invoiceDiscount),
    discountedSubtotal: money(discountedSubtotal),
    taxableTotal: money(taxableTotal),
    taxTotal: money(taxTotal),
    taxBreakdown: Array.from(taxGroups.values())
      .map((group) => ({
        rate: group.rate,
        taxable: money(group.taxable),
        tax: money(group.tax),
      }))
      .sort((a, b) => Number(a.rate) - Number(b.rate)),
    total: money(total),
    amountPaid: money(amountPaid),
    outstanding: money(outstanding),
    credit: money(credit),
    isOverpaid: credit.gt(0),
    hasLineItems: lines.length > 0,
    errors,
  };
}

/**
 * Overdue is derived, never stored on a timer. Drafts, paid, cancelled and void
 * invoices can never be overdue. Due date is inclusive through end of day.
 */
export function isInvoiceOverdue(invoice = {}, now = new Date()) {
  const status = invoice.status || "draft";
  if (["draft", "paid", "cancelled", "void"].includes(status)) return false;
  if (!invoice.dueDate) return false;

  const totals = calculateInvoiceTotals(invoice);
  if (new Decimal(totals.outstanding).lte(0)) return false;

  const due = new Date(invoice.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  due.setHours(23, 59, 59, 999);
  return due.getTime() < now.getTime();
}

/**
 * Derive the display status from lifecycle + payments + due date.
 * Drafts and terminal states are preserved.
 */
export function deriveInvoiceStatus(invoice = {}, { now = new Date() } = {}) {
  const status = invoice.status || "draft";
  if (["draft", "cancelled", "void", "paid"].includes(status)) return status;
  if (isInvoiceOverdue(invoice, now)) return "overdue";

  const totals = calculateInvoiceTotals(invoice);
  const total = new Decimal(totals.total);
  const outstanding = new Decimal(totals.outstanding);
  if (total.gt(0) && outstanding.lte(0)) return "paid";
  if (new Decimal(totals.amountPaid).gt(0)) return "partially_paid";
  return status;
}
