// lib/db/models/InvestmentTrade.js
// Buy/sell event for an investment holding. Links to the cash Transaction that funded it.
import mongoose from "mongoose";

const InvestmentTradeSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    holdingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InvestmentHolding",
      required: true,
      index: true,
    },
    side: { type: String, enum: ["buy", "sell"], required: true },
    tradedAt: { type: Date, required: true },
    units: { type: mongoose.Schema.Types.Decimal128, required: true },
    pricePerUnit: { type: mongoose.Schema.Types.Decimal128, required: true },
    // Gross = units × pricePerUnit; fees/taxes recorded separately so net cash can differ.
    grossAmount: { type: mongoose.Schema.Types.Decimal128, required: true },
    fees: { type: mongoose.Schema.Types.Decimal128 },
    taxes: { type: mongoose.Schema.Types.Decimal128 },
    currency: { type: String, required: true, default: "KES" },
    linkedTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: "Document" },
    notes: String,
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        for (const k of ["units", "pricePerUnit", "grossAmount", "fees", "taxes"]) {
          if (ret[k] != null) ret[k] = ret[k].toString();
        }
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

InvestmentTradeSchema.index({ holdingId: 1, tradedAt: -1 });
InvestmentTradeSchema.index({ ownerId: 1, tradedAt: -1 });

export default mongoose.models.InvestmentTrade ||
  mongoose.model("InvestmentTrade", InvestmentTradeSchema);
