"use client";
// components/ui/Dropdown.js
// Custom dropdown matching the platform's premium design.
// Uses a button trigger with a floating menu — fully styleable across browsers.

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";

export default function Dropdown({
  value,
  onChange,
  options = [],
  placeholder = "Select...",
  label,
  className = "",
  size = "sm",
  variant = "subtle",
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleEsc(e) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open]);

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-3.5 py-2 text-sm",
  };

  const variants = {
    subtle: "bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] border-[var(--color-border)] text-[var(--color-text-secondary)]",
    default: "bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-primary)]",
    ghost: "bg-transparent hover:bg-[var(--color-surface-2)] border-transparent text-[var(--color-text-secondary)]",
  };

  return (
    <div ref={ref} className={`relative inline-flex flex-col ${className}`}>
      {label && (
        <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">
          {label}
        </span>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`inline-flex items-center gap-2 rounded-[var(--radius-md)] border transition-all duration-150 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed ${sizes[size]} ${variants[variant]} ${open ? "border-[var(--color-emerald-500)] ring-1 ring-[var(--color-emerald-100)]" : ""}`}
      >
        <span className="flex-1 text-left truncate">
          {selected?.label || placeholder}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-[var(--color-text-tertiary)] transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute left-0 top-full z-50 min-w-full w-max max-h-64 overflow-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl py-1.5"
          >
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors ${
                    isSelected
                      ? "bg-[var(--color-emerald-50)] text-[var(--color-emerald-700)]"
                      : "text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)]"
                  }`}
                >
                  <span className="flex-1 text-xs">{opt.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
