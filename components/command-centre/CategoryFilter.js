"use client";
// components/command-centre/CategoryFilter.js
// Horizontal pill filter bar for alert categories.

import { motion } from "framer-motion";
import { CATEGORY_META, ALERT_CATEGORIES } from "@/lib/command-centre/constants";

const ALL_OPTION = { id: "all", label: "All Alerts", shortLabel: "All" };

export default function CategoryFilter({ selected, onChange, alertCounts = {} }) {
  const options = [
    ALL_OPTION,
    ...Object.values(CATEGORY_META),
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none" role="tablist" aria-label="Filter alerts by category">
      {options.map((opt) => {
        const count = opt.id === "all"
          ? Object.values(alertCounts).reduce((s, n) => s + n, 0)
          : (alertCounts[opt.id] ?? 0);
        const active = selected === opt.id;

        return (
          <button
            key={opt.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.id)}
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0"
            style={{
              color: active ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
              background: active ? "var(--color-surface-2)" : "transparent",
              border: active
                ? "1px solid var(--color-border)"
                : "1px solid transparent",
            }}
          >
            {active && (
              <motion.span
                layoutId="cat-filter-active"
                className="absolute inset-0 rounded-full"
                style={{
                  background: "rgba(16,185,129,0.1)",
                  border: "1px solid rgba(16,185,129,0.2)",
                }}
                transition={{ duration: 0.2 }}
              />
            )}
            <span className="relative z-10">{opt.shortLabel || opt.label}</span>
            {count > 0 && (
              <span
                className="relative z-10 px-1.5 py-0.5 rounded-full font-semibold"
                style={{
                  fontSize: "0.65rem",
                  background: active ? "rgba(16,185,129,0.2)" : "var(--color-surface-2)",
                  color: active ? "var(--color-emerald-400)" : "var(--color-text-tertiary)",
                }}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
