// app/(app)/command-centre/page.js
// Financial Command Centre page — server entry point.

import { auth } from "@/auth";
import CommandCentreClient from "./CommandCentreClient";

export const metadata = {
  title: "Command Centre",
  description: "Proactive financial monitoring, early-warning alerts, and priority action queue.",
};

export default async function CommandCentrePage() {
  const session = await auth();
  return <CommandCentreClient user={session?.user} />;
}
