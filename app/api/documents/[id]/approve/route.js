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
import { approveDocumentSchema, transactionCategories } from "@/lib/validations/schemas";
import { logAudit, requestMeta } from "@/lib/audit/logAudit";
import mongoose from "mongoose";
import { readJsonBody } from "@/lib/security/sanitize";

const CATEGORY_ALIASES = {
  debit: "expense",
  credit: "income",
  deposit: "income",
  withdrawal: "expense",
  payment: "expense",
  purchase: "expense",
  sale: "asset_sale",
  salary: "income",
  wages: "income",
  bank_fee: "fee",
  bank_charges: "fee",
  charges: "fee",
  commission: "fee",
  interest_earned: "interest",
  dividend_income: "dividend",
  loan_payment: "loan_repayment",
  mortgage_payment: "loan_repayment",
  transfer_in: "transfer",
  transfer_out: "transfer",
};

function normalizeTransactionCategory(category, direction) {
  const cleaned = String(category || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (transactionCategories.includes(cleaned)) return cleaned;
  if (CATEGORY_ALIASES[cleaned]) return CATEGORY_ALIASES[cleaned];
  if (direction === "inflow") return "income";
  if (direction === "outflow") return "expense";
  return "other";
}

function lineItemsPayload(items, { userId, doc, currency, dateVal, fallbackDescription }) {
  return items.map((item) => {
    const direction = item.direction || "unknown";
    return {
      ownerId: new mongoose.Types.ObjectId(userId),
      date: item.date ? new Date(item.date) : dateVal,
      description:
        item.description || fallbackDescription || `Transaction from ${doc.filename}`,
      amount: mongoose.Types.Decimal128.fromString(item.amount),
      currency: item.currency || currency,
      direction,
      category: normalizeTransactionCategory(item.category, direction),
      evidenceStatus: "supported",
      approvalStatus: "approved",
      linkedDocumentId: doc._id,
      notes:
        item.notes ||
        `Extracted from ${doc.filename}${item.reference ? ` (ref ${item.reference})` : ""}`,
    };
  });
}

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

  const extractedLineItems = Array.isArray(data.lineItems) ? data.lineItems : [];
  if (entityType === "transaction" && extractedLineItems.length === 0 && !data.amount) {
    return NextResponse.json(
      { error: "A transaction amount or at least one extracted line item is required" },
      { status: 400 }
    );
  }
  if (entityType !== "transaction" && !data.amount) {
    return NextResponse.json(
      { error: `An amount is required to create a ${entityType}` },
      { status: 400 }
    );
  }

  let createdEntity = null;
  const currency = data.currency || "KES";
  const amountStr = data.amount ? data.amount.toString() : null;
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
    if (extractedLineItems.length > 0) {
      const payload = lineItemsPayload(extractedLineItems, {
        userId,
        doc,
        currency,
        dateVal,
        fallbackDescription: data.name || data.description,
      });
      const created = await Transaction.insertMany(payload);

      doc.linkedTransactionIds.push(...created.map((tx) => tx._id));
      createdEntity = {
        type: "transaction",
        count: created.length,
        items: created.map((tx) => tx.toJSON()),
      };
    } else {
      const direction =
        data.direction || (data.category === "income" ? "inflow" : "outflow");
      const tx = await Transaction.create({
        ownerId: new mongoose.Types.ObjectId(userId),
        date: dateVal,
        description: data.name || data.description || `Verified from ${doc.filename}`,
        amount: mongoose.Types.Decimal128.fromString(amountStr),
        currency,
        direction,
        category: normalizeTransactionCategory(data.category, direction),
        evidenceStatus: "supported",
        approvalStatus: "approved",
        linkedDocumentId: doc._id,
        notes: `Evidence verified from document ${doc.filename}`,
      });

      doc.linkedTransactionIds.push(tx._id);
      createdEntity = { type: "transaction", count: 1, items: [tx.toJSON()] };
    }
  }

  // Finalise document state
  doc.processingStatus = "approved";
  doc.approvedData = data;
  doc.approvedAt = new Date();
  doc.approvedBy = new mongoose.Types.ObjectId(userId);

  await doc.save();

  const auditEntity =
    createdEntity?.type === "transaction" && createdEntity.count > 5
      ? {
          type: "transaction",
          count: createdEntity.count,
          ids: createdEntity.items.map((item) => item.id),
        }
      : createdEntity;

  await logAudit(
    userId,
    "approve",
    "document",
    doc._id.toString(),
    { processingStatus: "awaiting_review" },
    { processingStatus: "approved", entityType, createdEntity: auditEntity },
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
