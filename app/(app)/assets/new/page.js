// app/(app)/assets/new/page.js
import { auth } from "@/auth";
import AssetsClient from "../AssetsClient";

export const metadata = {
  title: "New Asset",
  description: "Register a new asset with ownership and valuation details.",
};

export default async function NewAssetPage() {
  const session = await auth();
  return <AssetsClient user={session?.user} initialTab="assets" newRecord="asset" />;
}
