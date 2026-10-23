"use client";
// components/ui/Select.js
// Design system Select primitive with label, error, and styled dropdown arrow.

import { forwardRef } from "react";
import { ChevronDown } from "lucide-react";

export const Select = forwardRef(function Select(
  {
    label,
    error,
    helperText,
    options = [],
    className = "",
    containerClassName = "",
    id,
    children,
    size = "md",
    variant = "default",
    ...props
  },
  ref
) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  const sizeClasses = {
    sm: "px-2.5 py-1.5 text-xs pr-7",
    md: "px-3 py-2 text-sm pr-8",
    lg: "px-4 py-2.5 text-sm pr-9",
  };

  const variantClasses = {
    default: error
      ? "border-[var(--color-coral-500)] focus:border-[var(--color-coral-500)] focus:ring-2 focus:ring-[var(--color-coral-100)]"
      : "border-[var(--color-border)] focus:border-[var(--color-emerald-500)] focus:ring-2 focus:ring-[var(--color-emerald-100)]",
    subtle: error
      ? "border-[var(--color-coral-500)] bg-[var(--color-surface-2)]"
      : "border-[var(--color-border)] bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] focus:border-[var(--color-emerald-500)] focus:bg-[var(--color-surface)] focus:ring-2 focus:ring-[var(--color-emerald-100)]",
  };

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        <select
          ref={ref}
          id={selectId}
          className={`w-full appearance-none rounded-[var(--radius-md)] border bg-[var(--color-surface)] text-[var(--color-text-primary)] transition-all duration-150 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
          {...props}
        >
          {children
            ? children
            : options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 w-4 h-4 text-[var(--color-text-tertiary)]" />
      </div>

      {error ? (
        <p className="text-xs text-[var(--color-coral-600)] font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-[var(--color-text-tertiary)]">{helperText}</p>
      ) : null}
    </div>
  );
});

export default Select;
