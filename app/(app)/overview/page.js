// app/(app)/overview/page.js
// Dashboard — primary landing page after login.
// Server Component: reads session and passes to client widgets.

import { auth } from "@/auth";
import OverviewClient from "./OverviewClient";

export const metadata = { title: "Overview" };

export default async function OverviewPage() {
  const session = await auth();
  return <OverviewClient user={session?.user} />;
}
