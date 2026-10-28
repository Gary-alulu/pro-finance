"use client";
// components/ui/Dropdown.js
// Custom dropdown matching the platform's unified design system.
// Wraps Select with a direct-value onChange signature: onChange(selectedValue).

import { forwardRef } from "react";
import Select from "./Select";

export const Dropdown = forwardRef(function Dropdown(
  {
    value,
    onChange,
    options = [],
    placeholder = "Select...",
    label,
    className = "",
    containerClassName = "",
    size = "sm",
    variant = "subtle",
    disabled = false,
    ...props
  },
  ref
) {
  return (
    <Select
      ref={ref}
      value={value}
      onChange={(e) => {
        const val = e && e.target ? e.target.value : e;
        onChange?.(val);
      }}
      options={options}
      placeholder={placeholder}
      label={label}
      size={size}
      variant={variant}
      disabled={disabled}
      className={className}
      containerClassName={containerClassName}
      {...props}
    />
  );
});

export default Dropdown;
