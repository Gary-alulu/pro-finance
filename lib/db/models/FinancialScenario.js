// lib/db/models/FinancialScenario.js
// Saved wealth simulation scenarios.
// Preserves editable assumptions without modifying live financial records.

import mongoose from "mongoose";

const FinancialScenarioSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    timeHorizonYears: {
      type: Number,
      required: true,
      default: 5,
      min: 1,
      max: 40,
    },
    // User assumptions for future projection
    assumptions: {
      monthlyInvestment: { type: Number, default: 3000 },
      annualContributionIncreasePct: { type: Number, default: 0 },
      assumedAnnualReturnPct: { type: Number, default: 8 },
      inflationPct: { type: Number, default: 3 },
      otherAssetGrowthPct: { type: Number, default: 2 },
      debtInterestPct: { type: Number, default: 0 },
      monthlyDebtPayment: { type: Number, default: 0 },
    },
    // Preserved starting snapshot metadata (never mutated upon recalculation)
    baseSnapshot: {
      takenAt: { type: Date, default: Date.now },
      currency: { type: String, default: "KES" },
      recordedCash: { type: mongoose.Schema.Types.Decimal128 },
      recordedInvestments: { type: mongoose.Schema.Types.Decimal128 },
      recordedOtherAssets: { type: mongoose.Schema.Types.Decimal128 },
      recordedLiabilities: { type: mongoose.Schema.Types.Decimal128 },
      recordedNetWorth: { type: mongoose.Schema.Types.Decimal128 },
    },
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        if (ret.baseSnapshot) {
          if (ret.baseSnapshot.recordedCash) ret.baseSnapshot.recordedCash = ret.baseSnapshot.recordedCash.toString();
          if (ret.baseSnapshot.recordedInvestments) ret.baseSnapshot.recordedInvestments = ret.baseSnapshot.recordedInvestments.toString();
          if (ret.baseSnapshot.recordedOtherAssets) ret.baseSnapshot.recordedOtherAssets = ret.baseSnapshot.recordedOtherAssets.toString();
          if (ret.baseSnapshot.recordedLiabilities) ret.baseSnapshot.recordedLiabilities = ret.baseSnapshot.recordedLiabilities.toString();
          if (ret.baseSnapshot.recordedNetWorth) ret.baseSnapshot.recordedNetWorth = ret.baseSnapshot.recordedNetWorth.toString();
        }
        return ret;
      },
    },
  }
);

FinancialScenarioSchema.index({ ownerId: 1, status: 1, updatedAt: -1 });

export default mongoose.models.FinancialScenario ||
  mongoose.model("FinancialScenario", FinancialScenarioSchema);
