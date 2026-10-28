"use client";
// components/ui/Card.js
// Surface container for grouping related content.

export default function Card({ children, className = "", ...props }) {
  return (
    <div
      className={`rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
