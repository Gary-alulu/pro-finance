// app/api/calculator/history/route.js
// GET  /api/calculator/history — list calculation history
// POST /api/calculator/history — manually log a calculation
// DELETE /api/calculator/history — clear unstarred calculation history

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Calculation from "@/lib/db/models/Calculation";
import { requireUserId, withErrorHandling, validationError } from "@/lib/auth/session";
import { saveCalculationSchema } from "@/lib/validations/schemas";
import { readJsonBody } from "@/lib/security/sanitize";

async function getHandler(request) {
  const userId = await requireUserId();
  await connectDB();

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const mode = searchParams.get("mode");
  const isSaved = searchParams.get("isSaved");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
  const skip = parseInt(searchParams.get("skip") || "0", 10);

  const filter = { ownerId: userId };
  if (type && type !== "all") filter.calculatorType = type;
  if (mode && mode !== "all") filter.mode = mode;
  if (isSaved === "true") filter.isSaved = true;
  else if (isSaved === "false") filter.isSaved = false;

  const [items, total] = await Promise.all([
    Calculation.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Calculation.countDocuments(filter),
  ]);

  return NextResponse.json({
    items: items.map((doc) => ({
      ...doc,
      id: doc._id.toString(),
      _id: undefined,
    })),
    total,
    limit,
    skip,
  });
}

async function postHandler(request) {
  const userId = await requireUserId();
  const body = await readJsonBody(request);
  const parsed = saveCalculationSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(parsed);
  }

  await connectDB();

  const calculation = await Calculation.create({
    ownerId: userId,
    ...parsed.data,
    isSaved: true,
  });

  return NextResponse.json({
    success: true,
    calculation: {
      ...calculation.toObject(),
      id: calculation._id.toString(),
    },
  }, { status: 201 });
}

async function deleteHandler(request) {
  const userId = await requireUserId();
  await connectDB();

  const { searchParams } = new URL(request.url);
  const clearAll = searchParams.get("all") === "true";

  // By default, only clear unstarred calculations to avoid losing user's bookmarks
  const filter = { ownerId: userId };
  if (!clearAll) {
    filter.isSaved = false;
  }

  const result = await Calculation.deleteMany(filter);

  return NextResponse.json({
    success: true,
    deletedCount: result.deletedCount,
  });
}

export const GET = withErrorHandling(getHandler);
export const POST = withErrorHandling(postHandler);
export const DELETE = withErrorHandling(deleteHandler);

