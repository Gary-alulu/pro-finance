"use client";
// components/ui/MetricCard.js
// KPI widget for displaying a single financial metric.

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import Link from "next/link";
import SkeletonLoader from "./SkeletonLoader";

export default function MetricCard({
  id,
  label,
  value,
  subValue,
  change,       // e.g. "+5.2%"
  changeLabel,  // e.g. "vs last month"
  positive,     // true = green, false = red, undefined = neutral
  loading = false,
  href,         // optional — wraps the card in a link to a filtered view
}) {
  const positiveChange = change?.startsWith("+");
  const negativeChange = change?.startsWith("-");

  const card = (
    <div
      id={id}
      className="rounded-xl p-5 h-full"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: "var(--color-text-tertiary)" }}>
        {label}
      </p>

      {loading ? (
        <div className="space-y-2">
          <SkeletonLoader className="h-7 w-32 rounded" />
          <SkeletonLoader className="h-4 w-20 rounded" />
        </div>
      ) : (
        <>
          <p
            className="metric-value text-2xl font-semibold mb-2"
            style={{
              color: positive === true
                ? "var(--color-positive)"
                : positive === false
                ? "var(--color-negative)"
                : "var(--color-text-primary)",
              letterSpacing: "-0.02em",
            }}
          >
            {value ?? "—"}
          </p>

          {subValue && (
            <p className="text-xs mb-2" style={{ color: "var(--color-text-tertiary)" }}>
              {subValue}
            </p>
          )}

          {change && (
            <div className="flex items-center gap-1.5 text-xs">
              {positiveChange ? (
                <TrendingUp size={13} style={{ color: "var(--color-positive)" }} />
              ) : negativeChange ? (
                <TrendingDown size={13} style={{ color: "var(--color-negative)" }} />
              ) : (
                <Minus size={13} style={{ color: "var(--color-text-tertiary)" }} />
              )}
              <span
                style={{
                  color: positiveChange
                    ? "var(--color-positive)"
                    : negativeChange
                    ? "var(--color-negative)"
                    : "var(--color-text-tertiary)",
                  fontWeight: 500,
                }}
              >
                {change}
              </span>
              {changeLabel && (
                <span style={{ color: "var(--color-text-tertiary)" }}>{changeLabel}</span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full transition-opacity hover:opacity-90">
        {card}
      </Link>
    );
  }
  return card;
}
