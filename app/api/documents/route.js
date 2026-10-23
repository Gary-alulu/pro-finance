// app/api/documents/route.js
// GET  /api/documents — list documents; supports q (search), status, type, tag filters
// POST /api/documents — upload: validates type/size/magic bytes, hashes file,
//   detects duplicates (409 unless allowDuplicate), saves privately, runs AI
//   extraction into an awaiting-review proposal (never auto-commits to records).

import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { connectDB } from "@/lib/db/mongoose";
import Document from "@/lib/db/models/Document";
import DocumentExtraction from "@/lib/db/models/DocumentExtraction";
import { requireUserId, withErrorHandling } from "@/lib/auth/session";
import { saveFile } from "@/lib/storage/storage";
import { extractDocumentData } from "@/lib/ai/extractor";
import { buildReconciliationSuggestions } from "@/lib/reconciliation/service";
import { logAudit, requestMeta } from "@/lib/audit/logAudit";
import mongoose from "mongoose";

const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB
const ALLOWED_TYPES = {
  "application/pdf": [Buffer.from("%PDF-")],
  "image/jpeg": [Buffer.from([0xff, 0xd8, 0xff])],
  "image/png": [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
  "image/webp": null, // special-cased: RIFF....WEBP
};

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sniffMime(buffer, declared) {
  if (declared === "application/pdf" || buffer.subarray(0, 5).toString("latin1") === "%PDF-") {
    return buffer.subarray(0, 5).toString("latin1") === "%PDF-" ? "application/pdf" : null;
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    buffer.subarray(0, 4).toString("latin1") === "RIFF" &&
    buffer.subarray(8, 12).toString("latin1") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

async function getHandler(request) {
  const userId = await requireUserId();
  await connectDB();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const documentType = searchParams.get("type");
  const tag = searchParams.get("tag");
  const q = searchParams.get("q");

  const filter = { ownerId: userId };
  if (status && status !== "all") filter.processingStatus = status;
  if (documentType && documentType !== "all") filter.documentType = documentType;
  if (tag && tag !== "all") filter.tags = tag;
  if (q && q.trim()) {
    const rx = new RegExp(escapeRegex(q.trim()), "i");
    filter.$or = [{ filename: rx }, { notes: rx }, { tags: rx }, { documentType: rx }];
  }

  const documents = await Document.find(filter)
    .select("-storageKey -extractionResult.rawText")
    .sort({ uploadedAt: -1 })
    .limit(500)
    .lean();

  return NextResponse.json({
    documents: documents.map((doc) => ({
      ...doc,
      id: doc._id.toString(),
    })),
  });
}

async function postHandler(request) {
  const userId = await requireUserId();
  await connectDB();

  const formData = await request.formData();
  const file = formData.get("file");
  const notes = formData.get("notes") || "";
  const allowDuplicate = formData.get("allowDuplicate") === "true";

  let tags = [];
  try {
    const parsedTags = JSON.parse(formData.get("tags") || "[]");
    if (Array.isArray(parsedTags)) tags = parsedTags.map(String).slice(0, 20);
  } catch {
    tags = [];
  }

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  const filename = file.name || "document";
  const declaredType = file.type || "application/octet-stream";
  const fileSize = file.size;

  if (fileSize > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File exceeds the 50 MB limit" }, { status: 413 });
  }
  if (!ALLOWED_TYPES[declaredType]) {
    return NextResponse.json(
      { error: `Unsupported file type "${declaredType}". Allowed: PDF, JPEG, PNG, WebP` },
      { status: 415 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Magic-byte sniffing — never trust the client-declared MIME type.
  const sniffed = sniffMime(buffer, declaredType);
  if (!sniffed || sniffed !== declaredType) {
    return NextResponse.json(
      { error: "File content does not match its declared type" },
      { status: 415 }
    );
  }

  // Duplicate detection via SHA-256 — never silently replace an existing file.
  const fileHash = createHash("sha256").update(buffer).digest("hex");
  const existing = await Document.findOne({ ownerId: userId, fileHash }).lean();
  if (existing && !allowDuplicate) {
    return NextResponse.json(
      {
        error: "An identical file already exists in your library",
        duplicateOf: existing._id.toString(),
        existingDocument: {
          id: existing._id.toString(),
          filename: existing.filename,
          uploadedAt: existing.uploadedAt,
        },
      },
      { status: 409 }
    );
  }

  const docId = new mongoose.Types.ObjectId();
  const storageKey = await saveFile(userId, docId.toString(), filename, buffer);

  // Build a bounded text preview for extraction (text-like payloads only).
  let bufferTextPreview = "";
  if (/^text\//.test(sniffed) || sniffed === "application/json") {
    bufferTextPreview = buffer.toString("utf-8").slice(0, 4000);
  }

  // Extraction lifecycle: record an attempt, never trust it to commit records.
  const extractionRecord = await DocumentExtraction.create({
    ownerId: new mongoose.Types.ObjectId(userId),
    documentId: docId,
    status: "running",
  });

  let extraction;
  const startedAt = Date.now();
  try {
    extraction = await extractDocumentData({
      filename,
      mimeType: sniffed,
      bufferText: bufferTextPreview,
      buffer,
      notes,
    });
    extractionRecord.status = "succeeded";
    extractionRecord.modelUsed = extraction.modelUsed;
    extractionRecord.rawText = bufferTextPreview || undefined;
    extractionRecord.proposedFields = extraction.proposedFields;
    extractionRecord.confidence = extraction.confidence;
    extractionRecord.uncertainFields = extraction.uncertainFields;
    extractionRecord.extractedAt = extraction.extractedAt;
  } catch (err) {
    extraction = null;
    extractionRecord.status = "failed";
    extractionRecord.errorMessage = String(err?.message || err).slice(0, 1000);
  }
  extractionRecord.durationMs = Date.now() - startedAt;
  await extractionRecord.save();

  const proposedDocType = extraction?.proposedFields?.documentType;
  const documentType =
    proposedDocType && proposedDocType !== "other" ? proposedDocType : "other";

  const newDoc = await Document.create({
    _id: docId,
    ownerId: new mongoose.Types.ObjectId(userId),
    filename,
    mimeType: sniffed,
    storageKey,
    fileSize,
    fileHash,
    tags,
    uploadedAt: new Date(),
    documentType,
    processingStatus: extraction ? "awaiting_review" : "extraction_failed",
    extractionResult: extraction
      ? { ...extraction, rawText: bufferTextPreview || undefined }
      : undefined,
    duplicateOf: existing ? existing._id : undefined,
    notes,
  });

  let reconciliation = null;
  if (extraction) {
    try {
      reconciliation = await buildReconciliationSuggestions({ userId, doc: newDoc });
    } catch (err) {
      console.warn("Reconciliation suggestion generation failed:", err.message);
    }
  }

  await logAudit(
    userId,
    "create",
    "document",
    newDoc._id.toString(),
    null,
    { filename, documentType, fileHash },
    `Uploaded document "${filename}"${existing ? " (linked as duplicate)" : ""}`,
    requestMeta(request)
  );

  return NextResponse.json(
    {
      document: {
        ...newDoc.toJSON(),
        id: newDoc._id.toString(),
      },
      extraction: {
        id: extractionRecord._id.toString(),
        status: extractionRecord.status,
      },
      reconciliation,
    },
    { status: 201 }
  );
}

export const GET = withErrorHandling(getHandler);
export const POST = withErrorHandling(postHandler);
