// app/(app)/invoices/settings/page.js
import InvoiceSettingsClient from "./InvoiceSettingsClient";

export const metadata = {
  title: "Invoice settings",
  description: "Issuer details, numbering and default invoice messages.",
};

export default function InvoiceSettingsPage() {
  return <InvoiceSettingsClient />;
}
