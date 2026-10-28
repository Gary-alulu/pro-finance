"use client";
// components/command-centre/AlertCard.js
// A single alert row in the Early-Warning panel with expandable details.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  ExternalLink,
  CheckCircle2,
  Clock,
  Zap,
} from "lucide-react";
import Link from "next/link";

const SEVERITY_CONFIG = {
  critical: {
    icon: AlertCircle,
    color: "#ef4444",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.2)",
    badge: "rgba(239,68,68,0.15)",
    label: "Critical",
  },
  high: {
    icon: AlertTriangle,
    color: "#f97316",
    bg: "rgba(249,115,22,0.08)",
    border: "rgba(249,115,22,0.2)",
    badge: "rgba(249,115,22,0.15)",
    label: "High",
  },
  medium: {
    icon: AlertTriangle,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.2)",
    badge: "rgba(245,158,11,0.15)",
    label: "Medium",
  },
  low: {
    icon: Info,
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.05)",
    border: "rgba(59,130,246,0.15)",
    badge: "rgba(59,130,246,0.12)",
    label: "Low",
  },
};

export default function AlertCard({ alert, onDismiss, onAcknowledge }) {
  const [expanded, setExpanded] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const cfg = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.medium;
  const Icon = cfg.icon;

  async function handleDismiss() {
    setDismissing(true);
    await onDismiss?.(alert.id);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: dismissing ? 0 : 1, y: dismissing ? -8 : 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-xl overflow-hidden"
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
      }}
    >
      {/* Main row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-4 py-3.5 flex items-start gap-3 group"
        aria-expanded={expanded}
        aria-label={`${cfg.label} alert: ${alert.title}`}
      >
        {/* Severity icon */}
        <div
          className="flex-shrink-0 mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: cfg.badge }}
        >
          <Icon size={14} style={{ color: cfg.color }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p
              className="text-sm font-semibold leading-snug"
              style={{ color: "var(--color-text-primary)" }}
            >
              {alert.title}
            </p>
            <span
              className="text-xs font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
              style={{ background: cfg.badge, color: cfg.color }}
            >
              {cfg.label}
            </span>
            {alert.status === "in_progress" && (
              <span
                className="text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1"
                style={{
                  background: "rgba(59,130,246,0.1)",
                  color: "#3b82f6",
                }}
              >
                <Clock size={10} /> In Progress
              </span>
            )}
          </div>
          <p
            className="text-xs mt-1 leading-relaxed line-clamp-2"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {alert.summary}
          </p>
          {alert.estimatedImpact && (
            <p
              className="text-xs mt-1 font-medium"
              style={{ color: cfg.color }}
            >
              Est. impact: {alert.estimatedImpact}
            </p>
          )}
        </div>

        {/* Chevron */}
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0 mt-0.5"
        >
          <ChevronDown
            size={15}
            style={{ color: "var(--color-text-tertiary)" }}
          />
        </motion.div>
      </button>

      {/* Expanded details */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{
              overflow: "hidden",
              borderTop: `1px solid ${cfg.border}`,
            }}
          >
            <div className="px-4 py-3.5 space-y-3">
              {/* Rule explanation */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-tertiary)" }}>
                  Why this alert
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                  {alert.description || alert.summary}
                </p>
              </div>

              {/* Affected records */}
              {alert.affectedRecords?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-tertiary)" }}>
                    Affected Records
                  </p>
                  <ul className="space-y-0.5">
                    {alert.affectedRecords.map((rec, i) => (
                      <li key={i} className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                        • {typeof rec === "string" ? rec : rec.label || rec.id}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Deadline */}
              {alert.deadline && (
                <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                  <Clock size={12} />
                  <span>
                    Deadline:{" "}
                    <strong style={{ color: cfg.color }}>
                      {new Date(alert.deadline).toLocaleDateString()}
                    </strong>
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                {alert.actionHref && (
                  <Link
                    href={alert.actionHref}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                    style={{
                      background: cfg.color,
                      color: "#fff",
                    }}
                  >
                    <Zap size={11} />
                    {alert.actionLabel || "Take Action"}
                    <ExternalLink size={10} />
                  </Link>
                )}
                {onAcknowledge && (
                  <button
                    onClick={() => onAcknowledge(alert.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      color: "var(--color-text-secondary)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <CheckCircle2 size={11} />
                    Acknowledge
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
