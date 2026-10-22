// lib/db/models/Document.js
import mongoose from "mongoose";

const DocumentSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    storageKey: { type: String, required: true }, // S3/R2 object key — NEVER a public URL
    fileSize: Number, // bytes
    // SHA-256 of the raw file bytes — used for duplicate detection, never exposed as a secret
    // (a hash of user-uploaded private documents is fine to return to the owner).
    fileHash: { type: String, index: true },
    tags: [{ type: String, maxlength: 50 }],
    uploadedAt: { type: Date, default: Date.now },
    documentType: {
      type: String,
      enum: [
        "bank_statement",
        "property_deed",
        "share_certificate",
        "loan_agreement",
        "tax_return",
        "insurance_policy",
        "valuation_report",
        "investment_statement",
        "receipt",
        "contract",
        "identity_document",
        "other",
      ],
      default: "other",
    },
    processingStatus: {
      type: String,
      enum: [
        "pending",
        "extracting",
        "extraction_failed",
        "awaiting_review",
        "approved",
        "rejected",
      ],
      default: "pending",
    },
    extractionResult: {
      extractedAt: Date,
      modelUsed: String,
      rawText: String,
      proposedFields: mongoose.Schema.Types.Mixed,
      confidence: Number,
      uncertainFields: [String],
    },
    // approvedData is only populated after explicit user approval
    approvedData: mongoose.Schema.Types.Mixed,
    approvedAt: Date,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    linkedAssetId: { type: mongoose.Schema.Types.ObjectId, ref: "Asset" },
    linkedLiabilityId: { type: mongoose.Schema.Types.ObjectId, ref: "Liability" },
    linkedTransactionIds: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
    ],
    duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: "Document" },
    notes: String,
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        // Never expose the raw storageKey in client responses — use the download URL endpoint
        delete ret.storageKey;
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

DocumentSchema.index({ ownerId: 1, processingStatus: 1 });
DocumentSchema.index({ ownerId: 1, documentType: 1 });
DocumentSchema.index({ ownerId: 1, fileHash: 1 });
DocumentSchema.index({ ownerId: 1, uploadedAt: -1 });

export default mongoose.models.Document || mongoose.model("Document", DocumentSchema);
