// lib/db/models/DocumentExtraction.js
// One AI/manual extraction attempt against a document. A document can have several
// attempts; the latest successful one is mirrored onto Document.extractionResult for reads.
import mongoose from "mongoose";

const DocumentExtractionSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "running", "succeeded", "failed"],
      default: "pending",
    },
    modelUsed: String,
    rawText: String,
    proposedFields: mongoose.Schema.Types.Mixed,
    // 0–1; null means confidence unknown, distinct from a measured 0.
    confidence: Number,
    uncertainFields: [String],
    errorMessage: String,
    extractedAt: Date,
    durationMs: Number,
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

DocumentExtractionSchema.index({ documentId: 1, createdAt: -1 });
DocumentExtractionSchema.index({ ownerId: 1, createdAt: -1 });

export default mongoose.models.DocumentExtraction ||
  mongoose.model("DocumentExtraction", DocumentExtractionSchema);
