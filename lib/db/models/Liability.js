// lib/db/models/Liability.js
import mongoose from "mongoose";

const LiabilitySchema = new mongoose.Schema(
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
        "mortgage",
        "car_loan",
        "personal_loan",
        "credit_card",
        "overdraft",
        "business_loan",
        "student_loan",
        "tax_owed",
        "other",
      ],
      required: true,
    },
    currency: { type: String, required: true, default: "KES" },
    principalAmount: mongoose.Schema.Types.Decimal128,
    currentBalance: {
      amount: mongoose.Schema.Types.Decimal128,
      asOf: Date,
      source: {
        type: String,
        enum: ["manual", "ai_extracted", "statement"],
      },
    },
    interestRate: mongoose.Schema.Types.Decimal128, // percentage, e.g. 14.5
    startDate: Date,
    maturityDate: Date,
    lender: String,
    linkedAssetId: { type: mongoose.Schema.Types.ObjectId, ref: "Asset" },
    linkedDocumentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Document" }],
    status: {
      type: String,
      enum: ["active", "settled", "written_off", "unknown"],
      default: "active",
    },
    notes: String,
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        if (ret.principalAmount) ret.principalAmount = ret.principalAmount.toString();
        if (ret.currentBalance?.amount)
          ret.currentBalance.amount = ret.currentBalance.amount.toString();
        if (ret.interestRate) ret.interestRate = ret.interestRate.toString();
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

LiabilitySchema.index({ ownerId: 1, status: 1 });

export default mongoose.models.Liability || mongoose.model("Liability", LiabilitySchema);
