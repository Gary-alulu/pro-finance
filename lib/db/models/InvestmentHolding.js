// lib/db/models/InvestmentHolding.js
import mongoose from "mongoose";

const PriceHistorySchema = new mongoose.Schema(
  {
    price: { type: mongoose.Schema.Types.Decimal128, required: true },
    currency: { type: String, required: true },
    asOf: { type: Date, required: true },
    source: {
      type: String,
      enum: ["manual", "market_feed", "ai_extracted"],
      default: "manual",
    },
  },
  { _id: false }
);

const InvestmentHoldingSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: [
        "listed_equity",
        "bond",
        "etf",
        "mutual_fund",
        "reit",
        "private_equity",
        "crypto",
        "commodity",
        "other",
      ],
      required: true,
    },
    ticker: String,
    exchange: String,
    currency: { type: String, required: true, default: "KES" },
    units: mongoose.Schema.Types.Decimal128,
    costBasis: {
      totalCost: mongoose.Schema.Types.Decimal128,
      currency: String,
      asOf: Date,
    },
    currentPrice: {
      price: mongoose.Schema.Types.Decimal128,
      currency: String,
      asOf: Date,
      source: {
        type: String,
        enum: ["manual", "market_feed", "ai_extracted"],
      },
    },
    priceHistory: [PriceHistorySchema],
    linkedAccountId: { type: mongoose.Schema.Types.ObjectId, ref: "Asset" },
    linkedDocumentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Document" }],
    status: {
      type: String,
      enum: ["active", "closed", "unknown"],
      default: "active",
    },
    notes: String,
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        if (ret.units) ret.units = ret.units.toString();
        if (ret.costBasis?.totalCost)
          ret.costBasis.totalCost = ret.costBasis.totalCost.toString();
        if (ret.currentPrice?.price)
          ret.currentPrice.price = ret.currentPrice.price.toString();
        if (ret.priceHistory) {
          ret.priceHistory = ret.priceHistory.map((p) => ({
            ...p,
            price: p.price?.toString(),
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

InvestmentHoldingSchema.index({ ownerId: 1, status: 1 });

export default mongoose.models.InvestmentHolding ||
  mongoose.model("InvestmentHolding", InvestmentHoldingSchema);
