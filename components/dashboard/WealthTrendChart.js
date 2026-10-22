"use client";
// components/dashboard/WealthTrendChart.js
// Net worth history line chart using Recharts.
// Shows an informative empty state when no snapshots exist — never fabricates data.

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/finance/currency";
import EmptyState from "@/components/ui/EmptyState";
import SkeletonLoader from "@/components/ui/SkeletonLoader";

const PERIODS = [
  { label: "3M", months: 3 },
  { label: "6M", months: 6 },
  { label: "1Y", months: 12 },
  { label: "All", months: null },
];

function CustomTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2.5 rounded-lg text-sm"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        boxShadow: "var(--shadow-md)",
      }}
    >
      <p style={{ color: "var(--color-text-tertiary)", fontSize: "0.75rem" }}>{label}</p>
      <p className="font-semibold metric-value" style={{ color: "var(--color-text-primary)" }}>
        {formatCurrency(payload[0].value, currency)}
      </p>
    </div>
  );
}

export default function WealthTrendChart({ currency = "KES", initialSnapshots = null }) {
  const [snapshots, setSnapshots] = useState(initialSnapshots || []);
  const [loading, setLoading] = useState(initialSnapshots === null);
  const [period, setPeriod] = useState("All");

  useEffect(() => {
    if (initialSnapshots !== null) return;

    async function load() {
      try {
        const res = await fetch("/api/networth/snapshots");
        if (!res.ok) throw new Error();
        const data = await res.json();
        setSnapshots(data.snapshots || []);
      } catch {
        setSnapshots([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [initialSnapshots]);

  const currentPeriod = PERIODS.find((p) => p.label === period);
  const filtered = currentPeriod?.months
    ? snapshots.filter((s) => {
        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - currentPeriod.months);
        return new Date(s.takenAt) >= cutoff;
      })
    : snapshots;

  const chartData = filtered.map((s) => ({
    date: format(new Date(s.takenAt), "MMM d"),
    value: parseFloat(s.netWorth),
  }));

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
      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-sm font-semibold"
          style={{ color: "var(--color-text-primary)" }}
        >
          Wealth Trend
        </h3>

        {/* Period selector */}
        <div
          className="flex gap-1 p-1 rounded-lg"
          style={{ background: "var(--color-surface-2)" }}
        >
          {PERIODS.map((p) => (
            <button
              key={p.label}
              onClick={() => setPeriod(p.label)}
              className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
              style={{
                background: period === p.label ? "var(--color-surface)" : "transparent",
                color:
                  period === p.label
                    ? "var(--color-text-primary)"
                    : "var(--color-text-tertiary)",
                boxShadow: period === p.label ? "var(--shadow-xs)" : "none",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex-1" style={{ minHeight: "12rem" }}>
          <SkeletonLoader className="h-full w-full rounded-lg" />
        </div>
      ) : chartData.length < 2 ? (
        <div className="flex-1 flex items-center justify-center" style={{ minHeight: "12rem" }}>
          <EmptyState
            icon={TrendingUp}
            title="No trend data yet"
            description="Net worth snapshots will appear here as you record financial data over time. The chart will never fabricate historical values."
            compact
          />
        </div>
      ) : (
        <div className="flex-1" style={{ minHeight: "12rem" }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatCurrency(v, currency).replace(/\.00$/, "")}
                width={80}
              />
              <Tooltip content={<CustomTooltip currency={currency} />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--color-emerald-500)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: "var(--color-emerald-500)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
