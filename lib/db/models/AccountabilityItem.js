// lib/db/models/AccountabilityItem.js
// A single accountability finding, keyed stably by `key` (type:entityId) so
// re-scans upsert instead of duplicating. Severity uses error/warning/info;
// legacy rows with high/medium/low remain readable.
import mongoose from "mongoose";

const AccountabilityItemSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Stable dedupe key, e.g. "missing_valuation:665f…"
    key: { type: String, required: true },
    type: {
      type: String,
      enum: [
        "missing_valuation",
        "outdated_valuation",
        "missing_evidence",
        "duplicate_document",
        "ai_pending_review",
        "extraction_failed",
        "conflicting_data",
        "missing_balance",
        "missing_amount",
        "missing_price",
        "missing_document",
        "stale_investment_price",
        "unlinked_transaction",
        "liability_maturity_overdue",
        "liability_maturity_upcoming",
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ["error", "warning", "info", "high", "medium", "low"],
      default: "warning",
    },
    title: { type: String, required: true },
    // Why the user needs to act — shown verbatim in the review queue.
    reason: String,
    // Where to resolve it, e.g. "/assets?tab=assets&focus=<id>"
    actionLabel: String,
    actionHref: String,
    linkedEntityType: {
      type: String,
      enum: ["asset", "liability", "transaction", "investment", "document"],
    },
    linkedEntityId: mongoose.Schema.Types.ObjectId,
    meta: mongoose.Schema.Types.Mixed,
    status: {
      type: String,
      enum: ["open", "dismissed", "resolved"],
      default: "open",
    },
    // "auto" when a re-scan found the underlying problem was fixed
    resolution: {
      type: String,
      enum: ["manual", "auto"],
    },
    resolvedAt: Date,
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

AccountabilityItemSchema.index({ ownerId: 1, status: 1 });
AccountabilityItemSchema.index({ ownerId: 1, severity: 1 });
AccountabilityItemSchema.index(
  { ownerId: 1, key: 1 },
  { unique: true }
);

export default mongoose.models.AccountabilityItem ||
  mongoose.model("AccountabilityItem", AccountabilityItemSchema);
