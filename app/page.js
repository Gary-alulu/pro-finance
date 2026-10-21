// app/page.js
// Root redirect — sends authenticated users to /overview, unauthenticated to /login.

export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function RootPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/overview");
  } else {
    redirect("/login");
  }
}
