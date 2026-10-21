// lib/db/models/Transaction.js
import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: { type: Date, required: true },
    description: { type: String, trim: true },
    amount: { type: mongoose.Schema.Types.Decimal128, required: true },
    currency: { type: String, required: true, default: "KES" },
    direction: {
      type: String,
      enum: ["inflow", "outflow", "transfer", "unknown"],
      required: true,
    },
    category: {
      type: String,
      enum: [
        "income",
        "expense",
        "investment_purchase",
        "investment_sale",
        "loan_repayment",
        "asset_purchase",
        "asset_sale",
        "dividend",
        "interest",
        "fee",
        "tax",
        "transfer",
        "other",
      ],
      default: "other",
    },
    linkedAssetId: { type: mongoose.Schema.Types.ObjectId, ref: "Asset" },
    linkedLiabilityId: { type: mongoose.Schema.Types.ObjectId, ref: "Liability" },
    linkedInvestmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InvestmentHolding",
    },
    linkedDocumentId: { type: mongoose.Schema.Types.ObjectId, ref: "Document" },
    evidenceStatus: {
      type: String,
      enum: ["supported", "missing", "pending_review"],
      default: "missing",
    },
    approvalStatus: {
      type: String,
      enum: ["approved", "pending", "rejected"],
      default: "pending",
    },
    tags: [String],
    notes: String,
    isRecurring: { type: Boolean, default: false },
    recurringGroupId: mongoose.Schema.Types.ObjectId,
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

TransactionSchema.index({ ownerId: 1, date: -1 });
TransactionSchema.index({ ownerId: 1, category: 1 });
TransactionSchema.index({ ownerId: 1, evidenceStatus: 1 });

export default mongoose.models.Transaction ||
  mongoose.model("Transaction", TransactionSchema);
