// app/api/simulator/scenarios/[id]/route.js
// GET    /api/simulator/scenarios/[id] — get single scenario
// PATCH  /api/simulator/scenarios/[id] — update scenario
// DELETE /api/simulator/scenarios/[id] — archive scenario

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import FinancialScenario from "@/lib/db/models/FinancialScenario";
import { requireUserId, withErrorHandling, apiError } from "@/lib/auth/session";

async function getHandler(request, { params }) {
  const userId = await requireUserId();
  await connectDB();
  const { id } = await params;

  const scenario = await FinancialScenario.findOne({
    _id: id,
    ownerId: userId,
    status: "active",
  });

  if (!scenario) {
    return apiError("Scenario not found", 404);
  }

  return NextResponse.json({ scenario });
}

async function patchHandler(request, { params }) {
  const userId = await requireUserId();
  await connectDB();
  const { id } = await params;

  const body = await request.json().catch(() => ({}));

  const scenario = await FinancialScenario.findOne({
    _id: id,
    ownerId: userId,
    status: "active",
  });

  if (!scenario) {
    return apiError("Scenario not found", 404);
  }

  if (body.name !== undefined) {
    scenario.name = String(body.name).trim().slice(0, 120);
  }
  if (body.description !== undefined) {
    scenario.description = String(body.description).trim().slice(0, 500);
  }
  if (body.timeHorizonYears !== undefined) {
    scenario.timeHorizonYears = Math.max(1, Math.min(40, Number(body.timeHorizonYears) || 5));
  }
  if (body.assumptions && typeof body.assumptions === "object") {
    scenario.assumptions = {
      ...scenario.assumptions.toObject(),
      ...body.assumptions,
    };
  }

  await scenario.save();

  return NextResponse.json({ scenario });
}

async function deleteHandler(request, { params }) {
  const userId = await requireUserId();
  await connectDB();
  const { id } = await params;

  const scenario = await FinancialScenario.findOneAndUpdate(
    { _id: id, ownerId: userId },
    { status: "archived" },
    { new: true }
  );

  if (!scenario) {
    return apiError("Scenario not found", 404);
  }

  return NextResponse.json({ success: true, archivedId: id });
}

export const GET = withErrorHandling(getHandler);
export const PATCH = withErrorHandling(patchHandler);
export const DELETE = withErrorHandling(deleteHandler);
