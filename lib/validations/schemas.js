// lib/validations/schemas.js
// Zod validation schemas for all financial entity mutations.
// Used in both API Route Handlers (server) and React Hook Form (client display).
// Do NOT import server-only modules here — this file is shared.

import { z } from "zod";
import { SUPPORTED_CURRENCIES } from "../finance/currency.js";

// ── Common fields ────────────────────────────────────────────────────────────

const currencyCode = z
  .string()
  .toUpperCase()
  .refine((code) => SUPPORTED_CURRENCIES.some((c) => c.code === code), {
    message: "Unsupported currency code",
  })
  .default("KES")
  .describe("ISO 4217 currency code");

const monetaryAmount = z
  .string()
  .regex(/^\d+(\.\d{1,10})?$/, "Must be a valid positive decimal number")
  .describe("Monetary amount as decimal string");

const optionalMonetary = monetaryAmount.optional().or(z.literal("")).transform(v => v || undefined);

// ── Auth schemas ─────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
});

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters"),
  email: z.string().trim().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
  preferredCurrency: currencyCode,
});

// ── Asset schemas ────────────────────────────────────────────────────────────

export const assetCategories = [
  "cash",
  "bank_account",
  "property",
  "vehicle",
  "listed_equity",
  "private_equity",
  "retirement",
  "bond",
  "crypto",
  "receivable",
  "other",
];

export const createAssetSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  category: z.enum(assetCategories, { message: "Invalid category" }),
  subCategory: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  currency: currencyCode,
  currentValue: z
    .object({
      amount: monetaryAmount,
      asOf: z.string().datetime({ offset: true }).or(z.string().date()),
      source: z
        .enum(["manual", "ai_extracted", "market_feed", "imported"])
        .default("manual"),
    })
    .optional(),
  status: z
    .enum(["active", "sold", "transferred", "unknown"])
    .default("active"),
  tags: z.array(z.string().max(50)).max(20).optional(),
  notes: z.string().max(5000).optional(),
});

export const updateAssetSchema = createAssetSchema.partial();

export const addValuationSchema = z.object({
  amount: monetaryAmount,
  currency: currencyCode,
  asOf: z.string().datetime({ offset: true }).or(z.string().date()),
  source: z
    .enum(["manual", "ai_extracted", "market_feed", "imported"])
    .default("manual"),
  note: z.string().max(500).optional(),
});

// ── Liability schemas ────────────────────────────────────────────────────────

export const liabilityCategories = [
  "mortgage",
  "car_loan",
  "personal_loan",
  "credit_card",
  "overdraft",
  "business_loan",
  "student_loan",
  "tax_owed",
  "other",
];

export const createLiabilitySchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  category: z.enum(liabilityCategories, { message: "Invalid category" }),
  currency: currencyCode,
  principalAmount: optionalMonetary,
  currentBalance: z
    .object({
      amount: monetaryAmount,
      asOf: z.string().datetime({ offset: true }).or(z.string().date()),
      source: z.enum(["manual", "ai_extracted", "statement"]).default("manual"),
    })
    .optional(),
  interestRate: optionalMonetary,
  startDate: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
  maturityDate: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
  lender: z.string().max(200).optional(),
  linkedAssetId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  status: z.enum(["active", "settled", "written_off", "unknown"]).default("active"),
  notes: z.string().max(5000).optional(),
});

export const updateLiabilitySchema = createLiabilitySchema.partial();

// ── Transaction schemas ──────────────────────────────────────────────────────

export const transactionCategories = [
  "income",
  "expense",
  "investment_purchase",
  "investment_sale",
  "loan_repayment",
  "asset_purchase",
  "asset_sale",
  "dividend",
  "interest",
  "fee",
  "tax",
  "transfer",
  "other",
];

export const createTransactionSchema = z.object({
  date: z.string().datetime({ offset: true }).or(z.string().date()),
  description: z.string().max(500).optional(),
  amount: monetaryAmount,
  currency: currencyCode,
  direction: z.enum(["inflow", "outflow", "transfer", "unknown"]),
  category: z.enum(transactionCategories).default("other"),
  linkedAssetId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  linkedLiabilityId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  linkedInvestmentId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  linkedDocumentId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  evidenceStatus: z.enum(["supported", "missing", "pending_review"]).default("missing"),
  tags: z.array(z.string().max(50)).max(20).optional(),
  notes: z.string().max(5000).optional(),
  isRecurring: z.boolean().default(false),
});

export const updateTransactionSchema = createTransactionSchema.partial();

// ── Investment schemas ───────────────────────────────────────────────────────

export const investmentTypes = [
  "listed_equity",
  "bond",
  "etf",
  "mutual_fund",
  "reit",
  "private_equity",
  "crypto",
  "commodity",
  "other",
];

export const createInvestmentSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  type: z.enum(investmentTypes, { message: "Invalid investment type" }),
  ticker: z.string().max(20).optional(),
  exchange: z.string().max(100).optional(),
  currency: currencyCode,
  units: optionalMonetary,
  costBasis: z
    .object({
      totalCost: monetaryAmount,
      currency: currencyCode,
      asOf: z.string().datetime({ offset: true }).or(z.string().date()),
    })
    .optional(),
  currentPrice: z
    .object({
      price: monetaryAmount,
      currency: currencyCode,
      asOf: z.string().datetime({ offset: true }).or(z.string().date()),
      source: z.enum(["manual", "market_feed", "ai_extracted"]).default("manual"),
    })
    .optional(),
  linkedAccountId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  status: z.enum(["active", "closed", "unknown"]).default("active"),
  notes: z.string().max(5000).optional(),
});

export const updateInvestmentSchema = createInvestmentSchema.partial();

// ── Document schemas ─────────────────────────────────────────────────────────

export const documentTypes = [
  "bank_statement",
  "property_deed",
  "share_certificate",
  "loan_agreement",
  "tax_return",
  "insurance_policy",
  "valuation_report",
  "investment_statement",
  "receipt",
  "contract",
  "identity_document",
  "other",
];

export const uploadDocumentSchema = z.object({
  filename: z.string().min(1).max(500),
  mimeType: z.string().min(1),
  fileSize: z.number().positive().max(50 * 1024 * 1024), // 50 MB max
  documentType: z.enum(documentTypes).default("other"),
  linkedAssetId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  linkedLiabilityId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  notes: z.string().max(2000).optional(),
});

// M-6: approve payloads were previously an untyped record. Restrict to the
// fields the approve route actually consumes, per entity type. Unknown keys
// are stripped (default zod behavior).
const approveDataCommon = {
  name: z.string().min(1).max(200).optional(),
  currency: currencyCode.optional(),
  amount: monetaryAmount.optional(),
  date: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
  description: z.string().max(2000).optional(),
};

export const approveDocumentSchema = z.discriminatedUnion("entityType", [
  z.object({
    entityType: z.literal("asset"),
    data: z.object({
      ...approveDataCommon,
      category: z.string().min(1).max(100).optional(),
    }),
  }),
  z.object({
    entityType: z.literal("liability"),
    data: z.object({
      ...approveDataCommon,
      category: z.string().min(1).max(100).optional(),
      counterparty: z.string().max(200).optional(),
      lender: z.string().max(200).optional(),
    }),
  }),
  z.object({
    entityType: z.literal("transaction"),
    data: z.object({
      ...approveDataCommon,
      category: z.string().min(1).max(100).optional(),
      direction: z.enum(["inflow", "outflow"]).optional(),
    }),
  }),
]);

export const updatePriceSchema = z.object({
  price: monetaryAmount,
  asOf: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
  source: z.enum(["manual", "market_feed", "ai_extracted"]).default("manual"),
  currency: currencyCode.optional(),
});

export const updateSettingsSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  preferredCurrency: currencyCode.optional(),
  settings: z
    .object({
      hideSensitiveValues: z.boolean().optional(),
      theme: z.enum(["light", "dark", "system"]).optional(),
      notificationsEnabled: z.boolean().optional(),
    })
    .optional(),
});

// Profile changes always require the current password (email is the login
// credential; password rotation must prove possession of the old one).
export const changeProfileSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("details"),
    currentPassword: z.string().min(1, "Current password is required").max(128),
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(100).optional(),
    email: z.string().trim().email("Please enter a valid email address").optional(),
  }),
  z.object({
    mode: z.literal("password"),
    currentPassword: z.string().min(1, "Current password is required").max(128),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be at most 128 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[0-9]/, "Must contain at least one number"),
  }),
]);

// ── Account schemas ──────────────────────────────────────────────────────────

export const accountTypes = [
  "bank_checking",
  "bank_savings",
  "brokerage",
  "retirement",
  "crypto_exchange",
  "mobile_money",
  "cash",
  "other",
];

export const createAccountSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  institution: z.string().max(200).optional(),
  accountNumberMasked: z.string().max(30).optional(),
  type: z.enum(accountTypes, { message: "Invalid account type" }),
  currency: currencyCode,
  currentBalance: optionalMonetary,
  balanceAsOf: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
  status: z.enum(["active", "closed", "unknown"]).default("active"),
  linkedAssetId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  notes: z.string().max(5000).optional(),
});

export const updateAccountSchema = createAccountSchema.partial();

// ── Reminder schemas ─────────────────────────────────────────────────────────

export const createReminderSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  body: z.string().max(2000).optional(),
  dueAt: z.string().datetime({ offset: true }).or(z.string().date()),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  entityType: z
    .enum(["asset", "liability", "transaction", "investment", "document", "account", "none"])
    .default("none"),
  entityId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  notes: z.string().max(2000).optional(),
});

export const updateReminderSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().max(2000).optional(),
  dueAt: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
  priority: z.enum(["low", "normal", "high"]).optional(),
  status: z.enum(["open", "snoozed", "done", "cancelled"]).optional(),
  notes: z.string().max(2000).optional(),
});

// ── Relationship schemas ─────────────────────────────────────────────────────

export const entityTypes = ["account", "asset", "liability", "transaction", "investment", "document"];
export const relationshipTypes = [
  "secures", "funds", "evidences", "generates", "repays",
  "linked_to", "extracted_from", "duplicate_of", "transfers_to", "held_in",
];

export const createRelationshipSchema = z.object({
  sourceType: z.enum(entityTypes),
  sourceId: z.string().regex(/^[a-f\d]{24}$/i),
  targetType: z.enum(entityTypes),
  targetId: z.string().regex(/^[a-f\d]{24}$/i),
  relationshipType: z.enum(relationshipTypes),
  confidence: z.enum(["confirmed", "ai_suggested", "pending_review"]).default("confirmed"),
  notes: z.string().max(1000).optional(),
});
