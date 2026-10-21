// app/not-found.js
// 404 page — shown for unmatched routes.

import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: "var(--color-bg)" }}
    >
      <div className="w-full max-w-md text-center">
        <div
          className="mx-auto mb-5 w-14 h-14 rounded-xl flex items-center justify-center"
          style={{ background: "var(--color-surface-2)" }}
        >
          <Compass size={26} style={{ color: "var(--color-text-tertiary)" }} />
        </div>
        <p
          className="text-xs font-semibold uppercase tracking-wide mb-2"
          style={{ color: "var(--color-accent)" }}
        >
          404
        </p>
        <h1
          className="text-lg font-semibold mb-1.5"
          style={{ color: "var(--color-text-primary)" }}
        >
          Page not found
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
          The page you are looking for does not exist or may have been moved.
        </p>
        <Link
          href="/overview"
          className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] transition-colors"
          style={{ background: "var(--color-emerald-600)", color: "#faf9f6" }}
        >
          Back to Overview
        </Link>
      </div>
    </div>
  );
}
