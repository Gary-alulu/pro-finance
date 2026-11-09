// app/(app)/calculator/saved/page.js
// Saved / Bookmarked Calculations — Server component entry point.

import { auth } from "@/auth";
import SavedClient from "./SavedClient";

export const metadata = {
  title: "Saved Calculations",
  description: "Manage bookmarked financial calculations, assumptions, notes, and tags.",
};

export default async function CalculatorSavedPage() {
  const session = await auth();
  return <SavedClient initialUser={session?.user} />;
}

