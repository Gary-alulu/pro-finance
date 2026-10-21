// app/(app)/reports/page.js
// Reports — server shell.

import { auth } from "@/auth";
import ReportsClient from "./ReportsClient";

export const metadata = {
  title: "Reports",
  description: "Tabular reports over your records with CSV export.",
};

export default async function ReportsPage() {
  const session = await auth();
  return <ReportsClient user={session?.user} />;
}
