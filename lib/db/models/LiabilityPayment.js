// lib/db/models/LiabilityPayment.js
// Standalone liability repayment record.
// Stores atomic principal/interest/fee/penalty splits and links to payments or documents.
import mongoose from "mongoose";

const LiabilityPaymentSchema = new mongoose.Schema(
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
    paymentDate: {
      type: Date,
      required: true,
      index: true,
    },
    totalAmount: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
    },
    principalAmount: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
    },
    interestAmount: {
      type: mongoose.Schema.Types.Decimal128,
      default: 0,
    },
    feeAmount: {
      type: mongoose.Schema.Types.Decimal128,
      default: 0,
    },
    penaltyAmount: {
      type: mongoose.Schema.Types.Decimal128,
      default: 0,
    },
    currency: {
      type: String,
      required: true,
      default: "KES",
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
    },
    reference: {
      type: String,
      trim: true,
    },
    paymentMethod: {
      type: String,
      enum: ["bank_transfer", "mpesa", "cash", "standing_order", "cheque", "other"],
      default: "bank_transfer",
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
        if (ret.totalAmount) ret.totalAmount = ret.totalAmount.toString();
        if (ret.principalAmount) ret.principalAmount = ret.principalAmount.toString();
        if (ret.interestAmount) ret.interestAmount = ret.interestAmount.toString();
        if (ret.feeAmount) ret.feeAmount = ret.feeAmount.toString();
        if (ret.penaltyAmount) ret.penaltyAmount = ret.penaltyAmount.toString();
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

LiabilityPaymentSchema.index({ ownerId: 1, liabilityId: 1, paymentDate: -1 });

export default mongoose.models.LiabilityPayment ||
  mongoose.model("LiabilityPayment", LiabilityPaymentSchema);
