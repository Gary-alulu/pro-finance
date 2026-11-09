// lib/db/models/CalculationScenario.js
// Model for saved scenario comparisons (e.g. loan strategies, savings horizons, investment projections).

import mongoose from "mongoose";

export const SCENARIO_TYPES = [
  "loan_comparison",
  "savings_comparison",
  "investment_growth",
  "budget_comparison",
];

const SourceReferenceSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      enum: ["asset", "liability", "investment", "account", "invoice", "goal"],
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    title: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const CalculationScenarioSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    scenarioType: {
      type: String,
      enum: SCENARIO_TYPES,
      required: true,
      index: true,
    },
    baselineInputs: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    alternativeInputs: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    results: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    assumptions: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    sourceReferences: {
      type: [SourceReferenceSchema],
      default: [],
    },
    formulaVersion: {
      type: String,
      default: "1.0.0",
    },
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

CalculationScenarioSchema.index({ ownerId: 1, scenarioType: 1, createdAt: -1 });

export default mongoose.models.CalculationScenario ||
  mongoose.model("CalculationScenario", CalculationScenarioSchema);

