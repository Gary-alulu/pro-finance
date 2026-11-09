// app/(app)/calculator/history/page.js
// Calculation History — Server component entry point.

import { auth } from "@/auth";
import HistoryClient from "./HistoryClient";

export const metadata = {
  title: "Calculation History",
  description: "View and review historical calculations, audit logs, and restore past runs.",
};

export default async function CalculatorHistoryPage() {
  const session = await auth();
  return <HistoryClient initialUser={session?.user} />;
}

