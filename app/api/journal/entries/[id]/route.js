// app/api/journal/entries/[id]/route.js
// GET    /api/journal/entries/[id] — get single entry
// PATCH  /api/journal/entries/[id] — update entry with audit history preservation
// DELETE /api/journal/entries/[id] — archive entry

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import JournalEntry from "@/lib/db/models/JournalEntry";
import { requireUserId, withErrorHandling, apiError, validationError } from "@/lib/auth/session";
import { updateJournalEntrySchema } from "@/lib/validations/schemas";
import mongoose from "mongoose";

async function getHandler(request, { params }) {
  const userId = await requireUserId();
  await connectDB();
  const { id } = await params;

  const entry = await JournalEntry.findOne({
    _id: id,
    ownerId: userId,
  }).lean();

  if (!entry) {
    return apiError("Journal entry not found", 404);
  }

  const formatted = {
    ...entry,
    id: entry._id.toString(),
    _id: undefined,
    amount: entry.amount?.amount
      ? {
          amount: entry.amount.amount.toString(),
          currency: entry.amount.currency || "KES",
        }
      : undefined,
  };

  return NextResponse.json({ entry: formatted });
}

async function patchHandler(request, { params }) {
  const userId = await requireUserId();
  await connectDB();
  const { id } = await params;

  const body = await request.json().catch(() => ({}));
  const parseResult = updateJournalEntrySchema.safeParse(body);

  if (!parseResult.success) {
    return validationError(parseResult);
  }

  const data = parseResult.data;
  const entry = await JournalEntry.findOne({
    _id: id,
    ownerId: userId,
  });

  if (!entry) {
    return apiError("Journal entry not found", 404);
  }

  // Check if core reasoning fields are modified to preserve edit history
  const isCoreModified =
    (data.title !== undefined && data.title !== entry.title) ||
    (data.contextReasoning !== undefined && data.contextReasoning !== entry.contextReasoning) ||
    (data.expectedOutcome !== undefined && data.expectedOutcome !== entry.expectedOutcome);

  if (isCoreModified) {
    entry.editHistory.push({
      editedAt: new Date(),
      reason: data.reasonForEdit || "Updated decision reasoning or outcome target",
      previousState: {
        title: entry.title,
        contextReasoning: entry.contextReasoning,
        expectedOutcome: entry.expectedOutcome,
        risksAssumptions: entry.risksAssumptions,
      },
    });
  }

  // Apply updates
  if (data.title !== undefined) entry.title = data.title;
  if (data.category !== undefined) entry.category = data.category;
  if (data.decisionDate !== undefined) entry.decisionDate = new Date(data.decisionDate);
  if (data.contextReasoning !== undefined) entry.contextReasoning = data.contextReasoning;
  if (data.expectedOutcome !== undefined) entry.expectedOutcome = data.expectedOutcome;
  if (data.risksAssumptions !== undefined) entry.risksAssumptions = data.risksAssumptions;
  if (data.alternativesConsidered !== undefined) entry.alternativesConsidered = data.alternativesConsidered;
  if (data.tags !== undefined) entry.tags = data.tags;
  if (data.linkedRecords !== undefined) entry.linkedRecords = data.linkedRecords;

  if (data.amount !== undefined) {
    if (data.amount?.amount) {
      entry.amount = {
        amount: mongoose.Types.Decimal128.fromString(data.amount.amount),
        currency: data.amount.currency || "KES",
      };
    } else {
      entry.amount = undefined;
    }
  }

  if (data.reviewDate !== undefined) {
    entry.reviewDate = data.reviewDate ? new Date(data.reviewDate) : undefined;
    if (entry.reviewDate && entry.followUpStatus === "none") {
      entry.followUpStatus = "pending";
    }
  }

  if (data.followUpStatus !== undefined) {
    entry.followUpStatus = data.followUpStatus;
  }

  if (data.outcomeLessons !== undefined) {
    entry.outcomeLessons = data.outcomeLessons;
    if (data.outcomeLessons.trim()) {
      entry.outcomeRecordedAt = new Date();
      entry.followUpStatus = "completed";
    }
  }

  if (data.status !== undefined) {
    entry.status = data.status;
  }

  await entry.save();

  return NextResponse.json({ entry });
}

async function deleteHandler(request, { params }) {
  const userId = await requireUserId();
  await connectDB();
  const { id } = await params;

  const entry = await JournalEntry.findOneAndUpdate(
    { _id: id, ownerId: userId },
    { status: "archived" },
    { new: true }
  );

  if (!entry) {
    return apiError("Journal entry not found", 404);
  }

  return NextResponse.json({ success: true, archivedId: id });
}

export const GET = withErrorHandling(getHandler);
export const PATCH = withErrorHandling(patchHandler);
export const DELETE = withErrorHandling(deleteHandler);
