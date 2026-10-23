// app/api/relationships/suggestions/[id]/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import RelationshipSuggestion from "@/lib/db/models/RelationshipSuggestion";
import RecordRelationship from "@/lib/db/models/RecordRelationship";
import { requireUserId, withErrorHandling, validationError } from "@/lib/auth/session";
import { relationshipSuggestionActionSchema } from "@/lib/validations/schemas";
import { readJsonBody } from "@/lib/security/sanitize";
import mongoose from "mongoose";

async function postHandler(request, { params }) {
  const userId = await requireUserId();
  const body = await readJsonBody(request);
  const result = relationshipSuggestionActionSchema.safeParse(body);
  if (!result.success) return validationError(result);
  await connectDB();
  const { id } = await params;
  const sug = await RelationshipSuggestion.findOne({ _id: id, ownerId: userId });
  if (!sug) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { action, notes } = result.data;

  if (action === "reject") {
    sug.status = "rejected";
    sug.rejectedAt = new Date();
    await sug.save();
    return NextResponse.json({ suggestion: sug.toJSON() });
  }

  if (action === "confirm") {
    sug.status = "confirmed";
    sug.confirmedBy = new mongoose.Types.ObjectId(userId);
    sug.confirmedAt = new Date();
    await sug.save();

    const relMap = {
      document_supports_asset: "evidences",
      loan_property: "secures",
      dividend_to_investment: "generates",
      same_asset_account: "duplicate_of",
      transaction_document: "extracted_from",
      investment_statement_link: "linked_to",
      other: "linked_to",
    };

    try {
      await RecordRelationship.create({
        ownerId: new mongoose.Types.ObjectId(userId),
        sourceType: sug.source.kind === "investment" ? "investment" : sug.source.kind,
        sourceId: new mongoose.Types.ObjectId(sug.source.refId),
        targetType: sug.target.kind === "investment" ? "investment" : sug.target.kind,
        targetId: new mongoose.Types.ObjectId(sug.target.refId),
        relationshipType: relMap[sug.type] || "linked_to",
        confidence: "confirmed",
        confirmedAt: new Date(),
        confirmedBy: new mongoose.Types.ObjectId(userId),
        notes: notes || sug.explanation,
      });
    } catch (e) {
      // ignore duplicates
    }

    return NextResponse.json({ suggestion: sug.toJSON() });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export const POST = withErrorHandling(postHandler);
