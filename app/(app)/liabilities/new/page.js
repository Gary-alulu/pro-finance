// app/(app)/liabilities/new/page.js
import { auth } from "@/auth";
import AssetsClient from "../../assets/AssetsClient";

export const metadata = {
  title: "New Liability",
  description: "Record a new debt obligation with terms and repayment schedule.",
};

export default async function NewLiabilityPage() {
  const session = await auth();
  return <AssetsClient user={session?.user} initialTab="liabilities" newRecord="liability" />;
}
