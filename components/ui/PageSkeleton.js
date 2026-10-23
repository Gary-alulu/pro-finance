// components/ui/PageSkeleton.js
// Shared route-level loading skeleton. Rendered inside the (app) layout, so the
// sidebar and top bar stay visible while a page's server component resolves.

import SkeletonLoader from "@/components/ui/SkeletonLoader";

export default function PageSkeleton({ cards = 4, rows = 5, chart = false }) {
  return (
    <div
      className="p-6 md:p-8 space-y-6 max-w-screen-2xl mx-auto"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="space-y-2">
        <SkeletonLoader className="h-7 w-56" />
        <SkeletonLoader className="h-4 w-80 max-w-full" />
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: cards }).map((_, i) => (
          <SkeletonLoader
            key={i}
            className="h-28 w-full"
            style={{ borderRadius: "var(--radius-xl)" }}
          />
        ))}
      </div>

      {chart && <SkeletonLoader className="h-72 w-full" style={{ borderRadius: "var(--radius-xl)" }} />}

      <div
        className="p-4 space-y-3"
        style={{
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          borderRadius: "var(--radius-xl)",
        }}
      >
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonLoader key={i} className="h-9 w-full" />
        ))}
      </div>
    </div>
  );
}
