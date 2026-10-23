// lib/db/models/Reconciliation.js
import mongoose from "mongoose";

const CandidateSchema = new mongoose.Schema(
  {
    candidateType: {
      type: String,
      enum: ["transaction", "investment_trade", "dividend", "investment_holding"],
      default: "transaction",
    },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
    investmentId: { type: mongoose.Schema.Types.ObjectId, ref: "InvestmentHolding" },
    tradeId: { type: mongoose.Schema.Types.ObjectId, ref: "InvestmentTrade" },
    dividendId: { type: mongoose.Schema.Types.ObjectId, ref: "Dividend" },
    documentLineId: String,
    score: { type: Number, min: 0, max: 1, default: 0 },
    confidence: { type: Number, min: 0, max: 1, default: 0 },
    reasons: [String],
    explanation: String,
    matchedFields: [String],
    amountDelta: String,
    dateDeltaDays: Number,
  },
  { _id: false }
);

const ReconciliationSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      index: true,
    },
    statementEntry: {
      date: Date,
      description: String,
      amount: String,
      currency: String,
      direction: String,
      reference: String,
      lineIndex: Number,
      raw: mongoose.Schema.Types.Mixed,
    },
    status: {
      type: String,
      enum: ["suggested", "confirmed", "rejected", "corrected", "auto_linked"],
      default: "suggested",
      index: true,
    },
    candidates: [CandidateSchema],
    confirmedMatch: {
      candidateType: String,
      transactionId: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
      investmentId: { type: mongoose.Schema.Types.ObjectId, ref: "InvestmentHolding" },
      tradeId: { type: mongoose.Schema.Types.ObjectId, ref: "InvestmentTrade" },
      dividendId: { type: mongoose.Schema.Types.ObjectId, ref: "Dividend" },
      matchType: { type: String, enum: ["transaction", "investment", "dividend", "investment_trade"] },
      confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      confirmedAt: Date,
      note: String,
    },
    correctedEntry: mongoose.Schema.Types.Mixed,
    explanation: String,
    aiSuggested: { type: Boolean, default: true },
    potentialDuplicate: { type: Boolean, default: false },
    unexplainedDifference: { type: Boolean, default: false },
    missingEntry: { type: Boolean, default: false },
    impact: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
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

ReconciliationSchema.index({ ownerId: 1, documentId: 1, status: 1 });
ReconciliationSchema.index({ ownerId: 1, status: 1, impact: 1 });

export default mongoose.models.Reconciliation ||
  mongoose.model("Reconciliation", ReconciliationSchema);
