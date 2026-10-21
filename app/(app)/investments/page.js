// app/(app)/investments/page.js
// Investments portfolio tracking page — server shell.

import { auth } from "@/auth";
import InvestmentsClient from "./InvestmentsClient";

export const metadata = {
  title: "Investments Portfolio",
  description: "Track equities, fixed income, REITs, funds, and private assets with verified pricing.",
};

export default async function InvestmentsPage({ searchParams }) {
  const session = await auth();
  const sp = await searchParams;
  return (
    <InvestmentsClient
      user={session?.user}
      focusId={typeof sp.focus === "string" ? sp.focus : null}
      newRecord={sp.new === "1"}
    />
  );
}
