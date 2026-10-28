// lib/db/models/FinancialAlert.js
// Persistent financial alert records for the Command Centre & Early-Warning System.
// Every alert has a deterministic dedupeKey so re-evaluations update rather than duplicate.

import mongoose from "mongoose";

const AffectedRecordSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      enum: ["asset", "liability", "investment", "invoice", "document", "transaction", "account"],
      required: true,
    },
    entityId: { type: String, required: true },
    title: { type: String, required: true },
    href: { type: String, required: true },
  },
  { _id: false }
);

const FinancialAlertSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Stable deduplication key: `${ruleKey}:${entityId || "workspace"}`
    dedupeKey: {
      type: String,
      required: true,
    },
    ruleKey: {
      type: String,
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: [
        "cashflow_liquidity",
        "invoices_receivables",
        "investments_portfolio",
        "assets_liabilities",
        "data_integrity",
        "goals_accountability",
      ],
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ["critical", "high", "medium", "low"],
      default: "medium",
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    summary: {
      type: String,
      required: true,
    },
    // Plain-English explanation of why this appeared and the underlying assumptions
    whyItAppeared: {
      type: String,
      required: true,
    },
    // Disclosed uncertainties or caveats (e.g. "Assumes listed bank balances are current")
    uncertainties: String,
    // Step-by-step checklist of recommended actions
    recommendations: [String],
    // Structured metrics breakdown (e.g. availableCash, upcomingObligations, shortfall, concentrationPct, etc.)
    metrics: mongoose.Schema.Types.Mixed,
    // Links to the affected financial records
    affectedRecords: [AffectedRecordSchema],
    status: {
      type: String,
      enum: ["open", "in_progress", "snoozed", "resolved", "dismissed"],
      default: "open",
      index: true,
    },
    snoozedUntil: Date,
    resolvedAt: Date,
    resolvedBy: {
      type: String,
      enum: ["auto", "manual"],
      default: "manual",
    },
    dismissedAt: Date,
    dismissReason: String,
    // Action button metadata
    actionLabel: String,
    actionHref: String,
    // Financial impact estimate where calculable
    estimatedImpact: Number,
    currency: {
      type: String,
      default: "KES",
    },
    deadline: Date,
    lastEvaluatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

FinancialAlertSchema.index({ ownerId: 1, dedupeKey: 1 }, { unique: true });
FinancialAlertSchema.index({ ownerId: 1, status: 1, severity: 1 });
FinancialAlertSchema.index({ ownerId: 1, category: 1, status: 1 });
FinancialAlertSchema.index({ ownerId: 1, lastEvaluatedAt: -1 });

export default mongoose.models.FinancialAlert ||
  mongoose.model("FinancialAlert", FinancialAlertSchema);
