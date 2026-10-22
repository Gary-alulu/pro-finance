"use client";
// components/charts/ChartCard.js
// Shared card shell for every chart so all visualisations stay identical in
// surface, border, radius and shadow.

export default function ChartCard({
  title,
  subtitle,
  action,
  children,
  className = "",
}) {
  return (
    <div
      className={`p-5 h-full flex flex-col ${className}`}
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            {title && (
              <h3
                className="text-sm font-semibold truncate"
                style={{ color: "var(--color-text-primary)" }}
              >
                {title}
              </h3>
            )}
            {subtitle && (
              <p
                className="mt-1 text-xs"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                {subtitle}
              </p>
            )}
          </div>
          {action}
        </div>
      )}
      <div className="flex-1" style={{ minHeight: "12rem" }}>
        {children}
      </div>
    </div>
  );
}
