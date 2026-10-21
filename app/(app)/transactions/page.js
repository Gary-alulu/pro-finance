// app/(app)/transactions/page.js
// Transactions ledger page — server component shell.

import { auth } from "@/auth";
import TransactionsClient from "./TransactionsClient";

export const metadata = {
  title: "Transaction Ledger",
  description: "Connected financial transactions with evidence verification tracking.",
};

export default async function TransactionsPage({ searchParams }) {
  const session = await auth();
  const sp = await searchParams;
  return (
    <TransactionsClient
      user={session?.user}
      focusId={typeof sp.focus === "string" ? sp.focus : null}
      newRecord={sp.new === "1"}
    />
  );
}
