// app/api/reconciliation/[id]/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Reconciliation from "@/lib/db/models/Reconciliation";
import Transaction from "@/lib/db/models/Transaction";
import InvestmentHolding from "@/lib/db/models/InvestmentHolding";
import { requireUserId, withErrorHandling, validationError } from "@/lib/auth/session";
import { reconciliationActionSchema } from "@/lib/validations/schemas";
import { readJsonBody } from "@/lib/security/sanitize";
import mongoose from "mongoose";

async function postHandler(request, { params }) {
  const userId = await requireUserId();
  const body = await readJsonBody(request);
  const result = reconciliationActionSchema.safeParse(body);
  if (!result.success) return validationError(result);
  await connectDB();
  const { id } = await params;
  const item = await Reconciliation.findOne({ _id: id, ownerId: userId });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { action, transactionId, investmentId, correctedEntry, note } = result.data;

  if (action === "reject") {
    item.status = "rejected";
    if (note) item.explanation = note;
    await item.save();
    return NextResponse.json({ item: item.toJSON() });
  }

  if (action === "correct") {
    item.status = "corrected";
    item.correctedEntry = correctedEntry || item.correctedEntry;
    if (note) item.explanation = note;
    await item.save();
    return NextResponse.json({ item: item.toJSON() });
  }

  if (action === "confirm") {
    item.status = "confirmed";
    item.confirmedMatch = {
      transactionId: transactionId ? new mongoose.Types.ObjectId(transactionId) : undefined,
      investmentId: investmentId ? new mongoose.Types.ObjectId(investmentId) : undefined,
      matchType: transactionId ? "transaction" : investmentId ? "investment" : "transaction",
      confirmedBy: new mongoose.Types.ObjectId(userId),
      confirmedAt: new Date(),
      note,
    };
    await item.save();
    return NextResponse.json({ item: item.toJSON() });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export const POST = withErrorHandling(postHandler);
