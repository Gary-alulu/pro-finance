// app/api/anomalies/[id]/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import DataAnomaly from "@/lib/db/models/DataAnomaly";
import { requireUserId, withErrorHandling, validationError } from "@/lib/auth/session";
import { anomalyActionSchema } from "@/lib/validations/schemas";
import { readJsonBody } from "@/lib/security/sanitize";
import mongoose from "mongoose";

async function postHandler(request, { params }) {
  const userId = await requireUserId();
  const body = await readJsonBody(request);
  const result = anomalyActionSchema.safeParse(body);
  if (!result.success) return validationError(result);
  await connectDB();
  const { id } = await params;
  const item = await DataAnomaly.findOne({ _id: id, ownerId: userId });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { action, resolutionNote } = result.data;

  if (action === "dismiss") {
    item.status = "dismissed";
    item.resolutionNote = resolutionNote;
    item.resolvedBy = new mongoose.Types.ObjectId(userId);
    item.resolvedAt = new Date();
    await item.save();
    return NextResponse.json({ anomaly: item.toJSON() });
  }
  if (action === "investigate") {
    item.status = "investigating";
    if (resolutionNote) item.resolutionNote = resolutionNote;
    await item.save();
    return NextResponse.json({ anomaly: item.toJSON() });
  }
  if (action === "resolve") {
    item.status = "resolved";
    item.resolutionNote = resolutionNote;
    item.resolvedBy = new mongoose.Types.ObjectId(userId);
    item.resolvedAt = new Date();
    await item.save();
    return NextResponse.json({ anomaly: item.toJSON() });
  }
  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export const POST = withErrorHandling(postHandler);
