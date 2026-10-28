// lib/db/models/CommandCentreRule.js
// Configurable rule settings and monitoring thresholds for the Command Centre.

import mongoose from "mongoose";

const CommandCentreRuleSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    ruleKey: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: [
        "cashflow_liquidity",
        "invoices_receivables",
        "investments_portfolio",
        "assets_liabilities",
        "data_integrity",
        "goals_accountability",
      ],
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: String,
    enabled: {
      type: Boolean,
      default: true,
    },
    severity: {
      type: String,
      enum: ["critical", "high", "medium", "low"],
      default: "medium",
    },
    thresholds: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

CommandCentreRuleSchema.index({ ownerId: 1, ruleKey: 1 }, { unique: true });

export default mongoose.models.CommandCentreRule ||
  mongoose.model("CommandCentreRule", CommandCentreRuleSchema);
