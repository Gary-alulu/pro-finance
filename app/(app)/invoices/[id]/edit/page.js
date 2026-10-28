// app/(app)/invoices/[id]/edit/page.js
import { notFound } from "next/navigation";
import InvoiceWorkspace from "@/components/invoices/InvoiceWorkspace";

export const metadata = {
  title: "Edit invoice",
  description: "Edit a local invoice draft with a live A4 preview.",
};

export default async function EditInvoicePage({ params }) {
  const { id } = await params;
  if (!id) notFound();
  return <InvoiceWorkspace id={id} />;
}
