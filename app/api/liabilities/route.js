// app/api/liabilities/route.js
// GET /api/liabilities — list liabilities for authenticated user
// POST /api/liabilities — create a new liability

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Liability from "@/lib/db/models/Liability";
import { requireUserId, assertOwnedRef, withErrorHandling, validationError } from "@/lib/auth/session";
import Asset from "@/lib/db/models/Asset";
import { logAudit, requestMeta } from "@/lib/audit/logAudit";
import { createLiabilitySchema } from "@/lib/validations/schemas";
import mongoose from "mongoose";
import { readJsonBody } from "@/lib/security/sanitize";

async function getHandler(request) {
  const userId = await requireUserId();
  await connectDB();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "active";
  const category = searchParams.get("category");
  const summary = searchParams.get("summary") === "true";
  const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);
  const skip = parseInt(searchParams.get("skip") || "0");

  const filter = { ownerId: userId };
  if (status !== "all") filter.status = status;
  if (category) filter.category = category;

  if (summary) {
    // Aggregation for liability allocation / total balance
    const byCategory = await Liability.aggregate([
      { $match: { ownerId: new mongoose.Types.ObjectId(userId), status: "active" } },
      {
        $group: {
          _id: "$category",
          amount: {
            $sum: { $toDecimal: { $ifNull: ["$currentBalance.amount", "0"] } },
          },
        },
      },
      { $project: { _id: 0, category: "$_id", amount: { $toString: "$amount" } } },
    ]);
    return NextResponse.json({ byCategory });
  }

  const [liabilities, total] = await Promise.all([
    Liability.find(filter)
      .populate("linkedAssetId", "name category")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Liability.countDocuments(filter),
  ]);

  return NextResponse.json({
    liabilities: liabilities.map((l) => ({
      ...l,
      id: l._id.toString(),
      principalAmount: l.principalAmount ? l.principalAmount.toString() : null,
      interestRate: l.interestRate ? l.interestRate.toString() : null,
      currentBalance: l.currentBalance
        ? {
            ...l.currentBalance,
            amount: l.currentBalance.amount ? l.currentBalance.amount.toString() : null,
          }
        : null,
      linkedAsset: l.linkedAssetId
        ? {
            id: l.linkedAssetId._id?.toString() || l.linkedAssetId.toString(),
            name: l.linkedAssetId.name,
            category: l.linkedAssetId.category,
          }
        : null,
    })),
    total,
    skip,
    limit,
  });
}

async function postHandler(request) {
  const userId = await requireUserId();
  const body = await readJsonBody(request);

  const result = createLiabilitySchema.safeParse(body);
  if (!result.success) {
    return validationError(result);
  }

  await connectDB();
  const data = result.data;

  const liabilityData = {
    ownerId: new mongoose.Types.ObjectId(userId),
    name: data.name,
    category: data.category,
    currency: data.currency,
    lender: data.lender,
    status: data.status,
    notes: data.notes,
  };

  if (data.principalAmount) {
    liabilityData.principalAmount = mongoose.Types.Decimal128.fromString(data.principalAmount);
  }

  if (data.interestRate) {
    liabilityData.interestRate = mongoose.Types.Decimal128.fromString(data.interestRate);
  }

  if (data.startDate) {
    liabilityData.startDate = new Date(data.startDate);
  }

  if (data.maturityDate) {
    liabilityData.maturityDate = new Date(data.maturityDate);
  }

  if (data.linkedAssetId) {
    // M-5: linked records must be owned by the current user
    await assertOwnedRef(Asset, data.linkedAssetId, userId);
    liabilityData.linkedAssetId = new mongoose.Types.ObjectId(data.linkedAssetId);
  }

  if (data.currentBalance) {
    liabilityData.currentBalance = {
      amount: mongoose.Types.Decimal128.fromString(data.currentBalance.amount),
      asOf: new Date(data.currentBalance.asOf),
      source: data.currentBalance.source || "manual",
    };
  }

  const liability = await Liability.create(liabilityData);

  await logAudit(
    userId,
    "create",
    "liability",
    liability._id.toString(),
    null,
    liability.toJSON(),
    `Created liability "${liability.name}"`,
    requestMeta(request)
  );

  return NextResponse.json(
    {
      liability: {
        ...liability.toJSON(),
        id: liability._id.toString(),
      },
    },
    { status: 201 }
  );
}

export const GET = withErrorHandling(getHandler);
export const POST = withErrorHandling(postHandler);
