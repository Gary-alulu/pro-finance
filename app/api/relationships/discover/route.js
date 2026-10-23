// app/api/relationships/discover/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Asset from "@/lib/db/models/Asset";
import Liability from "@/lib/db/models/Liability";
import InvestmentHolding from "@/lib/db/models/InvestmentHolding";
import Document from "@/lib/db/models/Document";
import Transaction from "@/lib/db/models/Transaction";
import Dividend from "@/lib/db/models/Dividend";
import RelationshipSuggestion from "@/lib/db/models/RelationshipSuggestion";
import { requireUserId, withErrorHandling } from "@/lib/auth/session";
import { discoverRelationships } from "@/lib/ai/relationshipDiscovery";

async function postHandler() {
  const userId = await requireUserId();
  await connectDB();
  const [assets, liabilities, investments, documents, transactions, dividends] = await Promise.all([
    Asset.find({ ownerId: userId }).lean(),
    Liability.find({ ownerId: userId }).lean(),
    InvestmentHolding.find({ ownerId: userId }).lean(),
    Document.find({ ownerId: userId }).lean(),
    Transaction.find({ ownerId: userId }).lean(),
    Dividend.find({ ownerId: userId }).lean(),
  ]);

  const suggestions = discoverRelationships({ documents, assets, liabilities, investments, transactions, dividends });
  let created = 0;
  for (const s of suggestions) {
    try {
      const exists = await RelationshipSuggestion.findOne({
        ownerId: userId,
        type: s.type,
        status: { $in: ["suggested", "confirmed"] },
        "source.refId": s.source.refId,
        "target.refId": s.target.refId,
      });
      if (exists) continue;
      await RelationshipSuggestion.create({
        ownerId: userId,
        type: s.type,
        status: "suggested",
        source: s.source,
        target: s.target,
        confidence: s.confidence,
        explanation: s.explanation,
        evidence: s.evidence,
        reasons: s.reasons,
        aiSuggested: true,
      });
      created++;
    } catch (e) {
      // ignore
    }
  }
  return NextResponse.json({ discovered: suggestions.length, created });
}

export const POST = withErrorHandling(postHandler);
