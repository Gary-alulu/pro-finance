// app/api/accountability/[id]/route.js
// PATCH /api/accountability/[id] — resolve or dismiss an accountability item

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import AccountabilityItem from "@/lib/db/models/AccountabilityItem";
import { requireUserId, assertOwnership, withErrorHandling } from "@/lib/auth/session";
import mongoose from "mongoose";
import { readJsonBody } from "@/lib/security/sanitize";

async function patchHandler(request, { params }) {
  const userId = await requireUserId();
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid item ID" }, { status: 400 });
  }

  const body = await readJsonBody(request);
  const { status } = body;

  if (!["open", "resolved", "dismissed"].includes(status)) {
    return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
  }

  await connectDB();
  const item = await AccountabilityItem.findById(id);

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  assertOwnership(item.ownerId, userId);

  item.status = status;
  if (status === "resolved") {
    item.resolvedAt = new Date();
    item.resolution = "manual";
  }

  await item.save();

  return NextResponse.json({
    item: {
      ...item.toJSON(),
      id: item._id.toString(),
    },
  });
}

export const PATCH = withErrorHandling(patchHandler);
