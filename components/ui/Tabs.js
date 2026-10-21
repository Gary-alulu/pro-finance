"use client";
// components/ui/Tabs.js
// Segmented control / tab switcher with smooth indicator animation.

import { motion } from "framer-motion";

export default function Tabs({ tabs, activeTab, onChange, className = "" }) {
  return (
    <div
      className={`inline-flex items-center p-1 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-[var(--radius-lg)] select-none ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`relative flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] transition-colors cursor-pointer ${
              isActive
                ? "text-[var(--color-text-primary)]"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="activeTabIndicator"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                className="absolute inset-0 bg-[var(--color-surface)] rounded-[var(--radius-md)] shadow-xs"
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {tab.icon && <tab.icon className="w-3.5 h-3.5" />}
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive
                      ? "bg-[var(--color-surface-3)] text-[var(--color-text-primary)]"
                      : "bg-[var(--color-surface)] text-[var(--color-text-tertiary)]"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
