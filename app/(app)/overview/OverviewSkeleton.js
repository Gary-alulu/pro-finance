// app/(app)/overview/OverviewSkeleton.js
// Streaming fallback for the Overview dashboard — matches the real layout so
// there is no layout shift when the server data resolves.

import SkeletonLoader from "@/components/ui/SkeletonLoader";

export default function OverviewSkeleton() {
  return (
    <div className="p-6 md:p-8 space-y-8 max-w-screen-2xl mx-auto">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 xl:grid-cols-5">
        <div className="sm:col-span-3 xl:col-span-2">
          <div
            className="p-6"
            style={{
              background: "linear-gradient(135deg, #0d2116 0%, #1c3828 100%)",
              border: "1px solid rgba(16,185,129,0.2)",
              borderRadius: "var(--radius-lg)",
            }}
          >
            <SkeletonLoader className="h-4 w-32 rounded" />
            <SkeletonLoader className="h-10 w-48 rounded-lg mt-3 mb-4" />
          </div>
        </div>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-5"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-lg)",
            }}
          >
            <SkeletonLoader className="h-3.5 w-24 rounded" />
            <SkeletonLoader className="h-7 w-28 rounded mt-3" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3 items-stretch">
        <div className="lg:col-span-2">
          <SkeletonLoader className="h-72 w-full rounded-xl" />
        </div>
        <SkeletonLoader className="h-72 w-full rounded-xl" />
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 items-stretch">
        <SkeletonLoader className="h-64 w-full rounded-xl" />
        <SkeletonLoader className="h-64 w-full rounded-xl" />
      </div>
    </div>
  );
}
