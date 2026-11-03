// lib/db/models/Asset.js
import mongoose from "mongoose";

const ValuationHistorySchema = new mongoose.Schema(
  {
    amount: { type: mongoose.Schema.Types.Decimal128, required: true },
    currency: { type: String, required: true, default: "KES" },
    asOf: { type: Date, required: true },
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
    note: String,
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: "Document" },
  },
  { _id: false }
);

const CurrentValueSchema = new mongoose.Schema(
  {
    amount: { type: mongoose.Schema.Types.Decimal128 },
    asOf: Date,
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
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: Date,
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: "Document" },
  },
  { _id: false }
);

const AssetSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: [
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
        "equipment",
        "electronics",
        "other",
      ],
      required: true,
    },
    subCategory: String,
    description: String,
    currency: { type: String, required: true, default: "KES" },
    ownershipType: {
      type: String,
      enum: ["sole", "joint", "partial", "business", "other"],
      default: "sole",
    },
    ownershipPercentage: { type: Number, default: 100, min: 0, max: 100 },
    acquisitionDate: Date,
    acquisitionCost: {
      amount: mongoose.Schema.Types.Decimal128,
      currency: { type: String, default: "KES" },
    },
    valuationMethod: {
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
    currentValue: CurrentValueSchema,
    valuationHistory: [ValuationHistorySchema],
    status: {
      type: String,
      enum: ["active", "pending_acquisition", "disposed", "written_off", "archived", "sold", "transferred", "unknown"],
      default: "active",
    },
    disposalDate: Date,
    disposalProceeds: mongoose.Schema.Types.Decimal128,
    location: String,
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    tags: [String],
    linkedDocumentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Document" }],
    notes: String,
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        // Serialize Decimal128 fields to string to avoid $numberDecimal objects
        if (ret.currentValue?.amount) {
          ret.currentValue.amount = ret.currentValue.amount.toString();
        }
        if (ret.acquisitionCost?.amount) {
          ret.acquisitionCost.amount = ret.acquisitionCost.amount.toString();
        }
        if (ret.disposalProceeds) {
          ret.disposalProceeds = ret.disposalProceeds.toString();
        }
        if (ret.valuationHistory) {
          ret.valuationHistory = ret.valuationHistory.map((v) => ({
            ...v,
            amount: v.amount?.toString(),
          }));
        }
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

AssetSchema.index({ ownerId: 1, status: 1 });
AssetSchema.index({ ownerId: 1, category: 1 });
AssetSchema.index({ ownerId: 1, createdAt: -1 });

export default mongoose.models.Asset || mongoose.model("Asset", AssetSchema);
