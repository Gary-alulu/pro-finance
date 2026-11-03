// app/(app)/assets-liabilities/page.js
// Main financial command surface for Asset & Liability Management.

import { auth } from "@/auth";
import AssetsLiabilitiesOverviewClient from "./AssetsLiabilitiesOverviewClient";

export const metadata = {
  title: "Assets & Liabilities Hub",
  description: "Comprehensive balance sheet, valuations, and debt management command surface.",
};

export default async function AssetsLiabilitiesPage() {
  const session = await auth();
  return <AssetsLiabilitiesOverviewClient user={session?.user} />;
}
