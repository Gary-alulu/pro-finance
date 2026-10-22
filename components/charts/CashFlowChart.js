"use client";
// components/charts/CashFlowChart.js
// Monthly money-in vs money-out with the net balance as an overlay line.
// Built with Recharts (ComposedChart) — the React charting standard, already
// a project dependency and tree-shaken per component.
//
// Transfers are excluded upstream, so a transfer can never look like income.

import { useMemo } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ArrowDownLeft } from "lucide-react";
import { formatCurrency } from "@/lib/finance/currency";
import ChartCard from "@/components/charts/ChartCard";
import EmptyState from "@/components/ui/EmptyState";
import SkeletonLoader from "@/components/ui/SkeletonLoader";

function CashFlowTooltip({ active, payload, label, currency }) {
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
      <p style={{ color: "var(--color-text-tertiary)", fontSize: "0.75rem" }}>{label}</p>
      <p className="font-semibold metric-value" style={{ color: "var(--color-text-primary)" }}>
        {formatCurrency(d.net, currency)}
      </p>
      <div className="mt-1.5 space-y-0.5 text-xs">
        <p style={{ color: "var(--color-emerald-600)" }}>
          In {formatCurrency(d.income, currency)}
        </p>
        <p style={{ color: "var(--color-coral-600)" }}>
          Out {formatCurrency(d.expenses, currency)}
        </p>
      </div>
    </div>
  );
}

export default function CashFlowChart({
  currency = "KES",
  monthly = null,
  loading = false,
  emptyTitle = "No cash flow yet",
  emptyDescription = "Record transactions and this chart will show what came in and went out each month.",
}) {
  const data = useMemo(
    () =>
      (monthly || []).map((m) => ({
        label: m.label,
        income: Number(m.income) || 0,
        expenses: Number(m.expenses) || 0,
        net: Number(m.net) || 0,
        raw: m,
      })),
    [monthly]
  );

  const hasActivity = data.some((d) => d.income > 0 || d.expenses > 0);

  return (
    <ChartCard
      title="Cash Flow"
      subtitle="Money in and out per month, with the net balance"
    >
      {loading ? (
        <SkeletonLoader className="h-full w-full rounded-lg" />
      ) : !hasActivity ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={ArrowDownLeft}
            title={emptyTitle}
            description={emptyDescription}
            compact
          />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="label"
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
            <Tooltip
              content={<CashFlowTooltip currency={currency} />}
              cursor={{ fill: "var(--color-surface-2)" }}
            />
            <Bar
              dataKey="income"
              name="In"
              fill="var(--color-emerald-500)"
              radius={[4, 4, 0, 0]}
              maxBarSize={22}
            />
            <Bar
              dataKey="expenses"
              name="Out"
              fill="var(--color-coral-500)"
              radius={[4, 4, 0, 0]}
              maxBarSize={22}
            />
            <Line
              type="monotone"
              dataKey="net"
              name="Net"
              stroke="var(--color-gold-500)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: "var(--color-gold-500)" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
