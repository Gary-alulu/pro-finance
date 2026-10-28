// lib/db/models/MonitoringRun.js
// Execution audit log for the Financial Command Centre & Early-Warning System.

import mongoose from "mongoose";

const MonitoringRunSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    runAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    durationMs: {
      type: Number,
      default: 0,
    },
    trigger: {
      type: String,
      enum: ["on_load", "manual", "scheduled", "event_driven"],
      default: "manual",
    },
    counts: {
      critical: { type: Number, default: 0 },
      high: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      low: { type: Number, default: 0 },
      totalActive: { type: Number, default: 0 },
      autoResolved: { type: Number, default: 0 },
      newAlerts: { type: Number, default: 0 },
    },
    healthOverview: mongoose.Schema.Types.Mixed,
    status: {
      type: String,
      enum: ["success", "warning", "error"],
      default: "success",
    },
    note: String,
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

MonitoringRunSchema.index({ ownerId: 1, runAt: -1 });

export default mongoose.models.MonitoringRun ||
  mongoose.model("MonitoringRun", MonitoringRunSchema);
