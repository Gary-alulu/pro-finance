// app/api/anomalies/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import DataAnomaly from "@/lib/db/models/DataAnomaly";
import Asset from "@/lib/db/models/Asset";
import Liability from "@/lib/db/models/Liability";
import InvestmentHolding from "@/lib/db/models/InvestmentHolding";
import Transaction from "@/lib/db/models/Transaction";
import Document from "@/lib/db/models/Document";
import { requireUserId, withErrorHandling } from "@/lib/auth/session";
import { detectAnomalies } from "@/lib/ai/anomalyDetection";

async function getHandler(request) {
  const userId = await requireUserId();
  await connectDB();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "open";
  const filter = { ownerId: userId };
  if (status !== "all") filter.status = status;
  const items = await DataAnomaly.find(filter).sort({ priorityScore: -1, createdAt: -1 }).lean();
  return NextResponse.json({ anomalies: items.map(i => ({ ...i, id: i._id.toString() })) });
}

async function postHandler() {
  const userId = await requireUserId();
  await connectDB();
  const [assets, liabilities, investments, transactions, documents] = await Promise.all([
    Asset.find({ ownerId: userId }).lean(),
    Liability.find({ ownerId: userId }).lean(),
    InvestmentHolding.find({ ownerId: userId }).lean(),
    Transaction.find({ ownerId: userId }).lean(),
    Document.find({ ownerId: userId }).lean(),
  ]);
  const detected = detectAnomalies({ assets, liabilities, investments, transactions, documents });
  let created = 0;
  for (const d of detected) {
    try {
      const exists = await DataAnomaly.findOne({ ownerId: userId, type: d.type, "entity.refId": d.entity?.refId, status: "open" });
      if (exists) continue;
      await DataAnomaly.create({
        ownerId: userId,
        type: d.type,
        severity: d.severity,
        impact: d.impact,
        status: "open",
        title: d.title,
        description: d.description,
        explanation: d.explanation,
        entity: d.entity,
        relatedEntities: d.relatedEntities || [],
        evidence: d.evidence || [],
        suggestedAction: d.suggestedAction,
        priorityScore: d.priorityScore || 0,
        ruleBased: d.ruleBased !== false,
        aiDetected: !!d.aiDetected,
      });
      created++;
    } catch (e) {}
  }
  return NextResponse.json({ detected: detected.length, created });
}

export const GET = withErrorHandling(getHandler);
export const POST = withErrorHandling(postHandler);
