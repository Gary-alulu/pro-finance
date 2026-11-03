// lib/db/models/AssetValuation.js
// Standalone valuation record — the auditable history of what an asset was worth, when.
// Kept in addition to the denormalised Asset.valuationHistory embed so valuations are
// independently queryable (e.g. trend charts, audits, imports).
import mongoose from "mongoose";

const AssetValuationSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
      index: true,
    },
    amount: { type: mongoose.Schema.Types.Decimal128, required: true },
    currency: { type: String, required: true, default: "KES" },
    asOf: { type: Date, required: true },
    valuationDate: { type: Date },
    source: {
      type: String,
      enum: ["manual", "ai_extracted", "market_feed", "imported", "statement"],
      default: "manual",
    },
    method: {
      type: String,
      enum: [
        "purchase_price",
        "market_price",
        "appraisal",
        "statement",
        "owner_estimate",
        "depreciated_cost",
        "other",
      ],
      default: "owner_estimate",
    },
    confidence: {
      type: String,
      enum: ["verified", "recorded", "estimated", "pending_review"],
      default: "recorded",
    },
    status: {
      type: String,
      enum: ["approved", "pending_review", "superseded"],
      default: "approved",
    },
    supersedesValuationId: { type: mongoose.Schema.Types.ObjectId, ref: "AssetValuation" },
    note: String,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: Date,
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: "Document" },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        if (ret.amount) ret.amount = ret.amount.toString();
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

AssetValuationSchema.index({ assetId: 1, asOf: -1 });
AssetValuationSchema.index({ ownerId: 1, asOf: -1 });

export default mongoose.models.AssetValuation ||
  mongoose.model("AssetValuation", AssetValuationSchema);
