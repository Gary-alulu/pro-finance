"use client";
// components/charts/TransactionFlowChart.js
// Cumulative money in versus money out over the last 12 months.
//
// The series comes from a server-side aggregation, not from the paginated
// transaction list, so months are never silently dropped.

import { useMemo } from "react";
import {
  ComposedChart,
  Area,
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

function FlowTooltip({ active, payload, label, currency }) {
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

export default function TransactionFlowChart({
  currency = "KES",
  monthly = null,
  loading = false,
}) {
  const data = useMemo(
    () =>
      (monthly || []).map((m) => ({
        label: m.label,
        income: Number(m.income) || 0,
        expenses: Number(m.expenses) || 0,
        net: Number(m.net) || 0,
      })),
    [monthly]
  );

  const hasActivity = data.some((d) => d.income > 0 || d.expenses > 0);

  return (
    <ChartCard
      title="Transaction Flow"
      subtitle="Money in versus money out, last 12 months"
    >
      {loading ? (
        <SkeletonLoader className="h-full w-full rounded-lg" />
      ) : !hasActivity ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={ArrowDownLeft}
            title="No transactions yet"
            description="Record transactions and this shows how money moved in and out of your ledger each month."
            compact
          />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="flowIn" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-emerald-500)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--color-emerald-500)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="flowOut" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-coral-500)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--color-coral-500)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
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
              content={<FlowTooltip currency={currency} />}
              cursor={{ fill: "var(--color-surface-2)" }}
            />
            <Area
              type="monotone"
              dataKey="income"
              name="In"
              stroke="var(--color-emerald-500)"
              strokeWidth={2}
              fill="url(#flowIn)"
            />
            <Area
              type="monotone"
              dataKey="expenses"
              name="Out"
              stroke="var(--color-coral-500)"
              strokeWidth={2}
              fill="url(#flowOut)"
            />
            <Line
              type="monotone"
              dataKey="net"
              name="Net"
              stroke="var(--color-gold-500)"
              strokeWidth={2}
              strokeDasharray="4 3"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
