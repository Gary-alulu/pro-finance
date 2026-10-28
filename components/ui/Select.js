"use client";
// components/ui/Select.js
// Universal design system Select & Dropdown component.
// Features:
// - Custom floating popover with backdrop blur, smooth motion, and theme coherence
// - Consistent listing layout with search filtering, active indicators, and checkmarks
// - Full backward compatibility: supports options array OR <option> children
// - Dual onChange compatibility: supports standard event (e.target.value) and direct value
// - Hidden native <select> for form submissions, refs, and accessibility

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Search, X } from "lucide-react";

export const Select = forwardRef(function Select(
  {
    label,
    error,
    helperText,
    options = [],
    children,
    value,
    defaultValue,
    onChange,
    placeholder = "Select...",
    className = "",
    containerClassName = "",
    id,
    name,
    size = "md",
    variant = "default",
    disabled = false,
    required = false,
    searchable,
    align = "left",
    ...props
  },
  ref
) {
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(
    value !== undefined ? value : (defaultValue ?? "")
  );
  const [searchText, setSearchText] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [openUpward, setOpenUpward] = useState(false);

  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);

  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  // Sync controlled value
  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  // Parse structured options from props.options OR props.children (<option>)
  const parsedOptions = useMemo(() => {
    if (Array.isArray(options) && options.length > 0) {
      return options.map((opt) => {
        if (typeof opt === "string" || typeof opt === "number") {
          return { value: String(opt), label: String(opt) };
        }
        return {
          value: opt.value !== undefined ? String(opt.value) : "",
          label: opt.label !== undefined ? String(opt.label) : String(opt.value ?? ""),
          description: opt.description,
          disabled: Boolean(opt.disabled),
          badge: opt.badge,
          icon: opt.icon,
        };
      });
    }

    if (children) {
      const items = [];
      React.Children.forEach(children, (child) => {
        if (!child) return;
        if (child.type === "option") {
          items.push({
            value: child.props.value !== undefined ? String(child.props.value) : "",
            label: child.props.children !== undefined ? String(child.props.children) : String(child.props.value ?? ""),
            disabled: Boolean(child.props.disabled),
          });
        }
      });
      return items;
    }

    return [];
  }, [options, children]);

  // Current selected option
  const selectedOption = useMemo(() => {
    return parsedOptions.find((o) => String(o.value) === String(internalValue));
  }, [parsedOptions, internalValue]);

  // Should we show search bar? Auto-enable if >= 7 options unless explicitly disabled
  const shouldSearch = searchable ?? parsedOptions.length >= 7;

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchText.trim()) return parsedOptions;
    const q = searchText.toLowerCase();
    return parsedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        String(opt.value).toLowerCase().includes(q) ||
        (opt.description && opt.description.toLowerCase().includes(q))
    );
  }, [parsedOptions, searchText]);

  // Check viewport clearance to determine if we open upward or downward
  const checkPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    setOpenUpward(spaceBelow < 250 && spaceAbove > spaceBelow);
  }, []);

  // Handle open toggle
  const toggleOpen = useCallback(() => {
    if (disabled) return;
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        checkPosition();
        setSearchText("");
        setHighlightedIndex(-1);
      }
      return next;
    });
  }, [disabled, checkPosition]);

  // Focus search input when open
  useEffect(() => {
    if (open && shouldSearch) {
      const t = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open, shouldSearch]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Trigger selection & dispatch change
  const selectValue = useCallback(
    (nextVal) => {
      setInternalValue(nextVal);
      setOpen(false);
      setSearchText("");

      if (onChange) {
        // Construct a synthetic event for callers expecting e.target.value
        const syntheticEvent = {
          target: { value: nextVal, name: name || selectId, id: selectId },
          currentTarget: { value: nextVal, name: name || selectId, id: selectId },
          value: nextVal,
          preventDefault: () => {},
          stopPropagation: () => {},
        };
        onChange(syntheticEvent);
      }
    },
    [onChange, name, selectId]
  );

  // Close on Escape & handle keyboard navigation
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) => {
          const next = prev + 1;
          return next >= filteredOptions.length ? 0 : next;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) => {
          const next = prev - 1;
          return next < 0 ? filteredOptions.length - 1 : next;
        });
      } else if (e.key === "Enter" && highlightedIndex >= 0) {
        e.preventDefault();
        const target = filteredOptions[highlightedIndex];
        if (target && !target.disabled) {
          selectValue(target.value);
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, highlightedIndex, filteredOptions, selectValue]);

  const sizeClasses = {
    sm: "px-2.5 py-1.5 text-xs min-h-[32px] gap-2",
    md: "px-3.5 py-2 text-sm min-h-[38px] gap-2.5",
    lg: "px-4 py-2.5 text-sm sm:text-base min-h-[44px] gap-3",
  };

  const variantClasses = {
    default: error
      ? "border-[var(--color-coral-500)] ring-1 ring-[var(--color-coral-500)]/20 bg-[var(--color-surface)]"
      : open
      ? "border-[var(--color-emerald-500)] ring-2 ring-[var(--color-emerald-500)]/20 bg-[var(--color-surface)]"
      : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-strong)] text-[var(--color-text-primary)]",
    subtle: error
      ? "border-[var(--color-coral-500)] ring-1 ring-[var(--color-coral-500)]/20 bg-[var(--color-surface-2)]"
      : open
      ? "border-[var(--color-emerald-500)] ring-2 ring-[var(--color-emerald-500)]/20 bg-[var(--color-surface)]"
      : "border-[var(--color-border)] bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text-primary)]",
    ghost: open
      ? "border-[var(--color-emerald-500)] ring-2 ring-[var(--color-emerald-500)]/20 bg-[var(--color-surface-2)]"
      : "border-transparent bg-transparent hover:bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]",
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col gap-1.5 ${containerClassName}`}
    >
      {/* Label */}
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider cursor-pointer"
          onClick={toggleOpen}
        >
          {label}
        </label>
      )}

      {/* Hidden native select for form serialization and DOM parity */}
      <select
        ref={ref}
        id={selectId}
        name={name}
        value={internalValue}
        disabled={disabled}
        required={required}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        onChange={(e) => selectValue(e.target.value)}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {parsedOptions.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Custom styled trigger button */}
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={selectId ? `${selectId}-listbox` : undefined}
        disabled={disabled}
        onClick={toggleOpen}
        className={`w-full inline-flex items-center justify-between rounded-[var(--radius-md)] border shadow-xs transition-all duration-150 focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      >
        <span className="flex items-center gap-2 min-w-0 flex-1 text-left truncate">
          {selectedOption?.icon && (
            <span className="flex-shrink-0 text-[var(--color-text-tertiary)]">
              {selectedOption.icon}
            </span>
          )}
          <span
            className={`truncate ${
              selectedOption
                ? "text-[var(--color-text-primary)] font-medium"
                : "text-[var(--color-text-tertiary)]"
            }`}
          >
            {selectedOption?.label || placeholder}
          </span>
        </span>

        <ChevronDown
          className={`w-3.5 h-3.5 flex-shrink-0 text-[var(--color-text-tertiary)] transition-transform duration-200 ${
            open ? "rotate-180 text-[var(--color-emerald-600)]" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Floating Animated Dropdown Listing */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: openUpward ? 6 : -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: openUpward ? 6 : -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className={`absolute ${
              align === "right" ? "right-0" : "left-0"
            } ${
              openUpward ? "bottom-full mb-1.5" : "top-full mt-1.5"
            } z-[90] min-w-full w-max max-w-[min(100vw-2rem,440px)] rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)]/95 shadow-[0_20px_50px_-12px_rgba(26,26,24,0.18)] dark:shadow-[0_24px_64px_-16px_rgba(0,0,0,0.7)] ring-1 ring-black/5 dark:ring-white/10 backdrop-blur-md overflow-hidden flex flex-col`}
          >
            {/* Search filter bar (when searchable / options >= 7) */}
            {shouldSearch && (
              <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/60">
                <Search className="w-3.5 h-3.5 flex-shrink-0 text-[var(--color-text-tertiary)]" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Filter options..."
                  className="w-full bg-transparent text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none"
                  onClick={(e) => e.stopPropagation()}
                />
                {searchText && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchText("");
                      searchInputRef.current?.focus();
                    }}
                    className="p-0.5 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {/* Options list */}
            <div
              ref={listRef}
              role="listbox"
              id={selectId ? `${selectId}-listbox` : undefined}
              className="max-h-64 sm:max-h-72 overflow-y-auto p-1.5 space-y-0.5"
            >
              {filteredOptions.length === 0 ? (
                <div className="py-6 px-3 text-center text-xs text-[var(--color-text-tertiary)]">
                  No matching options found
                </div>
              ) : (
                filteredOptions.map((opt, index) => {
                  const isSelected = String(opt.value) === String(internalValue);
                  const isHighlighted = index === highlightedIndex;

                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={opt.disabled}
                      onClick={() => selectValue(opt.value)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={`group w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-[var(--radius-md)] text-left transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        isSelected
                          ? "bg-[var(--color-emerald-500)]/12 dark:bg-[var(--color-emerald-500)]/22 text-[var(--color-emerald-700)] dark:text-[var(--color-emerald-400)] font-semibold"
                          : isHighlighted
                          ? "bg-[var(--color-surface-2)] text-[var(--color-text-primary)]"
                          : "text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)]"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {opt.icon && (
                          <span className="flex-shrink-0 text-[var(--color-text-tertiary)]">
                            {opt.icon}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs truncate">{opt.label}</p>
                          {opt.description && (
                            <p className="text-[11px] font-normal leading-tight text-[var(--color-text-tertiary)] truncate mt-0.5">
                              {opt.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {opt.badge && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--color-surface-3)] text-[var(--color-text-tertiary)]">
                            {opt.badge}
                          </span>
                        )}
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-[var(--color-emerald-600)] dark:text-[var(--color-emerald-400)]" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error or Helper text */}
      {error ? (
        <p className="text-xs text-[var(--color-coral-600)] font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-[var(--color-text-tertiary)]">{helperText}</p>
      ) : null}
    </div>
  );
});

export default Select;
