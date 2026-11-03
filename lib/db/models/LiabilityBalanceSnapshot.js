// lib/db/models/LiabilityBalanceSnapshot.js
// Statement-backed or manual balance reconciliation record for liabilities.
import mongoose from "mongoose";

const LiabilityBalanceSnapshotSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    liabilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Liability",
      required: true,
      index: true,
    },
    balance: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      default: "KES",
    },
    effectiveDate: {
      type: Date,
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: ["statement", "manual", "lender_confirmation"],
      default: "statement",
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        if (ret.balance) ret.balance = ret.balance.toString();
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

LiabilityBalanceSnapshotSchema.index({ ownerId: 1, liabilityId: 1, effectiveDate: -1 });

export default mongoose.models.LiabilityBalanceSnapshot ||
  mongoose.model("LiabilityBalanceSnapshot", LiabilityBalanceSnapshotSchema);
