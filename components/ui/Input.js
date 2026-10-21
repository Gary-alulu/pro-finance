"use client";
// components/ui/Input.js
// Design system Input primitive with label, hint, prefix, suffix, and error state.

import { forwardRef } from "react";

export const Input = forwardRef(function Input(
  {
    label,
    error,
    helperText,
    prefix,
    suffix,
    className = "",
    containerClassName = "",
    id,
    type = "text",
    ...props
  },
  ref
) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label
          htmlFor={inputId}
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
        {prefix && (
          <span className="pl-3 pr-1 text-xs font-medium text-[var(--color-text-tertiary)] select-none">
            {prefix}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          type={type}
          className={`w-full bg-transparent px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none disabled:bg-[var(--color-surface-2)] disabled:text-[var(--color-text-tertiary)] ${className}`}
          {...props}
        />

        {suffix && (
          <span className="pr-3 pl-1 text-xs font-medium text-[var(--color-text-tertiary)] select-none">
            {suffix}
          </span>
        )}
      </div>

      {error ? (
        <p className="text-xs text-[var(--color-coral-600)] font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-[var(--color-text-tertiary)]">{helperText}</p>
      ) : null}
    </div>
  );
});

export default Input;
