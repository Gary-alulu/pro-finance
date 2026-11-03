// app/(app)/liabilities/page.js
// Dedicated Liabilities & Debt Register command surface

import { auth } from "@/auth";
import AssetsClient from "../assets/AssetsClient";

export const metadata = {
  title: "Liabilities & Debt Register",
  description: "Track loan terms, interest rates, maturities, and debt repayments.",
};

export default async function LiabilitiesPage({ searchParams }) {
  const session = await auth();
  const sp = await searchParams;
  return (
    <AssetsClient
      user={session?.user}
      initialTab="liabilities"
      focusId={typeof sp?.focus === "string" ? sp.focus : null}
      newRecord={sp?.new === "liability" ? "liability" : null}
    />
  );
}
