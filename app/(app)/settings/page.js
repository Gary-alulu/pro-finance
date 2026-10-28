// app/(app)/settings/page.js
// Settings Centre — server shell. Loads the persisted preferences, account
// identity, storage metadata, and AI runtime status, then hands them to the
// SettingsCenter client orchestrator.

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  getUserSettings,
  getStorageMeta,
  aiProviderStatus,
} from "@/lib/settings/server";
import SettingsCenter from "@/components/settings/SettingsCenter";

export const metadata = {
  title: "Settings Centre",
  description:
    "Unified system preferences: profile, financial rules, invoice branding, AI permissions, document security, and financial map controls.",
};

export default async function SettingsPage({ searchParams }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const resolvedParams = searchParams ? await searchParams : {};

  const [data, storage] = await Promise.all([
    getUserSettings(session.user.id),
    getStorageMeta(session.user.id),
  ]);

  if (!data?.settings) {
    redirect("/auth/login");
  }

  const ai = aiProviderStatus();

  return (
    <SettingsCenter
      initialSettings={data.settings}
      initialUser={data.user}
      meta={{ storage, ai }}
      initialSection={resolvedParams?.section}
    />
  );
}
