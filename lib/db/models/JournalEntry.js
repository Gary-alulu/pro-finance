// lib/db/models/JournalEntry.js
// Personal Financial Command Journal Entry schema.
// Captures financial decisions, reasoning, expected outcomes, risks, linked records, and follow-ups.

import mongoose from "mongoose";

export const JOURNAL_CATEGORIES = [
  "investment_decision",
  "major_purchase",
  "savings_commitment",
  "debt_decision",
  "business_expense",
  "unexpected_expense",
  "lesson_learned",
  "general_reflection",
];

const LinkedRecordSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      enum: ["asset", "liability", "investment", "transaction", "invoice", "document"],
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    amount: String,
    currency: String,
  },
  { _id: false }
);

const EditHistoryEntrySchema = new mongoose.Schema(
  {
    editedAt: {
      type: Date,
      default: Date.now,
    },
    reason: String,
    previousState: {
      title: String,
      contextReasoning: String,
      expectedOutcome: String,
      risksAssumptions: String,
    },
  },
  { _id: false }
);

const JournalEntrySchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    category: {
      type: String,
      enum: JOURNAL_CATEGORIES,
      required: true,
      index: true,
    },
    decisionDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    // Why am I doing this? / Context & motivation
    contextReasoning: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    // What does success look like? / Measurable target
    expectedOutcome: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: "",
    },
    // Risks, uncertainties, assumptions considered
    risksAssumptions: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: "",
    },
    // Other options evaluated before deciding
    alternativesConsidered: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: "",
    },
    // Optional financial value involved
    amount: {
      amount: mongoose.Schema.Types.Decimal128,
      currency: {
        type: String,
        default: "KES",
      },
    },
    // Searchable tag keywords
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    // Supporting records in the platform
    linkedRecords: {
      type: [LinkedRecordSchema],
      default: [],
    },
    // Scheduled follow-up / evaluation date
    reviewDate: {
      type: Date,
      index: true,
    },
    followUpStatus: {
      type: String,
      enum: ["none", "pending", "completed"],
      default: "none",
      index: true,
    },
    // Post-decision reflection: what actually happened & lessons learned
    outcomeLessons: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: "",
    },
    outcomeRecordedAt: Date,
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
      index: true,
    },
    // Immutable audit of prior reasoning when modifications occur
    editHistory: {
      type: [EditHistoryEntrySchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        if (ret.amount?.amount) {
          ret.amount.amount = ret.amount.amount.toString();
        }
        return ret;
      },
    },
  }
);

JournalEntrySchema.index({ ownerId: 1, decisionDate: -1 });
JournalEntrySchema.index({ ownerId: 1, status: 1, category: 1 });
JournalEntrySchema.index({ ownerId: 1, followUpStatus: 1, reviewDate: 1 });

export default mongoose.models.JournalEntry ||
  mongoose.model("JournalEntry", JournalEntrySchema);
