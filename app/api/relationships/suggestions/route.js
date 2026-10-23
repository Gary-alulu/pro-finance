// app/api/relationships/suggestions/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import RelationshipSuggestion from "@/lib/db/models/RelationshipSuggestion";
import { requireUserId, withErrorHandling } from "@/lib/auth/session";

async function getHandler(request) {
  const userId = await requireUserId();
  await connectDB();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "suggested";
  const filter = { ownerId: userId };
  if (status !== "all") filter.status = status;
  const items = await RelationshipSuggestion.find(filter).sort({ confidence: -1, createdAt: -1 }).lean();
  return NextResponse.json({ suggestions: items.map(i => ({ ...i, id: i._id.toString() })) });
}

export const GET = withErrorHandling(getHandler);
