// app/api/reconciliation/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Reconciliation from "@/lib/db/models/Reconciliation";
import Transaction from "@/lib/db/models/Transaction";
import InvestmentHolding from "@/lib/db/models/InvestmentHolding";
import Document from "@/lib/db/models/Document";
import { requireUserId, withErrorHandling } from "@/lib/auth/session";

async function getHandler(request) {
  const userId = await requireUserId();
  await connectDB();
  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get("documentId");
  const status = searchParams.get("status") || "suggested";
  const filter = { ownerId: userId };
  if (documentId) filter.documentId = documentId;
  if (status !== "all") filter.status = status;
  const items = await Reconciliation.find(filter).sort({ createdAt: -1 }).lean();
  return NextResponse.json({ items: items.map(i => ({ ...i, id: i._id.toString() })) });
}

export const GET = withErrorHandling(getHandler);
