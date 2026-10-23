"use client";
// components/map/FinancialMapLoader.js
// Dynamically loads the React Flow canvas (@xyflow/react, ~180 KB + CSS) so it
// stays out of the initial /map bundle and never runs during SSR.

import dynamic from "next/dynamic";
import SkeletonLoader from "@/components/ui/SkeletonLoader";

const FinancialMapCanvas = dynamic(
  () => import("@/components/map/FinancialMapCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-3">
        <SkeletonLoader className="h-[560px] w-full" />
      </div>
    ),
  }
);

export default function FinancialMapLoader() {
  return <FinancialMapCanvas />;
}
