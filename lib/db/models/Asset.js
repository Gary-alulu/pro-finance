// lib/db/models/Asset.js
import mongoose from "mongoose";

const ValuationHistorySchema = new mongoose.Schema(
  {
    amount: { type: mongoose.Schema.Types.Decimal128, required: true },
    currency: { type: String, required: true },
    asOf: { type: Date, required: true },
    source: {
      type: String,
      enum: ["manual", "ai_extracted", "market_feed", "imported"],
      default: "manual",
    },
    note: String,
  },
  { _id: false }
);

const CurrentValueSchema = new mongoose.Schema(
  {
    amount: { type: mongoose.Schema.Types.Decimal128 },
    asOf: Date,
    source: {
      type: String,
      enum: ["manual", "ai_extracted", "market_feed", "imported"],
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: Date,
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
        "other",
      ],
      required: true,
    },
    subCategory: String,
    description: String,
    currency: { type: String, required: true, default: "KES" },
    currentValue: CurrentValueSchema,
    valuationHistory: [ValuationHistorySchema],
    status: {
      type: String,
      enum: ["active", "sold", "transferred", "unknown"],
      default: "active",
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

export default mongoose.models.Asset || mongoose.model("Asset", AssetSchema);
