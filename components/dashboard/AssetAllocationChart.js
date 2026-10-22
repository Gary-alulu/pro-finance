"use client";
// components/dashboard/AssetAllocationChart.js
// Donut chart showing asset composition by category.

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { PieChart as PieIcon } from "lucide-react";
import { formatCurrency } from "@/lib/finance/currency";
import EmptyState from "@/components/ui/EmptyState";
import SkeletonLoader from "@/components/ui/SkeletonLoader";

const CATEGORY_COLORS = {
  cash:           "#10b981",
  bank_account:   "#34d399",
  property:       "#059669",
  vehicle:        "#6ee7b7",
  listed_equity:  "#e8b84b",
  private_equity: "#c49a24",
  retirement:     "#f0c97a",
  bond:           "#8a6b14",
  crypto:         "#f04e3e",
  receivable:     "#a7f3d0",
  other:          "#9d9a92",
};

const CATEGORY_LABELS = {
  cash: "Cash", bank_account: "Bank Accounts", property: "Property",
  vehicle: "Vehicles", listed_equity: "Listed Equity", private_equity: "Private Equity",
  retirement: "Retirement", bond: "Bonds", crypto: "Crypto",
  receivable: "Receivables", other: "Other",
};

function CustomTooltip({ active, payload, currency }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      className="px-3 py-2.5 rounded-lg text-sm"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        boxShadow: "var(--shadow-md)",
      }}
    >
      <p className="font-medium" style={{ color: "var(--color-text-primary)" }}>{d.label}</p>
      <p className="metric-value" style={{ color: "var(--color-text-secondary)", fontSize: "0.8rem" }}>
        {formatCurrency(d.amount, currency)} · {d.percent}%
      </p>
    </div>
  );
}

export default function AssetAllocationChart({ currency = "KES", initialData = null }) {
  const [data, setData] = useState(initialData || []);
  const [loading, setLoading] = useState(initialData === null);

  useEffect(() => {
    if (initialData !== null) return;

    async function load() {
      try {
        const res = await fetch("/api/assets?summary=true");
        if (!res.ok) throw new Error();
        const json = await res.json();
        setData(json.byCategory || []);
      } catch {
        setData([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [initialData]);

  const totalAmount = data.reduce((s, d) => s + parseFloat(d.amount || 0), 0);
  const chartData = data.map((d) => ({
    category: d.category,
    label: CATEGORY_LABELS[d.category] || d.category,
    amount: parseFloat(d.amount || 0),
    percent: totalAmount > 0 ? ((parseFloat(d.amount || 0) / totalAmount) * 100).toFixed(1) : "0",
    color: CATEGORY_COLORS[d.category] || "#9d9a92",
  })).filter((d) => d.amount > 0);

  return (
    <div
      className="p-5 h-full flex flex-col"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--color-text-primary)" }}>
        Asset Allocation
      </h3>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <SkeletonLoader className="h-36 w-36 rounded-full" />
          <SkeletonLoader className="h-3 w-28 rounded" />
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={PieIcon}
            title="No assets recorded"
            description="Add assets to see allocation."
            compact
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="flex-1" style={{ minHeight: "9rem" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={68}
                  paddingAngle={2}
                  dataKey="amount"
                  stroke="none"
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.category} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip currency={currency} />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <ul className="mt-4 space-y-2">
            {chartData.slice(0, 5).map((d) => (
              <li key={d.category} className="flex items-center gap-2 text-xs">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: d.color }}
                />
                <span className="flex-1 truncate" style={{ color: "var(--color-text-secondary)" }}>
                  {d.label}
                </span>
                <span className="font-medium tabular-nums" style={{ color: "var(--color-text-primary)" }}>
                  {d.percent}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
