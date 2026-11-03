// app/api/assets-liabilities/overview/route.js
// GET /api/assets-liabilities/overview — main asset & liability command surface metrics

import { NextResponse } from "next/server";
import { requireUserId, withErrorHandling } from "@/lib/auth/session";
import { getAssetsLiabilitiesOverview } from "@/lib/services/assets-liabilities/getAssetsLiabilitiesOverview";

async function getHandler(request) {
  const userId = await requireUserId();
  const { searchParams } = new URL(request.url);

  const reportingCurrency = searchParams.get("currency") || "KES";
  const staleThresholdDays = parseInt(searchParams.get("staleDays") || "90", 10);

  const overview = await getAssetsLiabilitiesOverview(userId, {
    reportingCurrency,
    staleThresholdDays,
  });

  return NextResponse.json(overview);
}

export const GET = withErrorHandling(getHandler);
