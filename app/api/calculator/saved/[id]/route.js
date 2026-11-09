// app/api/calculator/saved/[id]/route.js
// GET    /api/calculator/saved/[id] — retrieve specific saved calculation
// PATCH  /api/calculator/saved/[id] — update title, notes, tags, or bookmark state
// DELETE /api/calculator/saved/[id] — delete calculation

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Calculation from "@/lib/db/models/Calculation";
import { requireUserId, withErrorHandling, validationError } from "@/lib/auth/session";
import { updateSavedCalculationSchema } from "@/lib/validations/schemas";
import { readJsonBody } from "@/lib/security/sanitize";

async function getHandler(request, { params }) {
  const userId = await requireUserId();
  const { id } = await params;
  await connectDB();

  const doc = await Calculation.findOne({ _id: id, ownerId: userId }).lean();
  if (!doc) {
    return Response.json({ error: "Calculation not found" }, { status: 404 });
  }

  return NextResponse.json({
    calculation: {
      ...doc,
      id: doc._id.toString(),
      _id: undefined,
    },
  });
}

async function patchHandler(request, { params }) {
  const userId = await requireUserId();
  const { id } = await params;
  const body = await readJsonBody(request);
  const parsed = updateSavedCalculationSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(parsed);
  }

  await connectDB();

  const doc = await Calculation.findOne({ _id: id, ownerId: userId });
  if (!doc) {
    return Response.json({ error: "Calculation not found" }, { status: 404 });
  }

  if (parsed.data.title !== undefined) doc.title = parsed.data.title;
  if (parsed.data.notes !== undefined) doc.notes = parsed.data.notes;
  if (parsed.data.tags !== undefined) doc.tags = parsed.data.tags;
  if (parsed.data.isSaved !== undefined) doc.isSaved = parsed.data.isSaved;

  await doc.save();

  return NextResponse.json({
    success: true,
    calculation: {
      ...doc.toObject(),
      id: doc._id.toString(),
    },
  });
}

async function deleteHandler(request, { params }) {
  const userId = await requireUserId();
  const { id } = await params;
  await connectDB();

  const result = await Calculation.deleteOne({ _id: id, ownerId: userId });
  if (result.deletedCount === 0) {
    return Response.json({ error: "Calculation not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export const GET = withErrorHandling(getHandler);
export const PATCH = withErrorHandling(patchHandler);
export const DELETE = withErrorHandling(deleteHandler);

