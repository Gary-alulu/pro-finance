// app/api/journal/entries/route.js
// GET  /api/journal/entries — list & search journal entries
// POST /api/journal/entries — create new journal entry

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import JournalEntry from "@/lib/db/models/JournalEntry";
import { requireUserId, withErrorHandling, validationError, apiError } from "@/lib/auth/session";
import { createJournalEntrySchema } from "@/lib/validations/schemas";
import mongoose from "mongoose";

async function getHandler(request) {
  const userId = await requireUserId();
  await connectDB();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();
  const category = searchParams.get("category");
  const tag = searchParams.get("tag");
  const status = searchParams.get("status") || "active";
  const followUpOnly = searchParams.get("followUpOnly") === "true";

  const filter = {
    ownerId: userId,
    status: status === "all" ? { $in: ["active", "archived"] } : status,
  };

  if (category && category !== "all") {
    filter.category = category;
  }

  if (tag) {
    filter.tags = tag;
  }

  if (followUpOnly) {
    filter.reviewDate = { $exists: true, $ne: null };
  }

  if (search) {
    const regex = new RegExp(search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), "i");
    filter.$or = [
      { title: regex },
      { contextReasoning: regex },
      { expectedOutcome: regex },
      { tags: regex },
    ];
  }

  const entries = await JournalEntry.find(filter)
    .sort({ decisionDate: -1, createdAt: -1 })
    .lean();

  const formatted = entries.map((e) => ({
    ...e,
    id: e._id.toString(),
    _id: undefined,
    amount: e.amount?.amount ? {
      amount: e.amount.amount.toString(),
      currency: e.amount.currency || "KES",
    } : undefined,
  }));

  return NextResponse.json({ entries: formatted });
}

async function postHandler(request) {
  const userId = await requireUserId();
  await connectDB();

  const body = await request.json().catch(() => ({}));
  const parseResult = createJournalEntrySchema.safeParse(body);

  if (!parseResult.success) {
    return validationError(parseResult);
  }

  const data = parseResult.data;

  const followUpStatus = data.reviewDate ? "pending" : "none";

  const entry = await JournalEntry.create({
    ownerId: userId,
    title: data.title,
    category: data.category,
    decisionDate: data.decisionDate ? new Date(data.decisionDate) : new Date(),
    contextReasoning: data.contextReasoning,
    expectedOutcome: data.expectedOutcome || "",
    risksAssumptions: data.risksAssumptions || "",
    alternativesConsidered: data.alternativesConsidered || "",
    amount: data.amount?.amount
      ? {
          amount: mongoose.Types.Decimal128.fromString(data.amount.amount),
          currency: data.amount.currency || "KES",
        }
      : undefined,
    tags: data.tags || [],
    linkedRecords: data.linkedRecords || [],
    reviewDate: data.reviewDate ? new Date(data.reviewDate) : undefined,
    followUpStatus,
    outcomeLessons: data.outcomeLessons || "",
    status: "active",
  });

  return NextResponse.json({ entry }, { status: 201 });
}

export const GET = withErrorHandling(getHandler);
export const POST = withErrorHandling(postHandler);
