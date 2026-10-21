// lib/db/models/RecordRelationship.js
// Typed edge between any two financial records (e.g. "document evidences asset",
// "liability secured by property"). Indexed on both endpoints for reliable traversal.
import mongoose from "mongoose";

const ENTITY_TYPES = ["account", "asset", "liability", "transaction", "investment", "document"];

const RecordRelationshipSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sourceType: { type: String, enum: ENTITY_TYPES, required: true },
    sourceId: { type: mongoose.Schema.Types.ObjectId, required: true },
    targetType: { type: String, enum: ENTITY_TYPES, required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    relationshipType: {
      type: String,
      enum: [
        "secures",
        "funds",
        "evidences",
        "generates",
        "repays",
        "linked_to",
        "extracted_from",
        "duplicate_of",
        "transfers_to",
        "held_in",
      ],
      required: true,
    },
    confidence: {
      type: String,
      enum: ["confirmed", "ai_suggested", "pending_review"],
      default: "confirmed",
    },
    confirmedAt: Date,
    confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    notes: String,
  },
  {
    timestamps: true,
    collection: "financialrelationships",
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

RecordRelationshipSchema.index({ ownerId: 1 });
RecordRelationshipSchema.index({ sourceId: 1 });
RecordRelationshipSchema.index({ targetId: 1 });
RecordRelationshipSchema.index({
  ownerId: 1,
  sourceType: 1,
  sourceId: 1,
  targetType: 1,
  targetId: 1,
  relationshipType: 1,
});

export default mongoose.models.RecordRelationship ||
  mongoose.model("RecordRelationship", RecordRelationshipSchema);
