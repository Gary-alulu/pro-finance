// app/api/calculator/scenarios/[id]/route.js
// GET    /api/calculator/scenarios/[id] — retrieve scenario comparison
// PATCH  /api/calculator/scenarios/[id] — update scenario
// DELETE /api/calculator/scenarios/[id] — delete scenario

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import CalculationScenario from "@/lib/db/models/CalculationScenario";
import { requireUserId, withErrorHandling } from "@/lib/auth/session";
import { readJsonBody } from "@/lib/security/sanitize";

async function getHandler(request, { params }) {
  const userId = await requireUserId();
  const { id } = await params;
  await connectDB();

  const scenario = await CalculationScenario.findOne({
    _id: id,
    ownerId: userId,
  }).lean();

  if (!scenario) {
    return Response.json({ error: "Scenario not found" }, { status: 404 });
  }

  return NextResponse.json({
    scenario: {
      ...scenario,
      id: scenario._id.toString(),
      _id: undefined,
    },
  });
}

async function patchHandler(request, { params }) {
  const userId = await requireUserId();
  const { id } = await params;
  const body = await readJsonBody(request);
  await connectDB();

  const scenario = await CalculationScenario.findOne({ _id: id, ownerId: userId });
  if (!scenario) {
    return Response.json({ error: "Scenario not found" }, { status: 404 });
  }

  if (body.title) scenario.title = body.title.trim();
  if (body.description !== undefined) scenario.description = body.description.trim();
  if (Array.isArray(body.scenarios)) scenario.scenarios = body.scenarios;
  if (body.notes !== undefined) scenario.notes = body.notes;
  if (Array.isArray(body.tags)) scenario.tags = body.tags;

  await scenario.save();

  return NextResponse.json({
    success: true,
    scenario: {
      ...scenario.toObject(),
      id: scenario._id.toString(),
    },
  });
}

async function deleteHandler(request, { params }) {
  const userId = await requireUserId();
  const { id } = await params;
  await connectDB();

  const result = await CalculationScenario.deleteOne({ _id: id, ownerId: userId });
  if (result.deletedCount === 0) {
    return Response.json({ error: "Scenario not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export const GET = withErrorHandling(getHandler);
export const PATCH = withErrorHandling(patchHandler);
export const DELETE = withErrorHandling(deleteHandler);

