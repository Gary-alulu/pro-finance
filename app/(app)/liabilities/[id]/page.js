// app/(app)/liabilities/[id]/page.js
import { auth } from "@/auth";
import AssetsClient from "../../assets/AssetsClient";

export const metadata = {
  title: "Liability Details",
  description: "View liability balance, terms, interest rates, and repayment history.",
};

export default async function LiabilityDetailPage({ params }) {
  const session = await auth();
  const { id } = await params;
  return <AssetsClient user={session?.user} initialTab="liabilities" focusId={id} />;
}
