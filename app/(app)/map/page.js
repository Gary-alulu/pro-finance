// app/(app)/map/page.js
// Interactive connected Financial Map page.

import FinancialMapCanvas from "@/components/map/FinancialMapCanvas";

export const metadata = {
  title: "Financial Map",
  description: "Interactive visual network of assets, debts, cash flows, and supporting documents.",
};

export default function MapPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
          Interactive Financial Map
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Explore your wealth as an interconnected network. Click any node to inspect details and linked obligations.
        </p>
      </div>

      <FinancialMapCanvas />
    </div>
  );
}
