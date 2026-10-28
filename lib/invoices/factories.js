// lib/invoices/factories.js
// Small pure factories for invoice drafts and line items.
// No database access; Stage 1 drafts live in the browser (see localDrafts.js).

import { defaultInvoiceSettings } from "./constants.js";

export function newId(prefix = "inv") {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

export function toISODate(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDaysISO(isoDate, days) {
  const base = isoDate ? new Date(`${isoDate}T00:00:00`) : new Date();
  if (Number.isNaN(base.getTime())) return toISODate(new Date());
  base.setDate(base.getDate() + (Number(days) || 0));
  return toISODate(base);
}

export function createLineItem(overrides = {}) {
  return {
    id: newId("line"),
    description: "",
    quantity: "1",
    unitOfMeasure: "",
    unitPrice: "",
    discountType: "none",
    discountValue: "",
    taxRate: "",
    taxExempt: false,
    notes: "",
    ...overrides,
  };
}

/**
 * Build an empty draft from saved issuer/numbering/default preferences.
 * `invoiceNumber` stays empty because drafts do not consume a number.
 */
export function createEmptyInvoice(settingsInput, { now = new Date() } = {}) {
  const settings = settingsInput || defaultInvoiceSettings();
  const issueDate = toISODate(now);
  const dueDays = Number(settings.defaultDueDays) || 14;

  return {
    id: newId(),
    direction: "outgoing",
    status: "draft",
    invoiceNumber: "",
    title: "",
    purchaseOrder: "",
    issueDate,
    dueDate: addDaysISO(issueDate, dueDays),
    currency: settings.defaultCurrency || "KES",
    issuer: {
      name: settings.issuer?.name || "",
      email: settings.issuer?.email || "",
      phone: settings.issuer?.phone || "",
      address: settings.issuer?.address || "",
      taxId: settings.issuer?.taxId || "",
      logo: settings.issuer?.logo || "",
    },
    recipient: {
      name: "",
      email: "",
      phone: "",
      address: "",
      taxId: "",
    },
    deliveryAddress: "",
    lineItems: [
      createLineItem({
        taxRate: settings.defaultTaxRate ?? "16",
        taxExempt: Boolean(settings.defaultTaxExempt),
      }),
    ],
    discount: { enabled: false, type: "percent", value: "" },
    paymentInstructions: settings.defaultPaymentInstructions || "",
    notes: settings.defaultNotes || "",
    terms: settings.defaultTerms || "",
    attachmentIds: [],
    amountPaid: "0.00",
    template: settings.template || "classic",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

/**
 * Duplicate as a fresh draft. The copy has no invoice number and starts
 * unpaid; a real number is assigned only when it is issued.
 */
export function duplicateInvoice(invoice, { now = new Date() } = {}) {
  const issueDate = toISODate(now);
  const copy = JSON.parse(JSON.stringify(invoice || {}));
  return {
    ...copy,
    id: newId(),
    status: "draft",
    invoiceNumber: "",
    issueDate,
    dueDate: addDaysISO(issueDate, 14),
    amountPaid: "0.00",
    attachmentIds: Array.isArray(copy.attachmentIds) ? [...copy.attachmentIds] : [],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}
