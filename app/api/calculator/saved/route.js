// app/api/calculator/saved/route.js
// GET  /api/calculator/saved — list bookmarked calculations
// POST /api/calculator/saved — bookmark a calculation by ID or full payload

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
  const tag = searchParams.get("tag");

  const filter = { ownerId: userId, isSaved: true };
  if (type && type !== "all") filter.calculatorType = type;
  if (tag) filter.tags = tag;

  const items = await Calculation.find(filter)
    .sort({ updatedAt: -1 })
    .lean();

  return NextResponse.json({
    items: items.map((doc) => ({
      ...doc,
      id: doc._id.toString(),
      _id: undefined,
    })),
  });
}

async function postHandler(request) {
  const userId = await requireUserId();
  const body = await readJsonBody(request);

  await connectDB();

  // If calculationId is provided, bookmark existing record
  if (body.calculationId) {
    const existing = await Calculation.findOne({
      _id: body.calculationId,
      ownerId: userId,
    });

    if (!existing) {
      return Response.json({ error: "Calculation not found" }, { status: 404 });
    }

    existing.isSaved = true;
    if (body.title) existing.title = body.title;
    if (body.notes !== undefined) existing.notes = body.notes;
    if (Array.isArray(body.tags)) existing.tags = body.tags;
    await existing.save();

    return NextResponse.json({
      success: true,
      calculation: {
        ...existing.toObject(),
        id: existing._id.toString(),
      },
    });
  }

  // Otherwise, create a new saved calculation
  const parsed = saveCalculationSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed);
  }

  const doc = await Calculation.create({
    ownerId: userId,
    ...parsed.data,
    isSaved: true,
  });

  return NextResponse.json(
    {
      success: true,
      calculation: {
        ...doc.toObject(),
        id: doc._id.toString(),
      },
    },
    { status: 201 }
  );
}

export const GET = withErrorHandling(getHandler);
export const POST = withErrorHandling(postHandler);

