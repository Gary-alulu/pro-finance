// app/api/documents/[id]/approve/route.js
// POST /api/documents/[id]/approve
// Core product rule: User approval gates AI-extracted data before it becomes official.
// Commits approved data into Asset, Liability, or Transaction collections and links back.

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Document from "@/lib/db/models/Document";
import Asset from "@/lib/db/models/Asset";
import Liability from "@/lib/db/models/Liability";
import Transaction from "@/lib/db/models/Transaction";
import { requireUserId, assertOwnership, withErrorHandling, validationError } from "@/lib/auth/session";
import { approveDocumentSchema } from "@/lib/validations/schemas";
import { logAudit, requestMeta } from "@/lib/audit/logAudit";
import mongoose from "mongoose";
import { readJsonBody } from "@/lib/security/sanitize";

async function postHandler(request, { params }) {
  const userId = await requireUserId();
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid document ID" }, { status: 400 });
  }

  const body = await readJsonBody(request);
  const parsed = approveDocumentSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed);
  }
  const { entityType, data } = parsed.data;

  await connectDB();
  const doc = await Document.findById(id);

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  assertOwnership(doc.ownerId, userId);

  let createdEntity = null;
  const currency = data.currency || "KES";
  const amountStr = data.amount?.toString() || "0.00";
  const dateVal = data.date ? new Date(data.date) : new Date();

  if (entityType === "asset") {
    const asset = await Asset.create({
      ownerId: new mongoose.Types.ObjectId(userId),
      name: data.name || doc.filename,
      category: data.category || "property",
      currency,
      description: data.description || `Extracted from ${doc.filename}`,
      status: "active",
      currentValue: {
        amount: mongoose.Types.Decimal128.fromString(amountStr),
        asOf: dateVal,
        source: "ai_extracted",
        approvedBy: new mongoose.Types.ObjectId(userId),
        approvedAt: new Date(),
      },
      valuationHistory: [
        {
          amount: mongoose.Types.Decimal128.fromString(amountStr),
          currency,
          asOf: dateVal,
          source: "ai_extracted",
          note: `Extracted from document: ${doc.filename}`,
        },
      ],
      linkedDocumentIds: [doc._id],
    });

    doc.linkedAssetId = asset._id;
    createdEntity = { type: "asset", item: asset.toJSON() };
  } else if (entityType === "liability") {
    const liability = await Liability.create({
      ownerId: new mongoose.Types.ObjectId(userId),
      name: data.name || doc.filename,
      category: data.category || "mortgage",
      currency,
      lender: data.counterparty || data.lender || "Lender",
      status: "active",
      currentBalance: {
        amount: mongoose.Types.Decimal128.fromString(amountStr),
        asOf: dateVal,
        source: "ai_extracted",
      },
      notes: `Extracted from document: ${doc.filename}`,
      linkedDocumentIds: [doc._id],
    });

    doc.linkedLiabilityId = liability._id;
    createdEntity = { type: "liability", item: liability.toJSON() };
  } else if (entityType === "transaction") {
    const tx = await Transaction.create({
      ownerId: new mongoose.Types.ObjectId(userId),
      date: dateVal,
      description: data.name || data.description || `Verified from ${doc.filename}`,
      amount: mongoose.Types.Decimal128.fromString(amountStr),
      currency,
      direction: data.direction || (data.category === "income" ? "inflow" : "outflow"),
      category: data.category || "expense",
      evidenceStatus: "supported",
      approvalStatus: "approved",
      linkedDocumentId: doc._id,
      notes: `Evidence verified from document ${doc.filename}`,
    });

    doc.linkedTransactionIds.push(tx._id);
    createdEntity = { type: "transaction", item: tx.toJSON() };
  }

  // Finalise document state
  doc.processingStatus = "approved";
  doc.approvedData = data;
  doc.approvedAt = new Date();
  doc.approvedBy = new mongoose.Types.ObjectId(userId);

  await doc.save();

  await logAudit(
    userId,
    "approve",
    "document",
    doc._id.toString(),
    { processingStatus: "awaiting_review" },
    { processingStatus: "approved", entityType, createdEntity },
    `Approved extraction from "${doc.filename}" as ${entityType}`,
    requestMeta(request)
  );

  return NextResponse.json({
    success: true,
    document: {
      ...doc.toJSON(),
      id: doc._id.toString(),
    },
    createdEntity,
  });
}

export const POST = withErrorHandling(postHandler);
