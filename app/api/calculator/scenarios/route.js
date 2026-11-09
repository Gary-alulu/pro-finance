// app/api/calculator/scenarios/route.js
// GET  /api/calculator/scenarios — list multi-scenario comparison models
// POST /api/calculator/scenarios — create a new comparison scenario

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import CalculationScenario from "@/lib/db/models/CalculationScenario";
import { requireUserId, withErrorHandling, validationError } from "@/lib/auth/session";
import { createCalculationScenarioSchema } from "@/lib/validations/schemas";
import { readJsonBody } from "@/lib/security/sanitize";

async function getHandler(request) {
  const userId = await requireUserId();
  await connectDB();

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  const filter = { ownerId: userId };
  if (type && type !== "all") filter.calculatorType = type;

  const scenarios = await CalculationScenario.find(filter)
    .sort({ updatedAt: -1 })
    .lean();

  return NextResponse.json({
    scenarios: scenarios.map((s) => ({
      ...s,
      id: s._id.toString(),
      _id: undefined,
    })),
  });
}

async function postHandler(request) {
  const userId = await requireUserId();
  const body = await readJsonBody(request);
  const parsed = createCalculationScenarioSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(parsed);
  }

  await connectDB();

  const scenario = await CalculationScenario.create({
    ownerId: userId,
    ...parsed.data,
  });

  return NextResponse.json(
    {
      success: true,
      scenario: {
        ...scenario.toObject(),
        id: scenario._id.toString(),
      },
    },
    { status: 201 }
  );
}

export const GET = withErrorHandling(getHandler);
export const POST = withErrorHandling(postHandler);

