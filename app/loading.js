// app/loading.js
// Global route-loading skeleton shown while a page server component resolves.

import SkeletonLoader from "@/components/ui/SkeletonLoader";

export default function Loading() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--color-bg)" }}
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="w-full max-w-md px-6 space-y-4">
        <div className="flex items-center gap-3">
          <SkeletonLoader className="w-9 h-9" style={{ borderRadius: "var(--radius-md)" }} />
          <SkeletonLoader className="h-4 flex-1" />
        </div>
        <SkeletonLoader className="h-3 w-2/3" />
        <SkeletonLoader className="h-3 w-1/2" />
        <div className="flex gap-3 pt-2">
          <SkeletonLoader className="h-9 flex-1" style={{ borderRadius: "var(--radius-md)" }} />
          <SkeletonLoader className="h-9 w-24" style={{ borderRadius: "var(--radius-md)" }} />
        </div>
      </div>
    </div>
  );
}
