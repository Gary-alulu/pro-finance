"use client";
// components/ui/Textarea.js
// Design system textarea primitive matching Input's label, hint and error states.

import { forwardRef } from "react";

export const Textarea = forwardRef(function Textarea(
  {
    label,
    error,
    helperText,
    className = "",
    containerClassName = "",
    id,
    rows = 3,
    ...props
  },
  ref
) {
  const textareaId =
    id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label
          htmlFor={textareaId}
          className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider"
        >
          {label}
        </label>
      )}

      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        className={`w-full resize-y rounded-[var(--radius-md)] border bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] shadow-xs transition-all focus:outline-none ${
          error
            ? "border-[var(--color-coral-500)] focus:ring-2 focus:ring-[var(--color-coral-100)]"
            : "border-[var(--color-border)] focus:border-[var(--color-emerald-500)] focus:ring-2 focus:ring-[var(--color-emerald-100)]"
        } ${className}`}
        {...props}
      />

      {error ? (
        <p className="text-xs text-[var(--color-coral-600)] font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-[var(--color-text-tertiary)]">{helperText}</p>
      ) : null}
    </div>
  );
});

export default Textarea;
