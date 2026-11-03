// app/(app)/assets/[id]/page.js
import { auth } from "@/auth";
import AssetsClient from "../AssetsClient";

export const metadata = {
  title: "Asset Details",
  description: "View asset valuation, ownership details, and linked obligations.",
};

export default async function AssetDetailPage({ params }) {
  const session = await auth();
  const { id } = await params;
  return <AssetsClient user={session?.user} initialTab="assets" focusId={id} />;
}
