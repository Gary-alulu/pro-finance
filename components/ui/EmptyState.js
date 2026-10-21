"use client";
// components/ui/EmptyState.js
// Illustrated empty state for lists, charts, and data-free sections.

import { motion } from "framer-motion";

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`flex flex-col items-center justify-center text-center ${compact ? "py-8 px-4" : "py-16 px-6"}`}
    >
      {Icon && (
        <div
          className="rounded-xl flex items-center justify-center mb-4"
          style={{
            width: compact ? "44px" : "56px",
            height: compact ? "44px" : "56px",
            background: "var(--color-surface-2)",
          }}
        >
          <Icon
            size={compact ? 20 : 26}
            style={{ color: "var(--color-text-tertiary)" }}
          />
        </div>
      )}

      {title && (
        <p
          className="font-medium mb-1"
          style={{
            color: "var(--color-text-primary)",
            fontSize: compact ? "0.875rem" : "1rem",
          }}
        >
          {title}
        </p>
      )}

      {description && (
        <p
          style={{
            color: "var(--color-text-tertiary)",
            fontSize: compact ? "0.8rem" : "0.875rem",
            maxWidth: "28rem",
            lineHeight: 1.6,
          }}
        >
          {description}
        </p>
      )}

      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}
