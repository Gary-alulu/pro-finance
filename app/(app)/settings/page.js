// app/(app)/settings/page.js
// Settings and portfolio preferences — server shell.

import { auth } from "@/auth";
import SettingsClient from "./SettingsClient";

export const metadata = {
  title: "Settings & Preferences",
  description: "Manage default currency, privacy settings, and demo data.",
};

export default async function SettingsPage() {
  const session = await auth();
  return <SettingsClient user={session?.user} />;
}
