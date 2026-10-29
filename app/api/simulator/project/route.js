// app/api/simulator/project/route.js
// POST /api/simulator/project
// Runs deterministic calculations on arbitrary snapshot and assumptions.

import { NextResponse } from "next/server";
import { requireUserId, withErrorHandling } from "@/lib/auth/session";
import { projectWealth } from "@/lib/simulator/engine";

async function postHandler(request) {
  await requireUserId();

  const body = await request.json().catch(() => ({}));
  const { snapshot, assumptions, timeHorizonYears } = body;

  const result = projectWealth({
    snapshot: snapshot || {},
    assumptions: assumptions || {},
    timeHorizonYears: timeHorizonYears || 5,
  });

  return NextResponse.json(result);
}

export const POST = withErrorHandling(postHandler);
