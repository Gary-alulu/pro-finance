import { Decimal } from "decimal.js";
import { SUPPORTED_CURRENCIES } from "../finance/currency.js";

export const DOCUMENT_TYPES = [
  "bank_statement",
  "property_deed",
  "share_certificate",
  "loan_agreement",
  "tax_return",
  "insurance_policy",
  "valuation_report",
  "investment_statement",
  "dividend_statement",
  "nse_contract_note",
  "receipt",
  "invoice",
  "contract",
  "identity_document",
  "other",
];

export const DOCUMENT_TYPE_LABELS = {
  bank_statement: "Bank Statement",
  property_deed: "Title Deed",
  share_certificate: "Share Certificate",
  loan_agreement: "Loan Agreement",
  tax_return: "Tax Return",
  insurance_policy: "Insurance Policy",
  valuation_report: "Valuation Report",
  investment_statement: "Investment Statement",
  dividend_statement: "Dividend Statement",
  nse_contract_note: "NSE Contract Note",
  receipt: "Receipt",
  invoice: "Invoice",
  contract: "Contract",
  identity_document: "Identity Document",
  other: "Other",
};

const FIELD_LABELS = {
  name: "Record name",
  date: "Document date",
  totalAmount: "Total amount",
  amount: "Total amount",
  subtotal: "Subtotal",
  taxAmount: "Tax",
  feesAmount: "Fees",
  currency: "Currency",
  counterparty: "Counterparty",
  category: "Category",
  lineItems: "Transaction details",
  "lineItems.amount": "Line item amounts",
  accountNumber: "Account number",
  closingBalance: "Closing balance",
  reference: "Reference",
};

const DOCUMENT_TYPE_ALIASES = {
  "bank statement": "bank_statement",
  statement: "bank_statement",
  "title deed": "property_deed",
  deed: "property_deed",
  "share certificate": "share_certificate",
  "loan agreement": "loan_agreement",
  mortgage: "loan_agreement",
  "tax return": "tax_return",
  "insurance policy": "insurance_policy",
  "valuation report": "valuation_report",
  valuation: "valuation_report",
  "investment statement": "investment_statement",
  "dividend statement": "dividend_statement",
  dividend: "dividend_statement",
  "nse contract note": "nse_contract_note",
  "contract note": "nse_contract_note",
  receipt: "receipt",
  invoice: "invoice",
  contract: "contract",
  "identity document": "identity_document",
};

const REQUIRED_FIELDS = {
  bank_statement: [
    ["date", "critical"],
    ["currency", "critical"],
    ["lineItems", "critical"],
    ["totalAmount", "recommended"],
  ],
  investment_statement: [
    ["date", "critical"],
    ["currency", "critical"],
    ["lineItems", "critical"],
    ["totalAmount", "recommended"],
  ],
  dividend_statement: [
    ["date", "critical"],
    ["currency", "critical"],
    ["totalAmount", "critical"],
    ["counterparty", "recommended"],
  ],
  nse_contract_note: [
    ["date", "critical"],
    ["currency", "critical"],
    ["totalAmount", "critical"],
    ["lineItems", "recommended"],
    ["counterparty", "recommended"],
  ],
  receipt: [
    ["date", "critical"],
    ["currency", "critical"],
    ["totalAmount", "critical"],
    ["counterparty", "recommended"],
  ],
  invoice: [
    ["date", "critical"],
    ["currency", "critical"],
    ["totalAmount", "critical"],
    ["counterparty", "critical"],
  ],
  loan_agreement: [
    ["date", "critical"],
    ["currency", "critical"],
    ["totalAmount", "critical"],
    ["counterparty", "critical"],
  ],
  valuation_report: [
    ["date", "critical"],
    ["currency", "critical"],
    ["totalAmount", "critical"],
    ["name", "recommended"],
  ],
  property_deed: [
    ["date", "recommended"],
    ["name", "critical"],
    ["counterparty", "recommended"],
  ],
  share_certificate: [
    ["date", "recommended"],
    ["name", "critical"],
    ["counterparty", "recommended"],
  ],
  tax_return: [["date", "critical"], ["currency", "critical"], ["totalAmount", "critical"]],
  insurance_policy: [["date", "critical"], ["currency", "critical"], ["totalAmount", "recommended"]],
  contract: [["date", "recommended"], ["counterparty", "recommended"]],
  identity_document: [["name", "recommended"]],
  other: [["date", "recommended"], ["currency", "recommended"], ["totalAmount", "recommended"]],
};

const DEFAULT_REQUIRED = REQUIRED_FIELDS.other;

const DIRECTION_ALIASES = {
  inflow: "inflow",
  credit: "inflow",
  deposit: "inflow",
  received: "inflow",
  receipt: "inflow",
  income: "inflow",
  outflow: "outflow",
  debit: "outflow",
  withdrawal: "outflow",
  payment: "outflow",
  purchase: "outflow",
  expense: "outflow",
  transfer: "transfer",
  internal: "transfer",
  unknown: "unknown",
};

function cleanText(value, maxLength = 500) {
  if (value === null || value === undefined) return null;
  const text = String(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t\u00A0]{2,}/g, " ")
    .trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}

export function normalizeDocumentType(value) {
  if (value === null || value === undefined) return "other";
  const raw = String(value).trim().toLowerCase();
  if (!raw) return "other";
  if (DOCUMENT_TYPES.includes(raw)) return raw;
  if (DOCUMENT_TYPE_ALIASES[raw]) return DOCUMENT_TYPE_ALIASES[raw];
  const underscored = raw.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (DOCUMENT_TYPES.includes(underscored)) return underscored;
  return DOCUMENT_TYPE_ALIASES[underscored] || "other";
}

const SUPPORTED_CURRENCY_CODES = new Set(SUPPORTED_CURRENCIES.map((item) => item.code));
const CURRENCY_ALIASES = {
  KSH: "KES",
  KSHS: "KES",
  USH: "UGX",
  TSH: "TZS",
  US$: "USD",
  $: "USD",
  "€": "EUR",
  "£": "GBP",
  R: "ZAR",
};

export function normalizeCurrency(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim().toUpperCase();
  if (!text) return null;
  if (CURRENCY_ALIASES[text]) return CURRENCY_ALIASES[text];
  const compact = text.replace(/\s+/g, "");
  if (CURRENCY_ALIASES[compact]) return CURRENCY_ALIASES[compact];
  if (SUPPORTED_CURRENCY_CODES.has(compact)) return compact;
  return null;
}

export function normalizeDate(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/.exec(text);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${match[1]}-${match[2]}-${match[3]}`;
}

export function normalizeAmount(value, { allowNegative = false } = {}) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && !Number.isFinite(value)) return null;
  let raw = String(value).trim();
  if (!raw || /^\(.*\)$/.test(raw)) return null;
  raw = raw
    .replace(/[\u00A0\s']/g, "")
    .replace(/^[A-Za-z]{2,3}/, "")
    .replace(/[^\d.-]/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(raw)) return null;
  try {
    const amount = new Decimal(raw);
    if (!amount.isFinite()) return null;
    if (!allowNegative && amount.isNegative()) return null;
    return amount.toFixed(2);
  } catch {
    return null;
  }
}

export function normalizeDirection(value) {
  if (value === null || value === undefined) return "unknown";
  const key = String(value).trim().toLowerCase();
  return DIRECTION_ALIASES[key] || "unknown";
}

export function clampConfidence(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.min(1, Math.max(0, number));
}

export function labelForField(field) {
  if (!field) return "Field";
  if (FIELD_LABELS[field]) return FIELD_LABELS[field];
  return String(field)
    .replace(/[._]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeLineItem(item, index, fallbackCurrency) {
  if (!item || typeof item !== "object") return null;

  const signlessAmount = normalizeAmount(item.amount, { allowNegative: true });
  let amount = signlessAmount;
  let direction = normalizeDirection(item.direction);
  if (signlessAmount && signlessAmount.startsWith("-")) {
    amount = signlessAmount.slice(1);
    if (direction === "unknown") direction = "outflow";
  }

  const description = cleanText(item.description || item.name, 300);
  const date = normalizeDate(item.date);
  const excerpt = cleanText(item.excerpt, 500);
  const page = Number.isInteger(item.page) && item.page > 0 ? item.page : null;
  const reference = cleanText(item.reference, 100);

  if (!description && !amount && !date && !excerpt && !reference) return null;

  return {
    index,
    date,
    description,
    amount,
    currency: normalizeCurrency(item.currency) || fallbackCurrency,
    direction,
    category: cleanText(item.category, 100),
    reference,
    page,
    excerpt,
    confidence: clampConfidence(item.confidence),
  };
}

function normalizeFieldEvidence(entry) {
  if (!entry || typeof entry !== "object") return null;
  const field = cleanText(entry.field, 100);
  if (!field) return null;
  const text = cleanText(entry.text || entry.excerpt, 500);
  if (!text) return null;
  return {
    field,
    label: labelForField(field),
    page: Number.isInteger(entry.page) && entry.page > 0 ? entry.page : null,
    text,
    confidence: clampConfidence(entry.confidence),
  };
}

function normalizeMissingField(entry, importanceFallback = "recommended") {
  if (typeof entry === "string") {
    const field = cleanText(entry, 100);
    if (!field) return null;
    return {
      field,
      label: labelForField(field),
      reason: "Not found in the document",
      importance: importanceFallback,
    };
  }
  if (!entry || typeof entry !== "object") return null;
  const field = cleanText(entry.field, 100);
  if (!field) return null;
  const importance =
    entry.importance === "critical" || entry.importance === "recommended"
      ? entry.importance
      : importanceFallback;
  return {
    field,
    label: labelForField(field),
    reason: cleanText(entry.reason, 300) || "Not found in the document",
    importance,
  };
}

function normalizeConflict(entry) {
  if (!entry || typeof entry !== "object") return null;
  const field = cleanText(entry.field, 100);
  const message = cleanText(entry.message, 300);
  if (!field && !message) return null;
  const values = Array.isArray(entry.values)
    ? entry.values.map((value) => cleanText(value, 100)).filter(Boolean).slice(0, 6)
    : [];
  return {
    code: cleanText(entry.code, 100) || `conflict_${field || "unknown"}`,
    field: field || "unknown",
    label: labelForField(field || "unknown"),
    message: message || "The extracted values disagree.",
    values,
  };
}

function sumAmounts(amounts) {
  return amounts.reduce((total, amount) => total.plus(new Decimal(amount)), new Decimal(0));
}

function difference(a, b) {
  return new Decimal(a).minus(new Decimal(b)).abs().toFixed(2);
}

function exceedsTolerance(a, b) {
  return new Decimal(difference(a, b)).gt("0.01");
}

function addUniqueByKey(list, item, keyBuilder) {
  const key = keyBuilder(item);
  if (!list.some((existing) => keyBuilder(existing) === key)) {
    list.push(item);
  }
}

function fieldValue(field, { name, date, currency, totalAmount, counterparty, lineItems }) {
  switch (field) {
    case "name":
      return name;
    case "date":
      return date;
    case "currency":
      return currency;
    case "totalAmount":
    case "amount":
      return totalAmount;
    case "counterparty":
      return counterparty;
    case "lineItems":
      return lineItems.length > 0 ? "present" : null;
    default:
      return null;
  }
}

export function analyzeExtraction(proposal = {}, options = {}) {
  const documentType = normalizeDocumentType(proposal.documentType);
  const proposedEntityType = ["asset", "liability", "transaction"].includes(
    proposal.proposedEntityType
  )
    ? proposal.proposedEntityType
    : "none";
  const name = cleanText(proposal.name, 300);
  const currency = normalizeCurrency(proposal.currency);
  const date = normalizeDate(proposal.date);
  const totalAmount = normalizeAmount(proposal.totalAmount ?? proposal.amount);
  const subtotal = normalizeAmount(proposal.subtotal);
  const taxAmount = normalizeAmount(proposal.taxAmount);
  const feesAmount = normalizeAmount(proposal.feesAmount);
  const counterparty = cleanText(proposal.counterparty, 200);
  const category = cleanText(proposal.category, 100);
  const summary = cleanText(proposal.summary, 1000);
  const confidence = clampConfidence(proposal.confidence);

  const lineItems = (Array.isArray(proposal.lineItems) ? proposal.lineItems : [])
    .slice(0, 500)
    .map((item, index) => normalizeLineItem(item, index, currency))
    .filter(Boolean);

  const fieldEvidence = (Array.isArray(proposal.fieldEvidence) ? proposal.fieldEvidence : [])
    .slice(0, 200)
    .map(normalizeFieldEvidence)
    .filter(Boolean);

  const missingFields = [];
  for (const entry of Array.isArray(proposal.missingFields) ? proposal.missingFields : []) {
    const normalized = normalizeMissingField(entry);
    if (normalized) addUniqueByKey(missingFields, normalized, (item) => item.field);
  }

  const conflicts = [];
  for (const entry of Array.isArray(proposal.conflicts) ? proposal.conflicts : []) {
    const normalized = normalizeConflict(entry);
    if (normalized) addUniqueByKey(conflicts, normalized, (item) => `${item.field}:${item.code}`);
  }

  const uncertainFields = [];
  for (const field of Array.isArray(proposal.uncertainFields) ? proposal.uncertainFields : []) {
    const cleaned = cleanText(field, 100);
    if (cleaned && !uncertainFields.includes(cleaned)) uncertainFields.push(cleaned);
  }

  const lineAmounts = lineItems.map((item) => item.amount).filter(Boolean);
  const lineItemsTotal = lineAmounts.length ? sumAmounts(lineAmounts).toFixed(2) : null;
  const componentsTotal = subtotal
    ? sumAmounts([subtotal, taxAmount, feesAmount].filter(Boolean)).toFixed(2)
    : null;

  let lineItemsDifference = null;
  let componentsDifference = null;
  let reconciles = null;

  if (totalAmount && lineItemsTotal) {
    lineItemsDifference = difference(totalAmount, lineItemsTotal);
    if (!subtotal) {
      reconciles = !exceedsTolerance(totalAmount, lineItemsTotal);
      if (!reconciles) {
        addUniqueByKey(
          conflicts,
          {
            code: "total_vs_line_items",
            field: "totalAmount",
            label: labelForField("totalAmount"),
            message: "The stated total does not match the sum of the extracted transaction lines.",
            values: [totalAmount, lineItemsTotal],
          },
          (item) => `${item.field}:${item.code}`
        );
      }
    }
  }

  if (subtotal && lineItemsTotal) {
    const matches = !exceedsTolerance(subtotal, lineItemsTotal);
    if (!matches) {
      addUniqueByKey(
        conflicts,
        {
          code: "subtotal_vs_line_items",
          field: "subtotal",
          label: labelForField("subtotal"),
          message:
            "The transaction lines do not add up to the stated subtotal. Check tax, fees and omitted lines.",
          values: [subtotal, lineItemsTotal],
        },
        (item) => `${item.field}:${item.code}`
      );
    }
    if (!matches) reconciles = false;
    else if (reconciles === null) reconciles = true;
  }

  if (totalAmount && componentsTotal) {
    componentsDifference = difference(totalAmount, componentsTotal);
    const matches = !exceedsTolerance(totalAmount, componentsTotal);
    if (!matches) {
      addUniqueByKey(
        conflicts,
        {
          code: "total_vs_components",
          field: "totalAmount",
          label: labelForField("totalAmount"),
          message: "Subtotal plus tax and fees does not match the stated total.",
          values: [totalAmount, componentsTotal],
        },
        (item) => `${item.field}:${item.code}`
      );
    }
    if (!matches) reconciles = false;
    else if (reconciles === null) reconciles = true;
  }

  const required = REQUIRED_FIELDS[documentType] || DEFAULT_REQUIRED;
  for (const [field, importance] of required) {
    const value = fieldValue(field, {
      name,
      date,
      currency,
      totalAmount,
      counterparty,
      lineItems,
    });
    if (!value) {
      const existing = missingFields.find((item) => item.field === field);
      if (existing) {
        if (importance === "critical") existing.importance = "critical";
      } else {
        missingFields.push({
          field,
          label: labelForField(field),
          reason: "Not found in the document",
          importance,
        });
      }
    }
  }

  const itemsMissingAmounts = lineItems.filter((item) => !item.amount).length;
  if (itemsMissingAmounts > 0) {
    addUniqueByKey(
      missingFields,
      {
        field: "lineItems.amount",
        label: labelForField("lineItems.amount"),
        reason: `${itemsMissingAmounts} transaction line${
          itemsMissingAmounts === 1 ? "" : "s"
        } have no amount`,
        importance: "critical",
      },
      (item) => item.field
    );
  }

  for (const missing of missingFields) {
    if (!missing.importance) {
      missing.importance = ["totalAmount", "amount", "date", "currency"].includes(missing.field)
        ? "critical"
        : "recommended";
    }
  }

  const ambiguousFields = uncertainFields.map((field) => ({
    field,
    label: labelForField(field),
    reason: "The extraction engine marked this value as uncertain.",
  }));

  const source = {
    kind: ["pdf", "image", "text", "unknown"].includes(proposal.source?.kind)
      ? proposal.source.kind
      : options.sourceKind || "unknown",
    pageCount:
      Number.isInteger(proposal.source?.pageCount) && proposal.source.pageCount > 0
        ? proposal.source.pageCount
        : null,
    truncated: Boolean(proposal.source?.truncated),
    warning: cleanText(proposal.source?.warning || options.sourceWarning, 500),
  };

  const recommendations = [];
  if (source.warning) recommendations.push(source.warning);
  if (conflicts.length > 0) {
    recommendations.push(
      `Resolve ${conflicts.length} conflicting value${conflicts.length === 1 ? "" : "s"} before approving.`
    );
  }
  const criticalMissing = missingFields.filter((item) => item.importance === "critical");
  if (criticalMissing.length > 0) {
    recommendations.push(
      `Provide the missing critical field${criticalMissing.length === 1 ? "" : "s"}: ${criticalMissing
        .map((item) => item.label)
        .join(", ")}.`
    );
  }
  if (lineItems.length > 0 && reconciles === true) {
    recommendations.push("The transaction lines reconcile with the stated totals.");
  }
  if (lineItems.length > 0 && reconciles === false) {
    recommendations.push("Do not approve until the transaction lines and totals agree.");
  }
  if (!totalAmount && lineItemsTotal) {
    recommendations.push(
      `No document total was read. The extracted lines add up to ${currency || ""} ${lineItemsTotal}.`
    );
  }
  if (
    lineItems.length === 0 &&
    ["bank_statement", "investment_statement", "receipt", "invoice"].includes(documentType)
  ) {
    recommendations.push(
      "No individual transaction lines were detected. Add them manually or upload a clearer copy."
    );
  }
  if (documentType === "other") {
    recommendations.push("The document type is unclear. Choose the right record type before approving.");
  }
  if (recommendations.length === 0) {
    recommendations.push("Review the source evidence below, then approve if it looks correct.");
  }

  return {
    documentType,
    proposedEntityType,
    name,
    totalAmount,
    amount: totalAmount,
    subtotal,
    taxAmount,
    feesAmount,
    currency,
    date,
    counterparty,
    category,
    lineItems,
    fieldEvidence,
    missingFields: missingFields.slice(0, 100),
    conflicts: conflicts.slice(0, 100),
    uncertainFields,
    ambiguousFields,
    confidence,
    summary,
    source,
    computed: {
      lineItemsTotal,
      componentsTotal,
      statedTotal: totalAmount,
      lineItemsDifference,
      componentsDifference,
      lineItemCount: lineItems.length,
      reconciles,
    },
    quality: {
      missingCount: missingFields.length,
      criticalMissingCount: criticalMissing.length,
      conflictCount: conflicts.length,
      ambiguousCount: ambiguousFields.length,
      reviewRequired:
        conflicts.length > 0 || criticalMissing.length > 0 || ambiguousFields.length > 0,
    },
    recommendations: recommendations.slice(0, 8),
  };
}
