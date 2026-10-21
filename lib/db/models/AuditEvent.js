// lib/db/models/AuditEvent.js
// Immutable append-only log of important financial changes.
// Never updated or deleted by application code.
import mongoose from "mongoose";

const AuditEventSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    action: {
      type: String,
      enum: ["create", "update", "delete", "approve", "reject", "export", "login"],
      required: true,
    },
    entityType: {
      type: String,
      enum: [
        "user",
        "account",
        "asset",
        "asset_valuation",
        "liability",
        "transaction",
        "investment",
        "trade",
        "dividend",
        "document",
        "extraction",
        "relationship",
        "snapshot",
        "reminder",
        "settings",
      ],
      required: true,
    },
    entityId: { type: mongoose.Schema.Types.ObjectId, index: true },
    // Sparse summary of the change — before/after values for monetary fields.
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
    summary: { type: String, maxlength: 1000 },
    ip: String,
    userAgent: String,
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
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

// Queries are always owner-scoped and time-ordered.
AuditEventSchema.index({ ownerId: 1, createdAt: -1 });
AuditEventSchema.index({ ownerId: 1, entityType: 1, createdAt: -1 });
AuditEventSchema.index({ ownerId: 1, action: 1, createdAt: -1 });

// Hard block on mutation — this log must stay append-only.
AuditEventSchema.pre(/^insertMany$/, function (next) {
  next();
});

export default mongoose.models.AuditEvent ||
  mongoose.model("AuditEvent", AuditEventSchema);
