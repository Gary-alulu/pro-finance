// app/api/documents/[id]/extract/route.js
// POST /api/documents/[id]/extract — retry AI extraction. Creates a new
// DocumentExtraction attempt; on success the proposal is mirrored onto the
// document and status returns to awaiting_review. Never auto-commits records.

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Document from "@/lib/db/models/Document";
import DocumentExtraction from "@/lib/db/models/DocumentExtraction";
import { requireUserId, assertOwnership, withErrorHandling } from "@/lib/auth/session";
import { extractDocumentData } from "@/lib/ai/extractor";
import { buildReconciliationSuggestions } from "@/lib/reconciliation/service";
import { getFile } from "@/lib/storage/storage";
import { logAudit, requestMeta } from "@/lib/audit/logAudit";
import mongoose from "mongoose";

async function postHandler(request, { params }) {
  const userId = await requireUserId();
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid document ID" }, { status: 400 });
  }

  await connectDB();
  const doc = await Document.findById(id);
  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  assertOwnership(doc.ownerId, userId);

  const extractionRecord = await DocumentExtraction.create({
    ownerId: new mongoose.Types.ObjectId(userId),
    documentId: doc._id,
    status: "running",
  });

  const startedAt = Date.now();
  let extraction = null;
  try {
    let buffer = null;
    if (doc.storageKey) {
      try {
        buffer = await getFile(doc.storageKey);
      } catch (err) {
        console.warn("Could not read stored file for re-extraction:", err.message);
      }
    }

    extraction = await extractDocumentData({
      filename: doc.filename,
      mimeType: doc.mimeType,
      bufferText: doc.extractionResult?.rawText || "",
      buffer,
      notes: doc.notes,
    });
    extractionRecord.status = "succeeded";
    extractionRecord.modelUsed = extraction.modelUsed;
    extractionRecord.proposedFields = extraction.proposedFields;
    extractionRecord.confidence = extraction.confidence;
    extractionRecord.uncertainFields = extraction.uncertainFields;
    extractionRecord.extractedAt = extraction.extractedAt;

    doc.extractionResult = {
      extractedAt: extraction.extractedAt,
      modelUsed: extraction.modelUsed,
      proposedFields: extraction.proposedFields,
      confidence: extraction.confidence,
      uncertainFields: extraction.uncertainFields,
    };
    doc.processingStatus = "awaiting_review";
  } catch (err) {
    extractionRecord.status = "failed";
    extractionRecord.errorMessage = String(err?.message || err).slice(0, 1000);
    doc.processingStatus = "extraction_failed";
  }
  extractionRecord.durationMs = Date.now() - startedAt;
  await extractionRecord.save();
  await doc.save();

  let reconciliation = null;
  if (extraction) {
    try {
      reconciliation = await buildReconciliationSuggestions({ userId, doc });
    } catch (err) {
      console.warn("Reconciliation suggestion generation failed:", err.message);
    }
  }

  await logAudit(
    userId,
    "update",
    "document",
    doc._id.toString(),
    { processingStatus: "extracting" },
    { processingStatus: doc.processingStatus, extractionStatus: extractionRecord.status },
    `Re-ran extraction for "${doc.filename}"`,
    requestMeta(request)
  );

  return NextResponse.json({
    extraction: {
      id: extractionRecord._id.toString(),
      status: extractionRecord.status,
      confidence: extractionRecord.confidence,
      proposedFields: extractionRecord.proposedFields,
      uncertainFields: extractionRecord.uncertainFields,
      errorMessage: extractionRecord.errorMessage,
    },
    document: doc.toJSON(),
    reconciliation,
  });
}

export const POST = withErrorHandling(postHandler);
