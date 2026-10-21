// app/(app)/accountability/page.js
// Financial Accountability & Integrity Center — server shell.

import { auth } from "@/auth";
import AccountabilityClient from "./AccountabilityClient";

export const metadata = {
  title: "Accountability Center",
  description: "Identify missing evidence, outdated valuations, and discrepancies awaiting review.",
};

export default async function AccountabilityPage() {
  const session = await auth();
  return <AccountabilityClient user={session?.user} />;
}
