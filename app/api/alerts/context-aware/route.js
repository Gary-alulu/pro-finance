// app/api/alerts/context-aware/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Asset from "@/lib/db/models/Asset";
import Liability from "@/lib/db/models/Liability";
import InvestmentHolding from "@/lib/db/models/InvestmentHolding";
import Transaction from "@/lib/db/models/Transaction";
import Document from "@/lib/db/models/Document";
import { requireUserId, withErrorHandling } from "@/lib/auth/session";
import { generateContextAwareAlerts } from "@/lib/alerts/contextAwareAlerts";

async function getHandler(request) {
  const userId = await requireUserId();
  await connectDB();
  const { searchParams } = new URL(request.url);
  const thresholds = {
    liabilityUpdateDays: parseInt(searchParams.get("liabilityDays") || "90"),
    documentReviewHours: parseInt(searchParams.get("docHours") || "24"),
  };
  const [assets, liabilities, investments, transactions, documents] = await Promise.all([
    Asset.find({ ownerId: userId }).lean(),
    Liability.find({ ownerId: userId }).lean(),
    InvestmentHolding.find({ ownerId: userId }).lean(),
    Transaction.find({ ownerId: userId }).lean(),
    Document.find({ ownerId: userId }).lean(),
  ]);
  const result = generateContextAwareAlerts({ assets, liabilities, investments, transactions, documents, thresholds });
  return NextResponse.json(result);
}

export const GET = withErrorHandling(getHandler);
