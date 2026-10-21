"use client";
// components/ui/Button.js
// Design system button primitive with variants, sizes, and loading state.

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

const variants = {
  primary:
    "bg-[var(--color-emerald-600)] hover:bg-[var(--color-emerald-700)] text-white shadow-sm hover:shadow active:scale-[0.98]",
  secondary:
    "bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text-primary)] border border-[var(--color-border)] active:scale-[0.98]",
  outline:
    "bg-transparent hover:bg-[var(--color-surface-2)] text-[var(--color-text-primary)] border border-[var(--color-border-strong)] active:scale-[0.98]",
  ghost:
    "bg-transparent hover:bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
  danger:
    "bg-[var(--color-coral-600)] hover:bg-[var(--color-coral-700)] text-white shadow-sm active:scale-[0.98]",
  accent:
    "bg-[var(--color-gold-500)] hover:bg-[var(--color-gold-700)] text-white shadow-sm active:scale-[0.98]",
};

const sizes = {
  sm: "text-xs px-2.5 py-1.5 rounded-[var(--radius-sm)] gap-1.5 font-medium",
  md: "text-sm px-3.5 py-2 rounded-[var(--radius-md)] gap-2 font-medium",
  lg: "text-base px-5 py-2.5 rounded-[var(--radius-lg)] gap-2.5 font-medium",
};

export const Button = forwardRef(function Button(
  {
    children,
    variant = "primary",
    size = "md",
    className = "",
    disabled = false,
    loading = false,
    icon: Icon,
    iconRight: IconRight,
    type = "button",
    ...props
  },
  ref
) {
  const baseClass =
    "inline-flex items-center justify-center transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none select-none";
  const variantClass = variants[variant] || variants.primary;
  const sizeClass = sizes[size] || sizes.md;

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={`${baseClass} ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : Icon ? (
        <Icon className="w-4 h-4 shrink-0" />
      ) : null}
      {children}
      {!loading && IconRight ? <IconRight className="w-4 h-4 shrink-0" /> : null}
    </button>
  );
});

export default Button;
