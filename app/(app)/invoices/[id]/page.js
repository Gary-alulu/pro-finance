// app/(app)/invoices/[id]/page.js
import { notFound } from "next/navigation";
import InvoiceDetailClient from "@/components/invoices/InvoiceDetailClient";

export const metadata = {
  title: "Invoice",
  description: "Review an invoice draft and its calculated totals.",
};

export default async function InvoiceDetailPage({ params }) {
  const { id } = await params;
  if (!id) notFound();
  return <InvoiceDetailClient id={id} />;
}
