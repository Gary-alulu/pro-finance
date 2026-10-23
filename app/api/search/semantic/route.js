// app/api/search/semantic/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Document from "@/lib/db/models/Document";
import Transaction from "@/lib/db/models/Transaction";
import Asset from "@/lib/db/models/Asset";
import InvestmentHolding from "@/lib/db/models/InvestmentHolding";
import { requireUserId, withErrorHandling } from "@/lib/auth/session";
import { semanticSearch } from "@/lib/search/semanticSearch";

async function postHandler(request) {
  const userId = await requireUserId();
  await connectDB();
  const body = await request.json().catch(() => ({}));
  const [documents, transactions, assets, investments] = await Promise.all([
    Document.find({ ownerId: userId }).lean(),
    Transaction.find({ ownerId: userId }).sort({ date: -1 }).limit(200).lean(),
    Asset.find({ ownerId: userId }).lean(),
    InvestmentHolding.find({ ownerId: userId }).lean(),
  ]);
  const result = semanticSearch({ query: body.query, documents, transactions, assets, investments });
  return NextResponse.json(result);
}

export const POST = withErrorHandling(postHandler);
export const GET = withErrorHandling(async (req) => {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "";
  const userId = await requireUserId();
  await connectDB();
  const [documents, transactions, assets, investments] = await Promise.all([
    Document.find({ ownerId: userId }).lean(),
    Transaction.find({ ownerId: userId }).sort({ date: -1 }).limit(200).lean(),
    Asset.find({ ownerId: userId }).lean(),
    InvestmentHolding.find({ ownerId: userId }).lean(),
  ]);
  const result = semanticSearch({ query, documents, transactions, assets, investments });
  return NextResponse.json(result);
});
