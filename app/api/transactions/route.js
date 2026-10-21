// app/api/transactions/route.js
// GET /api/transactions — list transactions
// POST /api/transactions — create a transaction

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Transaction from "@/lib/db/models/Transaction";
import { requireUserId, withErrorHandling, validationError } from "@/lib/auth/session";
import { logAudit, requestMeta } from "@/lib/audit/logAudit";
import { createTransactionSchema } from "@/lib/validations/schemas";
import mongoose from "mongoose";
import { readJsonBody } from "@/lib/security/sanitize";

async function getHandler(request) {
  const userId = await requireUserId();
  await connectDB();

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 500);
  const skip = parseInt(searchParams.get("skip") || "0");
  const sort = searchParams.get("sort") || "-date";
  const category = searchParams.get("category");
  const direction = searchParams.get("direction");

  const filter = { ownerId: userId };
  if (category) filter.category = category;
  if (direction) filter.direction = direction;

  const sortObj = sort.startsWith("-")
    ? { [sort.slice(1)]: -1 }
    : { [sort]: 1 };

  const [transactions, total] = await Promise.all([
    Transaction.find(filter).sort(sortObj).skip(skip).limit(limit).lean(),
    Transaction.countDocuments(filter),
  ]);

  return NextResponse.json({
    transactions: transactions.map((t) => ({
      ...t,
      id: t._id.toString(),
      amount: t.amount?.toString(),
    })),
    total,
    skip,
    limit,
  });
}

async function postHandler(request) {
  const userId = await requireUserId();
  const body = await readJsonBody(request);

  const result = createTransactionSchema.safeParse(body);
  if (!result.success) {
    return validationError(result);
  }

  await connectDB();
  const data = result.data;

  const tx = await Transaction.create({
    ownerId: new mongoose.Types.ObjectId(userId),
    date: new Date(data.date),
    description: data.description,
    amount: mongoose.Types.Decimal128.fromString(data.amount),
    currency: data.currency,
    direction: data.direction,
    category: data.category,
    evidenceStatus: data.evidenceStatus,
    tags: data.tags,
    notes: data.notes,
    isRecurring: data.isRecurring,
  });

  await logAudit(
    userId,
    "create",
    "transaction",
    tx._id.toString(),
    null,
    tx.toJSON(),
    `Created ${data.direction} transaction "${data.description || data.category}"`,
    requestMeta(request)
  );

  return NextResponse.json({ transaction: tx.toJSON() }, { status: 201 });
}

export const GET = withErrorHandling(getHandler);
export const POST = withErrorHandling(postHandler);
