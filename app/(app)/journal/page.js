// app/(app)/journal/page.js
// Personal Financial Command Journal — Server component entry point.

import { auth } from "@/auth";
import JournalClient from "./JournalClient";

export const metadata = {
  title: "Financial Command Journal",
  description: "Record financial decisions, track accountability, and review outcomes.",
};

export default async function JournalPage() {
  const session = await auth();
  return <JournalClient initialUser={session?.user} />;
}
