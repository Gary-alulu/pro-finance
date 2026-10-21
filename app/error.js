"use client";
// app/error.js
// Global route error boundary — shown when a page throws during render.

"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import Button from "@/components/ui/Button";

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error("[Route Error]", error);
  }, [error]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: "var(--color-bg)" }}
    >
      <div className="w-full max-w-md text-center">
        <div
          className="mx-auto mb-5 w-14 h-14 rounded-xl flex items-center justify-center"
          style={{ background: "var(--color-negative-bg)" }}
        >
          <AlertTriangle size={26} style={{ color: "var(--color-negative)" }} />
        </div>
        <h1
          className="text-lg font-semibold mb-1.5"
          style={{ color: "var(--color-text-primary)" }}
        >
          Something went wrong
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
          An unexpected error occurred while loading this page. Your data is safe — try again, or
          return to the overview.
        </p>
        <div className="flex items-center justify-center gap-2">
          <Button onClick={reset} icon={RotateCcw}>
            Try again
          </Button>
          <a
            href="/overview"
            className="inline-flex items-center px-3.5 py-2 text-sm font-medium rounded-[var(--radius-md)] transition-colors"
            style={{
              color: "var(--color-text-primary)",
              border: "1px solid var(--color-border-strong)",
            }}
          >
            Go to Overview
          </a>
        </div>
      </div>
    </div>
  );
}
