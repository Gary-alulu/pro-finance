// app/(app)/asset-liability/reports/page.js
// Dedicated reports & analytics page for Asset & Liability Management.

import { auth } from "@/auth";
import AssetLiabilityReportsClient from "./AssetLiabilityReportsClient";

export const metadata = {
  title: "Asset & Liability Reports",
  description: "Executive balance sheet statements, valuation schedules, and debt reports.",
};

export default async function AssetLiabilityReportsPage() {
  const session = await auth();
  return <AssetLiabilityReportsClient user={session?.user} />;
}
