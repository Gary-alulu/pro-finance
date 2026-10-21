// app/api/map/route.js
// GET /api/map — aggregates user financial network graph (nodes and edges) for React Flow canvas

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Asset from "@/lib/db/models/Asset";
import Liability from "@/lib/db/models/Liability";
import InvestmentHolding from "@/lib/db/models/InvestmentHolding";
import Document from "@/lib/db/models/Document";
import Transaction from "@/lib/db/models/Transaction";
import RecordRelationship from "@/lib/db/models/RecordRelationship";
import { requireUserId, withErrorHandling } from "@/lib/auth/session";
import Decimal from "decimal.js";

async function getHandler() {
  const userId = await requireUserId();
  await connectDB();

  const [assets, liabilities, investments, documents, transactions, relationships] =
    await Promise.all([
      Asset.find({ ownerId: userId, status: "active" }).lean(),
      Liability.find({ ownerId: userId, status: "active" }).lean(),
      InvestmentHolding.find({ ownerId: userId, status: "active" }).lean(),
      Document.find({ ownerId: userId }).sort({ uploadedAt: -1 }).limit(30).lean(),
      Transaction.find({ ownerId: userId }).sort({ date: -1 }).limit(20).lean(),
      RecordRelationship.find({ ownerId: userId }).lean(),
    ]);

  const nodes = [];
  const edges = [];

  // 1. Center / Identity Node
  nodes.push({
    id: "user-net-worth",
    type: "centerNode",
    position: { x: 450, y: 350 },
    data: {
      label: "Wealth Core",
      subtitle: "Personal Financial Map",
    },
  });

  // 2. Asset Nodes (Positioned on the Left / Top-Left)
  assets.forEach((asset, idx) => {
    const nodeId = `asset-${asset._id.toString()}`;
    const angle = (idx / Math.max(assets.length, 1)) * Math.PI - Math.PI / 2;
    const radius = 320;
    const x = 450 - Math.cos(angle) * radius;
    const y = 350 + Math.sin(angle) * (radius * 0.85);

    // Freshness check
    const daysAgo = asset.currentValue?.asOf
      ? Math.floor((new Date() - new Date(asset.currentValue.asOf)) / (1000 * 60 * 60 * 24))
      : 999;
    const status = daysAgo < 30 ? "fresh" : daysAgo <= 90 ? "warning" : "stale";

    nodes.push({
      id: nodeId,
      type: "assetNode",
      position: { x: Math.round(x), y: Math.round(y) },
      data: {
        entityId: asset._id.toString(),
        entityType: "asset",
        title: asset.name,
        category: asset.category,
        amount: asset.currentValue?.amount ? asset.currentValue.amount.toString() : "0.00",
        currency: asset.currency || "KES",
        status,
        asOf: asset.currentValue?.asOf,
      },
    });

    // Connect to core (structural: implied by record ownership, not a user edge)
    edges.push({
      id: `edge-core-${nodeId}`,
      source: "user-net-worth",
      target: nodeId,
      type: "smoothstep",
      animated: true,
      style: { stroke: "#10b981", strokeWidth: 1.5 },
      label: "owns",
      kind: "structural",
      confidence: "confirmed",
    });
  });

  // 3. Liability Nodes (Positioned on the Right / Top-Right)
  liabilities.forEach((liab, idx) => {
    const nodeId = `liability-${liab._id.toString()}`;
    const angle = (idx / Math.max(liabilities.length, 1)) * Math.PI - Math.PI / 2;
    const radius = 320;
    const x = 450 + Math.cos(angle) * radius;
    const y = 350 + Math.sin(angle) * (radius * 0.85);

    nodes.push({
      id: nodeId,
      type: "liabilityNode",
      position: { x: Math.round(x), y: Math.round(y) },
      data: {
        entityId: liab._id.toString(),
        entityType: "liability",
        title: liab.name,
        category: liab.category,
        amount: liab.currentBalance?.amount ? liab.currentBalance.amount.toString() : "0.00",
        currency: liab.currency || "KES",
        interestRate: liab.interestRate ? liab.interestRate.toString() : null,
        lender: liab.lender,
      },
    });

    // Connect to core (structural)
    edges.push({
      id: `edge-core-${nodeId}`,
      source: nodeId,
      target: "user-net-worth",
      type: "smoothstep",
      style: { stroke: "#f04e3e", strokeWidth: 1.5, strokeDasharray: "4 4" },
      label: "owes",
      kind: "structural",
      confidence: "confirmed",
    });

    // Connect to linked asset if secured (explicit stored link)
    if (liab.linkedAssetId) {
      edges.push({
        id: `edge-secures-${nodeId}-asset-${liab.linkedAssetId.toString()}`,
        source: nodeId,
        target: `asset-${liab.linkedAssetId.toString()}`,
        type: "smoothstep",
        style: { stroke: "#f0c97a", strokeWidth: 2 },
        label: "secured by",
        kind: "explicit",
        confidence: "confirmed",
      });
    }
  });

  // 4. Investment Nodes (Bottom Left)
  investments.forEach((inv, idx) => {
    const nodeId = `investment-${inv._id.toString()}`;
    const x = 150 + (idx % 3) * 200;
    const y = 620 + Math.floor(idx / 3) * 120;

    let marketVal = null;
    if (inv.units && inv.currentPrice?.price) {
      try {
        marketVal = new Decimal(inv.units.toString())
          .mul(inv.currentPrice.price.toString())
          .toFixed(2);
      } catch {}
    }

    nodes.push({
      id: nodeId,
      type: "investmentNode",
      position: { x, y },
      data: {
        entityId: inv._id.toString(),
        entityType: "investment",
        title: inv.name,
        ticker: inv.ticker,
        type: inv.type,
        amount: marketVal,
        currency: inv.currency || "KES",
      },
    });

    // Connect to core (structural)
    edges.push({
      id: `edge-core-${nodeId}`,
      source: "user-net-worth",
      target: nodeId,
      type: "smoothstep",
      style: { stroke: "#3b82f6", strokeWidth: 1.5 },
      label: "invested in",
      kind: "structural",
      confidence: "confirmed",
    });
  });

  // 5. Document Nodes (Far Left & Far Right linking to assets/liabilities)
  documents.forEach((doc, idx) => {
    const nodeId = `document-${doc._id.toString()}`;
    const x = idx % 2 === 0 ? 30 : 850;
    const y = 100 + (idx * 90);

    nodes.push({
      id: nodeId,
      type: "documentNode",
      position: { x, y },
      data: {
        entityId: doc._id.toString(),
        entityType: "document",
        title: doc.filename,
        documentType: doc.documentType,
        status: doc.processingStatus,
      },
    });

    // Connect to linked asset (explicit stored link)
    if (doc.linkedAssetId) {
      edges.push({
        id: `edge-doc-${nodeId}-asset-${doc.linkedAssetId.toString()}`,
        source: nodeId,
        target: `asset-${doc.linkedAssetId.toString()}`,
        type: "smoothstep",
        style: { stroke: "#9d9a92", strokeWidth: 1.5, strokeDasharray: "2 2" },
        label: "evidences",
        kind: "explicit",
        confidence: "confirmed",
      });
    }

    // Connect to linked liability (explicit stored link)
    if (doc.linkedLiabilityId) {
      edges.push({
        id: `edge-doc-${nodeId}-liab-${doc.linkedLiabilityId.toString()}`,
        source: nodeId,
        target: `liability-${doc.linkedLiabilityId.toString()}`,
        type: "smoothstep",
        style: { stroke: "#9d9a92", strokeWidth: 1.5, strokeDasharray: "2 2" },
        label: "evidences",
        kind: "explicit",
        confidence: "confirmed",
      });
    }
  });

  // 6. Explicit Financial Relationships (user/AI-created edges with confidence)
  relationships.forEach((rel) => {
    const sId = `${rel.sourceType}-${rel.sourceId.toString()}`;
    const tId = `${rel.targetType}-${rel.targetId.toString()}`;
    const confidence = rel.confidence || "confirmed";
    const isConfirmed = confidence === "confirmed";
    edges.push({
      id: `edge-rel-${rel._id.toString()}`,
      source: sId,
      target: tId,
      type: "smoothstep",
      label: isConfirmed
        ? rel.relationshipType.replace(/_/g, " ")
        : `${rel.relationshipType.replace(/_/g, " ")}?`,
      style: {
        stroke: isConfirmed ? "#c49a24" : "#c49a2480",
        strokeWidth: isConfirmed ? 1.8 : 1.4,
        ...(isConfirmed ? {} : { strokeDasharray: "6 4" }),
      },
      kind: "explicit",
      confidence,
    });
  });

  return NextResponse.json({ nodes, edges });
}

export const GET = withErrorHandling(getHandler);
