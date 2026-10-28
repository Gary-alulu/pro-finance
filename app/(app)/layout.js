// app/(app)/layout.js
// Root layout for all protected application routes.
// Server component — reads session and passes user data to child components.

export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import AppShell from "@/components/layout/AppShell";
import { getUserSettings } from "@/lib/settings/server";

export default async function AppLayout({ children }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const account = await getUserSettings(session.user.id);

  return (
    <AppShell user={session.user} settings={account?.settings}>
      {children}
    </AppShell>
  );
}
