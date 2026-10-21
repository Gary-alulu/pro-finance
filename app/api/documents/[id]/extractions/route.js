// app/api/documents/[id]/extractions/route.js
// GET /api/documents/[id]/extractions — full extraction-attempt history for a document.

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Document from "@/lib/db/models/Document";
import DocumentExtraction from "@/lib/db/models/DocumentExtraction";
import { requireUserId, assertOwnership, withErrorHandling } from "@/lib/auth/session";
import mongoose from "mongoose";

async function getHandler(request, { params }) {
  const userId = await requireUserId();
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid document ID" }, { status: 400 });
  }

  await connectDB();
  const doc = await Document.findById(id).lean();
  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  assertOwnership(doc.ownerId, userId);

  const extractions = await DocumentExtraction.find({ ownerId: userId, documentId: id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return NextResponse.json({
    extractions: extractions.map((e) => {
      const { _id, __v, ...rest } = e;
      return { ...rest, id: _id.toString() };
    }),
  });
}

export const GET = withErrorHandling(getHandler);
