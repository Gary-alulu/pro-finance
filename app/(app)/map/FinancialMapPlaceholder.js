"use client";
// app/(app)/map/FinancialMapPlaceholder.js
// Phase 1 placeholder for the Financial Map — replaced by React Flow in Phase 7.

import { motion } from "framer-motion";
import { Network, GitBranch } from "lucide-react";
import Link from "next/link";

export default function FinancialMapPlaceholder() {
  return (
    <div
      className="h-full flex flex-col items-center justify-center p-8"
      style={{ background: "var(--color-bg)", minHeight: "calc(100vh - 60px)" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="text-center max-w-md"
      >
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: "var(--color-emerald-50)", border: "1px solid var(--color-emerald-200)" }}
        >
          <Network size={36} style={{ color: "var(--color-emerald-600)" }} />
        </div>

        <h2
          className="text-2xl font-semibold mb-3"
          style={{ color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}
        >
          Financial Map
        </h2>

        <p className="mb-6 leading-relaxed" style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
          The interactive financial knowledge graph will be built in{" "}
          <strong style={{ color: "var(--color-text-primary)" }}>Phase 7</strong>.
          It will visualise your assets, liabilities, investments, transactions and documents
          as a connected, pannable network.
        </p>

        <div
          className="flex items-center justify-center gap-3 p-3 rounded-xl text-sm mb-6"
          style={{
            background: "var(--color-surface-2)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text-secondary)",
          }}
        >
          <GitBranch size={16} style={{ color: "var(--color-emerald-500)" }} />
          React Flow canvas · ELK auto-layout · AI-suggested edges
        </div>

        <Link
          href="/overview"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium"
          style={{ background: "var(--color-emerald-600)", color: "#faf9f6" }}
        >
          Go to Overview
        </Link>
      </motion.div>
    </div>
  );
}
