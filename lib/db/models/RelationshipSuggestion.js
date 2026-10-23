// lib/db/models/RelationshipSuggestion.js
import mongoose from "mongoose";

const RelationshipSuggestionSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "document_supports_asset",
        "loan_property",
        "dividend_to_investment",
        "same_asset_account",
        "transaction_document",
        "investment_statement_link",
        "other",
      ],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["suggested", "confirmed", "rejected"],
      default: "suggested",
      index: true,
    },
    source: {
      kind: { type: String, enum: ["document", "transaction", "asset", "liability", "investment", "dividend"] },
      refId: mongoose.Schema.Types.ObjectId,
      label: String,
    },
    target: {
      kind: { type: String, enum: ["document", "transaction", "asset", "liability", "investment", "dividend"] },
      refId: mongoose.Schema.Types.ObjectId,
      label: String,
    },
    confidence: { type: Number, min: 0, max: 1, default: 0.5 },
    explanation: { type: String, required: true },
    evidence: [String],
    reasons: [String],
    aiSuggested: { type: Boolean, default: true },
    confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    confirmedAt: Date,
    rejectedAt: Date,
    metadata: mongoose.Schema.Types.Mixed,
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

RelationshipSuggestionSchema.index({ ownerId: 1, type: 1, status: 1 });
RelationshipSuggestionSchema.index({ ownerId: 1, status: 1, confidence: -1 });

export default mongoose.models.RelationshipSuggestion ||
  mongoose.model("RelationshipSuggestion", RelationshipSuggestionSchema);
