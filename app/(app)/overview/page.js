// app/(app)/overview/page.js
// Dashboard — primary landing page after login.
// Server Component: fetches dashboard data on the server and streams it into
// the client widgets as initialData (no client fetch waterfall on first paint).

import { Suspense } from "react";
import { auth } from "@/auth";
import OverviewClient from "./OverviewClient";
import OverviewSkeleton from "./OverviewSkeleton";
import {
  getNetWorthSummary,
  getNetWorthSnapshots,
  getAssetAllocation,
  getRecentTransactions,
  getAccountability,
} from "@/lib/data/dashboard";
import { getUserSettings } from "@/lib/settings/server";

export const metadata = { title: "Overview" };

async function OverviewData({ user }) {
  const userId = user?.id;
  if (!userId) return <OverviewClient user={user} />;

  const [summary, attention, snapshots, allocation, transactions, openItems, account] =
    await Promise.all([
      getNetWorthSummary(userId, user?.preferredCurrency),
      getAccountability(userId, { status: "open", limit: 1 }),
      getNetWorthSnapshots(userId),
      getAssetAllocation(userId),
      getRecentTransactions(userId, 8),
      getAccountability(userId, { status: "open", limit: 6 }),
      getUserSettings(userId),
    ]);

  const settings = account?.settings;

  return (
    <OverviewClient
      user={user}
      initialSummary={summary}
      initialAttention={attention.summary}
      initialSnapshots={snapshots}
      initialAllocation={allocation}
      initialTransactions={transactions}
      initialAccountability={openItems.items}
      initialHideValues={Boolean(
        settings?.financial?.hideBalancesByDefault ||
          settings?.security?.hideSensitiveValues
      )}
      dashboardLayout={settings?.appearance?.dashboardLayout || "balanced"}
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
