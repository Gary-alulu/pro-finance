// app/(app)/settings/page.js
// Settings and portfolio preferences — server shell.

import { auth } from "@/auth";
import SettingsClient from "./SettingsClient";

export const metadata = {
  title: "Settings & Profile",
  description: "Manage your account profile, credentials, and reporting currency.",
};

export default async function SettingsPage() {
  const session = await auth();
  return <SettingsClient user={session?.user} />;
}
