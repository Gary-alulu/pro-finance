// app/(app)/assets/page.js
// Assets & Liabilities management page — full CRUD, valuation tracker, and debt monitor.

import { auth } from "@/auth";
import AssetsClient from "./AssetsClient";

export const metadata = {
  title: "Assets & Liabilities",
  description: "Track what you own and what you owe with audited valuations.",
};

export default async function AssetsPage({ searchParams }) {
  const session = await auth();
  const sp = await searchParams;
  return (
    <AssetsClient
      user={session?.user}
      initialTab={sp.tab === "liabilities" ? "liabilities" : "assets"}
      focusId={typeof sp.focus === "string" ? sp.focus : null}
      newRecord={sp.new === "asset" || sp.new === "liability" ? sp.new : null}
    />
  );
}
