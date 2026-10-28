// app/(app)/invoices/settings/page.js
// Invoice settings now live in the Settings Centre so there is one source of truth.

import { redirect } from "next/navigation";

export const metadata = {
  title: "Invoice settings",
  description: "Issuer details, numbering and default invoice messages.",
};

export default function InvoiceSettingsPage() {
  redirect("/settings?section=invoices");
}
