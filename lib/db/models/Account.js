// lib/db/models/Account.js
// Financial account (bank, brokerage, wallet) that groups holdings, transactions and documents.
import mongoose from "mongoose";

const AccountSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    institution: { type: String, trim: true },
    accountNumberMasked: { type: String, trim: true }, // e.g. "••••4321" — never store full numbers
    type: {
      type: String,
      enum: [
        "bank_checking",
        "bank_savings",
        "brokerage",
        "retirement",
        "crypto_exchange",
        "mobile_money",
        "cash",
        "other",
      ],
      required: true,
    },
    currency: { type: String, required: true, default: "KES" },
    // Balance is optional: absent means "not yet recorded" (distinct from a genuine 0).
    currentBalance: { type: mongoose.Schema.Types.Decimal128 },
    balanceAsOf: Date,
    status: {
      type: String,
      enum: ["active", "closed", "unknown"],
      default: "active",
    },
    linkedAssetId: { type: mongoose.Schema.Types.ObjectId, ref: "Asset" },
    linkedDocumentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Document" }],
    notes: String,
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        if (ret.currentBalance != null) ret.currentBalance = ret.currentBalance.toString();
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

AccountSchema.index({ ownerId: 1, status: 1 });
AccountSchema.index({ ownerId: 1, type: 1 });
AccountSchema.index({ ownerId: 1, createdAt: -1 });

export default mongoose.models.Account || mongoose.model("Account", AccountSchema);
