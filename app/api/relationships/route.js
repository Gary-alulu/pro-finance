// app/api/relationships/route.js
// GET /api/relationships — list explicit record relationships for the owner
// POST /api/relationships — create a typed edge between two owned records

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import RecordRelationship from "@/lib/db/models/RecordRelationship";
import { requireUserId, assertOwnedRef, withErrorHandling, validationError } from "@/lib/auth/session";
import { createRelationshipSchema } from "@/lib/validations/schemas";
import Account from "@/lib/db/models/Account";
import Asset from "@/lib/db/models/Asset";
import Liability from "@/lib/db/models/Liability";
import Transaction from "@/lib/db/models/Transaction";
import InvestmentHolding from "@/lib/db/models/InvestmentHolding";
import Document from "@/lib/db/models/Document";
import mongoose from "mongoose";
import { readJsonBody } from "@/lib/security/sanitize";

// M-5: type → model map so relationship endpoints can verify ownership of
// both endpoints of an edge.
const ENTITY_MODELS = {
  account: Account,
  asset: Asset,
  liability: Liability,
  transaction: Transaction,
  investment: InvestmentHolding,
  document: Document,
};

async function getHandler(request) {
  const userId = await requireUserId();
  await connectDB();

  const { searchParams } = new URL(request.url);
  const sourceId = searchParams.get("sourceId");
  const targetId = searchParams.get("targetId");

  const filter = { ownerId: userId };
  if (sourceId) filter.sourceId = new mongoose.Types.ObjectId(sourceId);
  if (targetId) filter.targetId = new mongoose.Types.ObjectId(targetId);

  const relationships = await RecordRelationship.find(filter).sort({ createdAt: -1 }).lean();

  return NextResponse.json({
    relationships: relationships.map((r) => {
      const { _id, __v, ...rest } = r;
      return { ...rest, id: _id.toString() };
    }),
  });
}

async function postHandler(request) {
  const userId = await requireUserId();
  const body = await readJsonBody(request);

  const result = createRelationshipSchema.safeParse(body);
  if (!result.success) {
    return validationError(result);
  }

  await connectDB();
  const data = result.data;

  // M-5: both ends of the edge must exist and be owned by the current user
  await assertOwnedRef(ENTITY_MODELS[data.sourceType], data.sourceId, userId);
  await assertOwnedRef(ENTITY_MODELS[data.targetType], data.targetId, userId);

  const relationship = await RecordRelationship.create({
    ownerId: new mongoose.Types.ObjectId(userId),
    sourceType: data.sourceType,
    sourceId: new mongoose.Types.ObjectId(data.sourceId),
    targetType: data.targetType,
    targetId: new mongoose.Types.ObjectId(data.targetId),
    relationshipType: data.relationshipType,
    confidence: data.confidence,
    confirmedAt: data.confidence === "confirmed" ? new Date() : undefined,
    confirmedBy: data.confidence === "confirmed" ? new mongoose.Types.ObjectId(userId) : undefined,
    notes: data.notes,
  });

  return NextResponse.json({ relationship: relationship.toJSON() }, { status: 201 });
}

export const GET = withErrorHandling(getHandler);
export const POST = withErrorHandling(postHandler);
