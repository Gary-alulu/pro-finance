"use client";
// app/(app)/calculator/CalculatorClient.js
// Client-side controller for the Financial Calculator workspace.

import { useSearchParams } from "next/navigation";
import CalculatorWorkspace from "@/components/calculator/CalculatorWorkspace";

export default function CalculatorClient({ initialUser, initialCategory, focusId }) {
  const searchParams = useSearchParams();
  const category = searchParams.get("category") || initialCategory || "basic";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <CalculatorWorkspace initialCategory={category} />
    </div>
  );
}

