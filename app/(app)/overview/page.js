// app/(app)/overview/page.js
// Functional Specification 01: Financial Dashboard & Overview.
// Server Component: fetches verified dashboard overview on the server
// and streams it into the client components as initialData.

import { Suspense } from "react";
import { auth } from "@/auth";
import OverviewClient from "./OverviewClient";
import OverviewSkeleton from "./OverviewSkeleton";
import { getDashboardOverview } from "@/lib/services/dashboard";
import { getUserSettings } from "@/lib/settings/server";

export const metadata = {
  title: "Financial Dashboard & Overview | ProFinance",
  description: "Personal Wealth Intelligence & Accountability Platform financial command surface.",
};

async function OverviewData({ user }) {
  const userId = user?.id;
  if (!userId) return <OverviewClient user={user} />;

  // getUserSettings is request-cached and already loaded by the layout.
  const account = await getUserSettings(userId);
  const settings = account?.settings;

  const overview = await getDashboardOverview(userId, {
    period: "30d",
    reportingCurrency:
      settings?.financial?.reportingCurrency ||
      user?.preferredCurrency ||
      "KES",
  });

  return (
    <OverviewClient
      user={user}
      initialOverview={overview}
      initialHideValues={Boolean(
        settings?.financial?.hideBalancesByDefault ||
          settings?.security?.hideSensitiveValues
      )}
      dashboardLayout={settings?.appearance?.dashboardLayout || "balanced"}
      initialCurrency={
        settings?.financial?.reportingCurrency ||
        user?.preferredCurrency ||
        "KES"
      }
    />
  );
}

export default async function OverviewPage() {
  const session = await auth();
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <OverviewData user={session?.user} />
    </Suspense>
  );
}
