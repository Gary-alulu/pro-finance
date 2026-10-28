// app/(app)/invoices/page.js
// Invoice workspace overview. Stage 1 reads browser drafts in the client.

import InvoicesClient from "./InvoicesClient";

export const metadata = {
  title: "Invoices",
  description: "Draft, review and preview invoices with decimal-safe totals.",
};

export default function InvoicesPage() {
  return <InvoicesClient />;
}
