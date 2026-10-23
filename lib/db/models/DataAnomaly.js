// lib/db/models/DataAnomaly.js
import mongoose from "mongoose";

const DataAnomalySchema = new mongoose.Schema(
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
        "stale_valuation",
        "conflicting_balance",
        "duplicate_document",
        "duplicate_holding",
        "missing_supporting_evidence",
        "unusual_amount",
        "unexpected_change",
        "missing_price",
        "stale_valuation_date",
        "reconciliation_gap",
        "other",
      ],
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ["info", "low", "medium", "high", "critical"],
      default: "medium",
      index: true,
    },
    impact: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["open", "investigating", "resolved", "dismissed"],
      default: "open",
      index: true,
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    explanation: String,
    entity: {
      kind: { type: String, enum: ["asset", "liability", "investment", "transaction", "document", "account"] },
      refId: mongoose.Schema.Types.ObjectId,
      label: String,
    },
    relatedEntities: [
      {
        kind: { type: String, enum: ["asset", "liability", "investment", "transaction", "document", "account"] },
        refId: mongoose.Schema.Types.ObjectId,
        label: String,
      },
    ],
    evidence: [String],
    suggestedAction: String,
    priorityScore: { type: Number, default: 0 },
    ruleBased: { type: Boolean, default: true },
    aiDetected: { type: Boolean, default: false },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    resolvedAt: Date,
    resolutionNote: String,
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

DataAnomalySchema.index({ ownerId: 1, status: 1, severity: 1, priorityScore: -1 });
DataAnomalySchema.index({ ownerId: 1, type: 1, status: 1 });

export default mongoose.models.DataAnomaly ||
  mongoose.model("DataAnomaly", DataAnomalySchema);
