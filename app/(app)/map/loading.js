// app/(app)/map/loading.js
import SkeletonLoader from "@/components/ui/SkeletonLoader";

export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <SkeletonLoader className="h-7 w-64" />
        <SkeletonLoader className="h-4 w-96 max-w-full" />
      </div>
      <SkeletonLoader className="h-[560px] w-full" style={{ borderRadius: "var(--radius-xl)" }} />
    </div>
  );
}
