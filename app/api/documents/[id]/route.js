// app/api/documents/[id]/route.js
// GET /api/documents/[id] — fetch single document
// DELETE /api/documents/[id] — delete document and private storage file

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Document from "@/lib/db/models/Document";
import { requireUserId, assertOwnership, withErrorHandling } from "@/lib/auth/session";
import { deleteFile } from "@/lib/storage/storage";
import mongoose from "mongoose";

async function getHandler(request, { params }) {
  const userId = await requireUserId();
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid document ID" }, { status: 400 });
  }

  await connectDB();
  const doc = await Document.findById(id).lean();

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  assertOwnership(doc.ownerId, userId);

  const { storageKey, ...safeDoc } = doc;
  return NextResponse.json({
    document: {
      ...safeDoc,
      id: doc._id.toString(),
    },
  });
}

async function deleteHandler(request, { params }) {
  const userId = await requireUserId();
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid document ID" }, { status: 400 });
  }

  await connectDB();
  const doc = await Document.findById(id);

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  assertOwnership(doc.ownerId, userId);

  if (doc.storageKey) {
    await deleteFile(doc.storageKey);
  }

  await Document.findByIdAndDelete(id);

  return NextResponse.json({ success: true, deletedId: id });
}

export const GET = withErrorHandling(getHandler);
export const DELETE = withErrorHandling(deleteHandler);
