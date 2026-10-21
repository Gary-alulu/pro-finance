// app/api/audit/route.js
// GET /api/audit — list the account owner's audit trail (most recent first)

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import AuditEvent from "@/lib/db/models/AuditEvent";
import { requireUserId, withErrorHandling } from "@/lib/auth/session";

async function getHandler(request) {
  const userId = await requireUserId();
  await connectDB();

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
  const skip = Math.max(parseInt(searchParams.get("skip") || "0"), 0);
  const entityType = searchParams.get("entityType");
  const action = searchParams.get("action");

  const filter = { ownerId: userId };
  if (entityType) filter.entityType = entityType;
  if (action) filter.action = action;

  const [events, total] = await Promise.all([
    AuditEvent.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AuditEvent.countDocuments(filter),
  ]);

  return NextResponse.json({
    events: events.map((e) => {
      const { _id, __v, ...rest } = e;
      return { ...rest, id: _id.toString() };
    }),
    total,
    skip,
    limit,
  });
}

export const GET = withErrorHandling(getHandler);
