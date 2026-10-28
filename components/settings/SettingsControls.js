"use client";
// components/settings/SettingsControls.js
// Shared primitives for the Settings Centre: panel, toggle row, banner, header.

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, Lock } from "lucide-react";

export function SectionHeading({ icon: Icon, title, description, badge }) {
  return (
    <div className="flex items-start gap-3.5 pb-2">
      {Icon && (
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-emerald-600)] shadow-xs">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-xl font-semibold tracking-tight text-[var(--color-text-primary)]">
            {title}
          </h2>
          {badge}
        </div>
        {description && (
          <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)] max-w-2xl">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

export function Panel({ title, description, action, children, className = "" }) {
  return (
    <section
      className={`rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-7 shadow-xs ${className}`}
    >
      {(title || description || action) && (
        <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-[var(--color-border)]/50">
          <div className="min-w-0">
            {title && (
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                {title}
              </h3>
            )}
            {description && (
              <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-text-tertiary)]">
                {description}
              </p>
            )}
          </div>
          {action}
        </div>
      )}
      <div className={title || description ? "mt-5" : ""}>{children}</div>
    </section>
  );
}

export function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  danger = false,
}) {
  return (
    <label
      className={`flex cursor-pointer items-start justify-between gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 transition-colors ${
        disabled ? "opacity-60" : "hover:bg-[var(--color-surface-2)]"
      }`}
    >
      <span className="min-w-0 flex-1">
        <span
          className={`block text-sm font-medium ${
            danger ? "text-[var(--color-coral-600)]" : "text-[var(--color-text-primary)]"
          }`}
        >
          {label}
        </span>
        {description && (
          <span className="mt-1 block text-xs leading-relaxed text-[var(--color-text-tertiary)]">
            {description}
          </span>
        )}
      </span>
      <span className="relative mt-0.5 inline-flex flex-shrink-0 items-center">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={Boolean(checked)}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
        <span
          aria-hidden="true"
          className="h-5 w-9 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface-3)] transition-colors peer-checked:border-[var(--color-emerald-600)] peer-checked:bg-[var(--color-emerald-600)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-emerald-200)]"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4"
        />
      </span>
    </label>
  );
}

export function Banner({ tone = "info", children, onDismiss }) {
  if (!children) return null;
  const meta = {
    success: {
      Icon: CheckCircle2,
      bg: "var(--color-emerald-50)",
      border: "var(--color-emerald-200)",
      color: "var(--color-emerald-700)",
    },
    error: {
      Icon: AlertCircle,
      bg: "var(--color-negative-bg)",
      border: "var(--color-coral-100)",
      color: "var(--color-negative)",
    },
    info: {
      Icon: Info,
      bg: "var(--color-surface-2)",
      border: "var(--color-border)",
      color: "var(--color-text-secondary)",
    },
  }[tone] || {};

  const { Icon } = meta;
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      role={tone === "error" ? "alert" : "status"}
      className="flex items-start gap-2.5 rounded-[var(--radius-lg)] border px-4 py-3 text-xs leading-relaxed"
      style={{ background: meta.bg, borderColor: meta.border, color: meta.color }}
    >
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span className="flex-1 leading-relaxed">{children}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-[11px] font-semibold underline-offset-2 hover:underline"
          style={{ color: meta.color }}
        >
          Dismiss
        </button>
      )}
    </motion.div>
  );
}

export function InlineNote({ icon: Icon = Lock, children }) {
  return (
    <div className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-2)]/60 px-4 py-3">
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--color-text-tertiary)]" aria-hidden="true" />
      <p className="text-xs leading-relaxed text-[var(--color-text-secondary)]">{children}</p>
    </div>
  );
}

export function Row({ label, description, children, htmlFor }) {
  return (
    <div className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 border-b border-[var(--color-border)]/40 last:border-b-0">
      <div className="min-w-0 flex-1">
        <label
          htmlFor={htmlFor}
          className="block text-sm font-medium text-[var(--color-text-primary)]"
        >
          {label}
        </label>
        {description && (
          <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-tertiary)]">
            {description}
          </p>
        )}
      </div>
      <div className="w-full sm:w-auto sm:min-w-[260px] sm:flex-shrink-0">{children}</div>
    </div>
  );
}

export function MotionBanner({ show, tone, children }) {
  return (
    <AnimatePresence>{show && <Banner tone={tone}>{children}</Banner>}</AnimatePresence>
  );
}
