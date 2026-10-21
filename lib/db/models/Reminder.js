// lib/db/models/Reminder.js
// Scheduled follow-up (review a valuation, renew a policy, file a return).
import mongoose from "mongoose";

const ReminderSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Stable dedupe key for auto-generated reminders (e.g. "liability-maturity:<id>")
    key: { type: String, index: true },
    // "auto" = generated from record dates during an integrity scan; "manual" = user-created
    source: { type: String, enum: ["manual", "auto"], default: "manual" },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, maxlength: 2000 },
    dueAt: { type: Date, required: true },
    priority: {
      type: String,
      enum: ["low", "normal", "high"],
      default: "normal",
    },
    status: {
      type: String,
      enum: ["open", "snoozed", "done", "cancelled"],
      default: "open",
    },
    entityType: {
      type: String,
      enum: ["asset", "liability", "transaction", "investment", "document", "account", "none"],
      default: "none",
    },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    completedAt: Date,
    snoozedUntil: Date,
    notes: String,
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

ReminderSchema.index({ ownerId: 1, status: 1, dueAt: 1 });
ReminderSchema.index({ ownerId: 1, dueAt: 1 });

export default mongoose.models.Reminder || mongoose.model("Reminder", ReminderSchema);
