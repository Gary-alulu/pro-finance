// app/api/reminders/[id]/route.js
// PATCH  /api/reminders/[id] — update status (done/cancelled/snoozed) or fields
// DELETE /api/reminders/[id] — remove a reminder

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Reminder from "@/lib/db/models/Reminder";
import { requireUserId, assertOwnership, apiError, withErrorHandling } from "@/lib/auth/session";
import { logAudit, requestMeta } from "@/lib/audit/logAudit";
import mongoose from "mongoose";
import { readJsonBody } from "@/lib/security/sanitize";

async function patchHandler(request, { params }) {
  const userId = await requireUserId();
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid reminder ID" }, { status: 400 });
  }

  const body = await readJsonBody(request).catch(() => ({}));
  const { status, title, body: note, dueAt, priority, snoozeUntil } = body;

  await connectDB();
  const reminder = await Reminder.findById(id);
  if (!reminder) {
    return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
  }
  assertOwnership(reminder.ownerId, userId);

  if (status !== undefined) {
    if (!["open", "snoozed", "done", "cancelled"].includes(status)) {
      return apiError("Invalid status value");
    }
    reminder.status = status;
    if (status === "done") reminder.completedAt = new Date();
    if (status === "snoozed") {
      const until = new Date(snoozeUntil);
      if (!snoozeUntil || Number.isNaN(until.getTime())) {
        return apiError("snoozed status requires a valid snoozeUntil date");
      }
      reminder.snoozedUntil = until;
    }
  }
  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) return apiError("Title cannot be empty");
    reminder.title = title.trim();
  }
  if (note !== undefined) reminder.body = note;
  if (dueAt !== undefined) {
    const due = new Date(dueAt);
    if (Number.isNaN(due.getTime())) return apiError("Invalid dueAt date");
    reminder.dueAt = due;
  }
  if (priority !== undefined) {
    if (!["low", "normal", "high"].includes(priority)) return apiError("Invalid priority");
    reminder.priority = priority;
  }

  await reminder.save();
  await logAudit(
    userId,
    "update",
    "reminder",
    reminder._id.toString(),
    null,
    { status: reminder.status, title: reminder.title },
    `Updated reminder "${reminder.title}"`,
    requestMeta(request)
  );

  return NextResponse.json({ reminder: reminder.toJSON() });
}

async function deleteHandler(request, { params }) {
  const userId = await requireUserId();
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid reminder ID" }, { status: 400 });
  }

  await connectDB();
  const reminder = await Reminder.findById(id);
  if (!reminder) {
    return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
  }
  assertOwnership(reminder.ownerId, userId);

  await reminder.deleteOne();
  await logAudit(
    userId,
    "delete",
    "reminder",
    id,
    { title: reminder.title },
    null,
    `Deleted reminder "${reminder.title}"`,
    requestMeta(request)
  );

  return NextResponse.json({ success: true });
}

export const PATCH = withErrorHandling(patchHandler);
export const DELETE = withErrorHandling(deleteHandler);
