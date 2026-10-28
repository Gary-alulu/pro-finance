"use client";
// components/command-centre/DataQualityBar.js
// Horizontal cleanliness score bar + issue list for the Data Quality Monitor panel.

import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";
import Link from "next/link";

function qualityColor(score) {
  if (score >= 90) return "#10b981";
  if (score >= 70) return "#f59e0b";
  if (score >= 50) return "#f97316";
  return "#ef4444";
}

function qualityLabel(score) {
  if (score >= 90) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Needs Work";
  return "Poor";
}

export default function DataQualityBar({ dataQuality = null, loading = false }) {
  const score = dataQuality?.cleanlinessScore ?? 100;
  const issues = dataQuality?.issues ?? [];
  const color = qualityColor(score);
  const label = qualityLabel(score);

  return (
    <div className="space-y-4">
      {/* Score row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
            Data Cleanliness
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
            {issues.length === 0
              ? "No data integrity issues detected"
              : `${issues.length} issue${issues.length > 1 ? "s" : ""} requiring review`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold" style={{ color }}>
            {loading ? "—" : `${score}%`}
          </p>
          <p className="text-xs font-medium" style={{ color }}>
            {loading ? "" : label}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ background: "var(--color-surface-2)" }}
      >
        {!loading && (
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            style={{ background: color }}
          />
        )}
        {loading && (
          <div
            className="h-full rounded-full w-1/3 animate-pulse"
            style={{ background: "var(--color-border)" }}
          />
        )}
      </div>

      {/* Issues list */}
      {issues.length > 0 && (
        <ul className="space-y-2">
          {issues.map((issue, i) => (
            <li key={i} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle
                  size={13}
                  className="flex-shrink-0"
                  style={{
                    color:
                      issue.severity === "high" || issue.severity === "critical"
                        ? "#ef4444"
                        : "#f59e0b",
                  }}
                />
                <span
                  className="text-xs truncate"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {issue.title}
                </span>
              </div>
              {issue.actionHref && (
                <Link
                  href={issue.actionHref}
                  className="flex-shrink-0 text-xs flex items-center gap-0.5 transition-colors"
                  style={{ color: "var(--color-accent)" }}
                >
                  Fix <ExternalLink size={10} />
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}

      {issues.length === 0 && !loading && (
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
          <CheckCircle2 size={13} style={{ color: "#10b981" }} />
          No duplicate records, missing valuations, or unreviewed extractions detected.
        </div>
      )}
    </div>
  );
}
