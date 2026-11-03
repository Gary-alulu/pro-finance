// app/api/dashboard/overview/route.js
// GET /api/dashboard/overview
// Returns the full deterministic overview payload for the authenticated owner.

import { NextResponse } from "next/server";
import { requireUserId, withErrorHandling } from "@/lib/auth/session";
import { getDashboardOverview } from "@/lib/services/dashboard";

async function handler(request) {
  const userId = await requireUserId();
  const { searchParams } = new URL(request.url);

  const period = searchParams.get("period") || "30d";
  const from = searchParams.get("from") || null;
  const to = searchParams.get("to") || null;
  const currency = searchParams.get("currency") || null;

  const data = await getDashboardOverview(userId, {
    period,
    from,
    to,
    reportingCurrency: currency,
  });

  return NextResponse.json(data);
}

export const GET = withErrorHandling(handler);
