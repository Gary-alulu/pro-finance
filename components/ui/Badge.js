"use client";
// components/ui/Badge.js
// Status and category badge indicator.

const tones = {
  emerald:
    "bg-[var(--color-emerald-50)] text-[var(--color-emerald-700)] border-[var(--color-emerald-200)]",
  gold:
    "bg-[var(--color-gold-50)] text-[var(--color-gold-700)] border-[var(--color-gold-300)]",
  coral:
    "bg-[var(--color-coral-50)] text-[var(--color-coral-700)] border-[var(--color-coral-300)]",
  neutral:
    "bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] border-[var(--color-border)]",
  blue:
    "bg-sky-50 text-sky-700 border-sky-200",
  purple:
    "bg-purple-50 text-purple-700 border-purple-200",
};

export default function Badge({
  children,
  tone = "neutral",
  size = "md",
  className = "",
  dot = false,
}) {
  const toneClass = tones[tone] || tones.neutral;
  const sizeClass =
    size === "sm"
      ? "text-[11px] px-2 py-0.5 gap-1 font-medium"
      : "text-xs px-2.5 py-1 gap-1.5 font-medium";

  return (
    <span
      className={`inline-flex items-center rounded-full border ${toneClass} ${sizeClass} ${className} select-none`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            tone === "emerald"
              ? "bg-[var(--color-emerald-500)]"
              : tone === "coral"
              ? "bg-[var(--color-coral-500)]"
              : tone === "gold"
              ? "bg-[var(--color-gold-500)]"
              : tone === "blue"
              ? "bg-sky-500"
              : tone === "purple"
              ? "bg-purple-500"
              : "bg-[var(--color-text-tertiary)]"
          }`}
        />
      )}
      {children}
    </span>
  );
}
