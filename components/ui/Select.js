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
    ...props
  },
  ref
) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

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

      <div
        className={`relative flex items-center rounded-[var(--radius-md)] border bg-[var(--color-surface)] transition-all ${
          error
            ? "border-[var(--color-coral-500)] focus-within:ring-2 focus-within:ring-[var(--color-coral-100)]"
            : "border-[var(--color-border)] focus-within:border-[var(--color-emerald-500)] focus-within:ring-2 focus-within:ring-[var(--color-emerald-100)]"
        }`}
      >
        <select
          ref={ref}
          id={selectId}
          className={`w-full appearance-none bg-transparent px-3 py-2 pr-8 text-sm text-[var(--color-text-primary)] focus:outline-none disabled:bg-[var(--color-surface-2)] disabled:text-[var(--color-text-tertiary)] cursor-pointer ${className}`}
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
