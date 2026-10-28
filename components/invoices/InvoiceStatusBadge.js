// components/invoices/InvoiceStatusBadge.js
// Status pill shared by the list, detail page and workspace.

import Badge from "@/components/ui/Badge";
import { INVOICE_STATUS_META } from "@/lib/invoices/constants";

export default function InvoiceStatusBadge({
  status = "draft",
  size = "sm",
  className = "",
}) {
  const meta = INVOICE_STATUS_META[status] || INVOICE_STATUS_META.draft;
  return (
    <Badge tone={meta.tone} size={size} dot className={className}>
      {meta.label}
    </Badge>
  );
}
