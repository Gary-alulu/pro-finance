// lib/db/models/FinancialSnapshot.js
// Point-in-time net worth snapshot (assets − liabilities) with breakdown.
// Collection name kept as "networthsnapshots" for backwards compatibility.
import mongoose from "mongoose";

const FinancialSnapshotSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    takenAt: { type: Date, default: Date.now, required: true },
    totalAssets: { type: mongoose.Schema.Types.Decimal128, required: true },
    totalLiabilities: { type: mongoose.Schema.Types.Decimal128, required: true },
    netWorth: { type: mongoose.Schema.Types.Decimal128, required: true },
    currency: { type: String, required: true, default: "KES" },
    breakdown: {
      byCategory: [
        {
          category: String,
          amount: mongoose.Schema.Types.Decimal128,
          _id: false,
        },
      ],
    },
    isManual: { type: Boolean, default: false },
    note: String,
  },
  {
    timestamps: true,
    collection: "networthsnapshots",
    toJSON: {
      transform: (doc, ret) => {
        if (ret.totalAssets) ret.totalAssets = ret.totalAssets.toString();
        if (ret.totalLiabilities)
          ret.totalLiabilities = ret.totalLiabilities.toString();
        if (ret.netWorth) ret.netWorth = ret.netWorth.toString();
        if (ret.breakdown?.byCategory) {
          ret.breakdown.byCategory = ret.breakdown.byCategory.map((c) => ({
            ...c,
            amount: c.amount?.toString(),
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

FinancialSnapshotSchema.index({ ownerId: 1, takenAt: -1 });

export default mongoose.models.FinancialSnapshot ||
  mongoose.model("FinancialSnapshot", FinancialSnapshotSchema);
