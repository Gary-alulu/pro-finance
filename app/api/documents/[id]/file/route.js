// app/api/documents/[id]/file/route.js
// GET /api/documents/[id]/file — securely stream private document file bytes to authenticated owner

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Document from "@/lib/db/models/Document";
import { requireUserId, assertOwnership, withErrorHandling } from "@/lib/auth/session";
import { getFile } from "@/lib/storage/storage";
import mongoose from "mongoose";

async function getHandler(request, { params }) {
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

  if (!doc.storageKey) {
    return NextResponse.json({ error: "No file associated with this document" }, { status: 404 });
  }

  try {
    const fileBuffer = await getFile(doc.storageKey);
    // M-10: header-injection-safe Content-Disposition — ASCII fallback plus
    // RFC 5987 encoded original filename; always nosniff.
    const rawName = String(doc.filename || "file");
    const asciiName = rawName.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
    const encodedName = encodeURIComponent(rawName).replace(
      /['()*]/g,
      (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase()
    );
    return new Response(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": doc.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${asciiName}"; filename*=UTF-8''${encodedName}`,
        "Content-Length": fileBuffer.length.toString(),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Could not read file from storage" }, { status: 500 });
  }
}

export const GET = withErrorHandling(getHandler);
