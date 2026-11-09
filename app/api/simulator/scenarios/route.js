// app/api/simulator/scenarios/route.js
// GET  /api/simulator/scenarios — list saved scenarios
// POST /api/simulator/scenarios — create new scenario

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import FinancialScenario from "@/lib/db/models/FinancialScenario";
import { requireUserId, withErrorHandling, apiError } from "@/lib/auth/session";
import { DEFAULT_ASSUMPTIONS } from "@/lib/simulator/engine";
import mongoose from "mongoose";

async function getHandler() {
  const userId = await requireUserId();
  await connectDB();

  const scenarioDocs = await FinancialScenario.find({
    ownerId: userId,
    status: "active",
  })
    .sort({ isDefault: -1, updatedAt: -1 })
    .lean();

  const scenarios = scenarioDocs.map((s) => ({
    ...s,
    id: s._id.toString(),
    _id: undefined,
  }));

  return NextResponse.json({ scenarios });
}

async function postHandler(request) {
  const userId = await requireUserId();
  await connectDB();

  const body = await request.json().catch(() => ({}));
  const { name, description, timeHorizonYears, assumptions, baseSnapshot } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return apiError("Scenario name is required", 400);
  }

  const newScenario = await FinancialScenario.create({
    ownerId: userId,
    name: name.trim().slice(0, 120),
    description: (description || "").trim().slice(0, 500),
    timeHorizonYears: Math.max(1, Math.min(40, Number(timeHorizonYears) || 5)),
    assumptions: {
      ...DEFAULT_ASSUMPTIONS,
      ...(assumptions || {}),
    },
    baseSnapshot: baseSnapshot
      ? {
          takenAt: baseSnapshot.takenAt ? new Date(baseSnapshot.takenAt) : new Date(),
          currency: baseSnapshot.currency || "KES",
          recordedCash: baseSnapshot.recordedCash
            ? mongoose.Types.Decimal128.fromString(baseSnapshot.recordedCash.toString())
            : undefined,
          recordedInvestments: baseSnapshot.recordedInvestments
            ? mongoose.Types.Decimal128.fromString(baseSnapshot.recordedInvestments.toString())
            : undefined,
          recordedOtherAssets: baseSnapshot.recordedOtherAssets
            ? mongoose.Types.Decimal128.fromString(baseSnapshot.recordedOtherAssets.toString())
            : undefined,
          recordedLiabilities: baseSnapshot.recordedLiabilities
            ? mongoose.Types.Decimal128.fromString(baseSnapshot.recordedLiabilities.toString())
            : undefined,
          recordedNetWorth: baseSnapshot.recordedNetWorth
            ? mongoose.Types.Decimal128.fromString(baseSnapshot.recordedNetWorth.toString())
            : undefined,
        }
      : undefined,
    isDefault: false,
    status: "active",
  });

  return NextResponse.json({ scenario: newScenario }, { status: 201 });
}

export const GET = withErrorHandling(getHandler);
export const POST = withErrorHandling(postHandler);
