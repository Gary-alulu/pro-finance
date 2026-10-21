// app/api/documents/[id]/reject/route.js
// POST /api/documents/[id]/reject — reject an extraction proposal. The document
// keeps its file and history; no financial records are created or modified.

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Document from "@/lib/db/models/Document";
import { requireUserId, assertOwnership, withErrorHandling } from "@/lib/auth/session";
import { logAudit, requestMeta } from "@/lib/audit/logAudit";
import { z } from "zod";
import mongoose from "mongoose";
import { readJsonBody } from "@/lib/security/sanitize";

const rejectSchema = z.object({
  reason: z.string().max(1000).optional(),
});

async function postHandler(request, { params }) {
  const userId = await requireUserId();
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid document ID" }, { status: 400 });
  }

  const body = await readJsonBody(request).catch(() => ({}));
  const result = rejectSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid rejection payload" }, { status: 400 });
  }

  await connectDB();
  const doc = await Document.findById(id);
  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  assertOwnership(doc.ownerId, userId);

  const before = { processingStatus: doc.processingStatus };
  doc.processingStatus = "rejected";
  if (result.data.reason) {
    doc.notes = doc.notes
      ? `${doc.notes}\n[Rejected] ${result.data.reason}`
      : `[Rejected] ${result.data.reason}`;
  }
  await doc.save();

  await logAudit(
    userId,
    "update",
    "document",
    doc._id.toString(),
    before,
    { processingStatus: "rejected", reason: result.data.reason || null },
    `Rejected extraction proposal for "${doc.filename}"`,
    requestMeta(request)
  );

  return NextResponse.json({ document: doc.toJSON() });
}

export const POST = withErrorHandling(postHandler);
