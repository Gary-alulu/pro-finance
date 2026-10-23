// app/api/projections/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Asset from "@/lib/db/models/Asset";
import Liability from "@/lib/db/models/Liability";
import InvestmentHolding from "@/lib/db/models/InvestmentHolding";
import { requireUserId, withErrorHandling } from "@/lib/auth/session";
import { projectWealth } from "@/lib/projections/scenarioAnalysis";

async function postHandler(request) {
  const userId = await requireUserId();
  await connectDB();
  const body = await request.json().catch(() => ({}));
  const [assets, liabilities, investments] = await Promise.all([
    Asset.find({ ownerId: userId }).lean(),
    Liability.find({ ownerId: userId }).lean(),
    InvestmentHolding.find({ ownerId: userId }).lean(),
  ]);
  const result = projectWealth({
    assets,
    liabilities,
    investments,
    scenarios: body.scenarios,
    years: body.years || 10,
    inflationRate: body.inflationRate || 0,
  });
  return NextResponse.json(result);
}

export const POST = withErrorHandling(postHandler);
export const GET = withErrorHandling(async () => {
  return NextResponse.json({ message: "Use POST with scenarios" });
});
