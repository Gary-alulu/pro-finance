// lib/invoices/constants.js
// Shared invoice vocabulary. Safe to import from client and server code.

export const INVOICE_DIRECTIONS = [
  {
    value: "outgoing",
    label: "Outgoing invoice",
    shortLabel: "Outgoing",
    description: "Money a client owes you (a receivable).",
  },
  {
    value: "incoming",
    label: "Incoming invoice",
    shortLabel: "Incoming",
    description: "Money you owe a supplier (a payable).",
  },
];

export const DIRECTION_META = {
  outgoing: { label: "Outgoing", tone: "emerald" },
  incoming: { label: "Incoming", tone: "gold" },
};

export const INVOICE_STATUSES = [
  "draft",
  "issued",
  "partially_paid",
  "paid",
  "overdue",
  "cancelled",
  "void",
];

export const INVOICE_STATUS_META = {
  draft: { label: "Draft", tone: "neutral" },
  issued: { label: "Issued", tone: "blue" },
  partially_paid: { label: "Partially paid", tone: "gold" },
  paid: { label: "Paid", tone: "emerald" },
  overdue: { label: "Overdue", tone: "coral" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  void: { label: "Void", tone: "neutral" },
};

export const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "issued", label: "Issued" },
  { value: "partially_paid", label: "Partially paid" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "cancelled", label: "Cancelled" },
  { value: "void", label: "Void" },
];

export const DIRECTION_FILTER_OPTIONS = [
  { value: "all", label: "All directions" },
  { value: "outgoing", label: "Outgoing" },
  { value: "incoming", label: "Incoming" },
];

export const DISCOUNT_TYPES = [
  { value: "none", label: "No discount" },
  { value: "percent", label: "Percent" },
  { value: "amount", label: "Fixed amount" },
];

export const TAX_TREATMENTS = [
  { value: "taxable", label: "Taxable" },
  { value: "exempt", label: "Exempt / non-taxable" },
];

export const DUE_DATE_PRESETS = [
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
  { value: 30, label: "30 days" },
  { value: 45, label: "45 days" },
];

export const INVOICE_TEMPLATES = [
  {
    value: "classic",
    label: "Classic",
    description: "Editorial layout with a clear line-item table and totals panel.",
  },
];

export const DEFAULT_INVOICE_SETTINGS = {
  issuer: {
    name: "",
    email: "",
    phone: "",
    address: "",
    taxId: "",
    logo: "",
  },
  defaultCurrency: "KES",
  numbering: {
    prefix: "INV",
    separator: "-",
    includeYear: true,
    nextNumber: 1,
    padding: 4,
  },
  defaultDueDays: 14,
  defaultPaymentInstructions: "",
  defaultNotes: "",
  defaultTerms: "Payment is due by the date shown on this invoice.",
  defaultTaxRate: "16",
  defaultTaxExempt: false,
  template: "classic",
};

/**
 * Drafts do not consume an invoice number. A draft only shows the next suggested
 * number; the authoritative number is allocated atomically by the server on issue
 * (Stage 2). Returning a copy prevents accidental mutation of the defaults.
 */
export function defaultInvoiceSettings() {
  return JSON.parse(JSON.stringify(DEFAULT_INVOICE_SETTINGS));
}

export const LOCAL_DRAFT_NOTICE =
  "Invoice drafts are saved in this browser only. Server persistence, issuing, PDFs, payments and ledger sync are not connected yet.";

export const CALCULATION_POLICY =
  "Line gross = quantity x unit price. Line discounts apply first, then the " +
  "invoice discount is allocated proportionally across line nets. Tax is applied " +
  "per line to the post-discount taxable amount. Monetary outputs round " +
  "half-up to 2 decimals.";
