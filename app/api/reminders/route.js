// app/api/reminders/route.js
// GET  /api/reminders?status=open — list reminders, soonest first
// POST /api/reminders — create a manual reminder

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Reminder from "@/lib/db/models/Reminder";
import { requireUserId, apiError, withErrorHandling } from "@/lib/auth/session";
import { logAudit, requestMeta } from "@/lib/audit/logAudit";
import mongoose from "mongoose";
import { readJsonBody } from "@/lib/security/sanitize";

async function getHandler(request) {
  const userId = await requireUserId();
  await connectDB();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "open";
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);

  const filter = { ownerId: userId };
  if (status !== "all") filter.status = status;

  const reminders = await Reminder.find(filter)
    .sort({ dueAt: 1 })
    .limit(limit)
    .lean();

  return NextResponse.json({
    reminders: reminders.map(({ _id, __v, ownerId, ...rest }) => ({
      ...rest,
      id: _id.toString(),
    })),
  });
}

async function postHandler(request) {
  const userId = await requireUserId();
  const body = await readJsonBody(request).catch(() => ({}));

  const { title, body: note, dueAt, priority, entityType, entityId } = body;

  if (!title || typeof title !== "string" || !title.trim()) {
    return apiError("Title is required");
  }
  const due = new Date(dueAt);
  if (!dueAt || Number.isNaN(due.getTime())) {
    return apiError("A valid dueAt date is required");
  }

  await connectDB();

  const reminder = await Reminder.create({
    ownerId: new mongoose.Types.ObjectId(userId),
    title: title.trim(),
    body: note,
    dueAt: due,
    priority: ["low", "normal", "high"].includes(priority) ? priority : "normal",
    entityType: entityType || "none",
    entityId: entityId && mongoose.Types.ObjectId.isValid(entityId)
      ? new mongoose.Types.ObjectId(entityId)
      : undefined,
    source: "manual",
  });

  await logAudit(
    userId,
    "create",
    "reminder",
    reminder._id.toString(),
    null,
    { title: reminder.title, dueAt: reminder.dueAt },
    `Created reminder "${reminder.title}"`,
    requestMeta(request)
  );

  return NextResponse.json({ reminder: reminder.toJSON() }, { status: 201 });
}

export const GET = withErrorHandling(getHandler);
export const POST = withErrorHandling(postHandler);
