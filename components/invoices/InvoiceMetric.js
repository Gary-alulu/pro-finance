// components/invoices/InvoiceMetric.js
// Compact overview metric for the invoices dashboard.

const TONES = {
  emerald: {
    background: "var(--color-emerald-50)",
    color: "var(--color-emerald-700)",
  },
  gold: {
    background: "var(--color-gold-50)",
    color: "var(--color-gold-700)",
  },
  coral: {
    background: "var(--color-coral-50)",
    color: "var(--color-coral-700)",
  },
  neutral: {
    background: "var(--color-surface-2)",
    color: "var(--color-text-secondary)",
  },
};

export default function InvoiceMetric({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
}) {
  const palette = TONES[tone] || TONES.neutral;

  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-xs transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
          {label}
        </p>
        {Icon && (
          <span
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[var(--radius-md)]"
            style={{ background: palette.background, color: palette.color }}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        )}
      </div>
      <p className="mt-2 truncate text-lg font-semibold tabular-nums text-[var(--color-text-primary)]">
        {value}
      </p>
      {hint && (
        <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-text-tertiary)]">
          {hint}
        </p>
      )}
    </div>
  );
}
