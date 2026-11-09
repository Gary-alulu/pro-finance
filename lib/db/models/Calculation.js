// lib/db/models/Calculation.js
// Calculation model for the Financial Calculator & Planning Engine.
// Records both standalone and platform-connected calculations with reproducible inputs,
// outputs, formula versions, and action conversion trails.

import mongoose from "mongoose";

export const CALCULATOR_TYPES = [
  "basic",
  "percentage",
  "currency",
  "savings",
  "compound_interest",
  "loan",
  "investment",
  "net_worth",
  "budget",
  "depreciation",
  "invoice",
];

const SourceReferenceSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      enum: ["asset", "liability", "investment", "account", "invoice", "goal", "transaction"],
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

const ActionRecordSchema = new mongoose.Schema(
  {
    actionType: {
      type: String,
      enum: [
        "propose_valuation",
        "save_repayment_plan",
        "create_commitment",
        "create_simulator_scenario",
        "create_goal",
        "populate_invoice_draft",
        "attach_journal_decision",
      ],
      required: true,
    },
    targetModule: {
      type: String,
      required: true,
    },
    targetRecordId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    committedAt: {
      type: Date,
      default: Date.now,
    },
    summary: {
      type: String,
      maxlength: 500,
    },
  },
  { _id: false }
);

const CalculationSchema = new mongoose.Schema(
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
    calculatorType: {
      type: String,
      enum: CALCULATOR_TYPES,
      required: true,
      index: true,
    },
    mode: {
      type: String,
      enum: ["standalone", "platform_connected"],
      default: "standalone",
      index: true,
    },
    inputs: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    outputs: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    currency: {
      type: String,
      default: "KES",
      trim: true,
      uppercase: true,
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
    engineVersion: {
      type: String,
      default: "1.0.0",
    },
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
      index: true,
    },
    isSaved: {
      type: Boolean,
      default: false,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    actionHistory: {
      type: [ActionRecordSchema],
      default: [],
    },
    lastActionAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

CalculationSchema.index({ ownerId: 1, isSaved: 1, createdAt: -1 });
CalculationSchema.index({ ownerId: 1, calculatorType: 1, createdAt: -1 });

export default mongoose.models.Calculation ||
  mongoose.model("Calculation", CalculationSchema);

