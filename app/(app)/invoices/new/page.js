// app/(app)/invoices/new/page.js
import InvoiceWorkspace from "@/components/invoices/InvoiceWorkspace";

export const metadata = {
  title: "New invoice",
  description: "Create a local invoice draft with a live A4 preview.",
};

export default function NewInvoicePage() {
  return <InvoiceWorkspace />;
}
