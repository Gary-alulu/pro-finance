"use client";
// components/ui/ErrorState.js
// Inline error panel for failed data fetches inside a page.

import { AlertTriangle, RotateCcw } from "lucide-react";
import Button from "./Button";

export default function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this section. Check your connection and try again.",
  onRetry,
  compact = false,
}) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center text-center ${compact ? "py-8 px-4" : "py-14 px-6"}`}
    >
      <div
        className="rounded-xl flex items-center justify-center mb-4"
        style={{
          width: compact ? "44px" : "52px",
          height: compact ? "44px" : "52px",
          background: "var(--color-negative-bg)",
        }}
      >
        <AlertTriangle
          size={compact ? 20 : 24}
          style={{ color: "var(--color-negative)" }}
        />
      </div>

      <p
        className="font-medium mb-1"
        style={{
          color: "var(--color-text-primary)",
          fontSize: compact ? "0.875rem" : "1rem",
        }}
      >
        {title}
      </p>

      <p
        className="mb-4"
        style={{
          color: "var(--color-text-tertiary)",
          fontSize: "0.85rem",
          maxWidth: "28rem",
          lineHeight: 1.6,
        }}
      >
        {description}
      </p>

      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} icon={RotateCcw}>
          Retry
        </Button>
      )}
    </div>
  );
}
