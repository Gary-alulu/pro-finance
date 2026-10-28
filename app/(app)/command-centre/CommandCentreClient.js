"use client";
// app/(app)/command-centre/CommandCentreClient.js
// Financial Command Centre — main client component.
// Displays: Health Overview · Early-Warning Alerts · Priority Action Queue · Data Quality Monitor · Insights Assistant.

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  Info,
  Clock,
  DollarSign,
  TrendingUp,
  FileWarning,
  CheckCircle2,
  ArrowRight,
  Zap,
  Activity,
} from "lucide-react";
import dynamic from "next/dynamic";
import { formatCurrency } from "@/lib/finance/currency";
import SkeletonLoader from "@/components/ui/SkeletonLoader";
import EmptyState from "@/components/ui/EmptyState";

// Lazy-load heavy sub-panels
const HealthScoreRing = dynamic(() => import("@/components/command-centre/HealthScoreRing"), {
  loading: () => <div className="w-36 h-36 rounded-full bg-white/5 animate-pulse mx-auto" />,
  ssr: false,
});
const AlertCard = dynamic(() => import("@/components/command-centre/AlertCard"), { ssr: false });
const CategoryFilter = dynamic(() => import("@/components/command-centre/CategoryFilter"), { ssr: false });
const DataQualityBar = dynamic(() => import("@/components/command-centre/DataQualityBar"), { ssr: false });
const InsightsAssistant = dynamic(() => import("@/components/command-centre/InsightsAssistant"), { ssr: false });

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SEVERITY_ORDER = { critical: 4, high: 3, medium: 2, low: 1 };

function severityIcon(sev) {
  if (sev === "critical") return <AlertCircle size={14} style={{ color: "#ef4444" }} />;
  if (sev === "high") return <AlertTriangle size={14} style={{ color: "#f97316" }} />;
  if (sev === "medium") return <AlertTriangle size={14} style={{ color: "#f59e0b" }} />;
  return <Info size={14} style={{ color: "#3b82f6" }} />;
}

function SeverityPill({ count, severity, label, color }) {
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
      style={{ background: `${color}14`, border: `1px solid ${color}30` }}
    >
      <span className="font-bold text-lg leading-none" style={{ color }}>
        {count ?? 0}
      </span>
      <span className="text-xs" style={{ color: `${color}cc` }}>
        {label}
      </span>
    </div>
  );
}

function MetricLine({ icon, label, value, sub }) {
  return (
    <div className="flex items-center justify-between py-2.5" style={{ borderBottom: "1px solid var(--color-border)" }}>
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--color-surface-2)" }}
        >
          {icon}
        </div>
        <div>
          <p className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
            {label}
          </p>
          {sub && (
            <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
              {sub}
            </p>
          )}
        </div>
      </div>
      <span
        className="text-sm font-semibold"
        style={{ color: "var(--color-text-primary)" }}
      >
        {value}
      </span>
    </div>
  );
}

function PriorityActionRow({ item, rank }) {
  const color =
    item.priority === "critical" ? "#ef4444"
    : item.priority === "high" ? "#f97316"
    : item.priority === "medium" ? "#f59e0b"
    : "#3b82f6";

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: rank * 0.05 }}
      className="flex items-start gap-3 p-3.5 rounded-xl"
      style={{
        background: "var(--color-surface-2)",
        border: "1px solid var(--color-border)",
      }}
    >
      <div
        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
        style={{ background: `${color}20`, color }}
      >
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>
          {item.title}
        </p>
        <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "var(--color-text-tertiary)" }}>
          {item.reason}
        </p>
        {item.estimatedImpact && (
          <p className="text-xs mt-1 font-medium" style={{ color }}>
            {item.estimatedImpact}
          </p>
        )}
      </div>
      {item.actionHref && (
        <a
          href={item.actionHref}
          className="flex-shrink-0 flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors"
          style={{ background: `${color}18`, color }}
        >
          <Zap size={11} /> Act
        </a>
      )}
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const STAGGER = {
  container: { animate: { transition: { staggerChildren: 0.06 } } },
  item: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  },
};

export default function CommandCentreClient({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const currency = data?.healthOverview?.currency || user?.preferredCurrency || "KES";

  const fetchData = useCallback(async (force = false) => {
    try {
      setLoading(true);
      const url = force
        ? "/api/command-centre?evaluate=true"
        : "/api/command-centre";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load Command Centre data");
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setEvaluating(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch("/api/command-centre");
        if (!res.ok) throw new Error("Failed to load Command Centre data");
        const json = await res.json();
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);


  async function handleRefresh() {
    setEvaluating(true);
    await fetchData(true);
  }

  async function handleDismiss(alertId) {
    try {
      await fetch(`/api/command-centre/alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "dismissed" }),
      });
      setData((prev) => ({
        ...prev,
        alerts: prev.alerts.filter((a) => a.id !== alertId),
        priorityQueue: prev.priorityQueue.filter((q) => q.alertId !== alertId),
      }));
    } catch {}
  }

  async function handleAcknowledge(alertId) {
    try {
      await fetch(`/api/command-centre/alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in_progress" }),
      });
      setData((prev) => ({
        ...prev,
        alerts: prev.alerts.map((a) =>
          a.id === alertId ? { ...a, status: "in_progress" } : a
        ),
      }));
    } catch {}
  }

  // Derived
  const health = data?.healthOverview;
  const allAlerts = data?.alerts ?? [];
  const priorityQueue = data?.priorityQueue ?? [];
  const dataQuality = data?.dataQuality ?? null;
  const latestRun = data?.latestRun ?? null;

  // Compute health score from alert counts + freshness
  const counts = health?.counts ?? { critical: 0, high: 0, medium: 0, low: 0, totalAlerts: 0 };
  const rawScore = Math.max(
    0,
    Math.min(
      100,
      100 -
        (counts.critical ?? 0) * 20 -
        (counts.high ?? 0) * 8 -
        (counts.medium ?? 0) * 3 -
        (counts.low ?? 0) * 1
    )
  );
  const healthScore = loading ? 0 : rawScore;

  // Category counts for filter
  const alertCounts = allAlerts.reduce((acc, a) => {
    acc[a.category] = (acc[a.category] ?? 0) + 1;
    return acc;
  }, {});

  // Filtered alerts
  const filteredAlerts = categoryFilter === "all"
    ? allAlerts
    : allAlerts.filter((a) => a.category === categoryFilter);

  // Sorted by severity then date
  const sortedAlerts = [...filteredAlerts].sort(
    (a, b) =>
      (SEVERITY_ORDER[b.severity] ?? 0) - (SEVERITY_ORDER[a.severity] ?? 0)
  );

  const fmt = (val) =>
    val != null ? formatCurrency(val, currency) : "—";

  // Run timestamp
  const runLabel = latestRun
    ? `Last run ${new Date(latestRun.runAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : "Not yet evaluated";

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-screen-2xl mx-auto">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}
            >
              <Activity size={18} style={{ color: "#fff" }} />
            </div>
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ color: "var(--color-text-primary)" }}
            >
              Financial Command Centre
            </h1>
          </div>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Proactive monitoring across your entire financial position.
          </p>
          <p className="text-xs mt-1 flex items-center gap-1.5" style={{ color: "var(--color-text-tertiary)" }}>
            <Clock size={11} />
            {runLabel}
            {latestRun && (
              <span>· {latestRun.durationMs}ms</span>
            )}
          </p>
        </div>

        <button
          id="command-centre-refresh"
          onClick={handleRefresh}
          disabled={evaluating || loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{
            background: evaluating
              ? "rgba(16,185,129,0.08)"
              : "linear-gradient(135deg,#10b981,#059669)",
            color: evaluating ? "var(--color-emerald-400)" : "#fff",
            border: evaluating ? "1px solid rgba(16,185,129,0.2)" : "none",
            opacity: loading ? 0.6 : 1,
          }}
          aria-busy={evaluating}
        >
          <RefreshCw size={14} className={evaluating ? "animate-spin" : ""} />
          {evaluating ? "Evaluating…" : "Run Evaluation"}
        </button>
      </motion.div>

      {/* ── Disclosure banner ─────────────────────────────────────────────── */}
      <div
        className="flex items-start gap-3 px-5 py-3.5 rounded-xl text-xs"
        style={{
          background: "rgba(59,130,246,0.05)",
          border: "1px solid rgba(59,130,246,0.15)",
          color: "var(--color-text-tertiary)",
        }}
      >
        <Info size={13} className="flex-shrink-0 mt-0.5" style={{ color: "#3b82f6" }} />
        <span>
          Reflects your <strong style={{ color: "var(--color-text-secondary)" }}>recorded data only</strong>.
          Missing amounts are never assumed to be zero. Estimates and stale data are disclosed per alert.
          No records or payments are created automatically by this system.
        </span>
      </div>

      {error && (
        <div
          className="flex items-center gap-3 px-5 py-4 rounded-xl text-sm"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            color: "#ef4444",
          }}
        >
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {/* ── Row 1: Health Overview + Severity pills ───────────────────────── */}
      <motion.div
        initial="initial"
        animate="animate"
        variants={STAGGER.container}
        className="grid grid-cols-1 lg:grid-cols-3 gap-5"
      >
        {/* Health Score Panel */}
        <motion.div
          variants={STAGGER.item}
          className="lg:col-span-1 rounded-2xl p-6 flex flex-col items-center gap-6"
          style={{
            background: "linear-gradient(135deg, #0d2116 0%, #1c3828 100%)",
            border: "1px solid rgba(16,185,129,0.18)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-widest w-full"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            Financial Health Score
          </p>
          <HealthScoreRing score={healthScore} loading={loading} />

          <div className="w-full grid grid-cols-2 gap-2">
            <SeverityPill count={counts.critical} severity="critical" label="Critical" color="#ef4444" />
            <SeverityPill count={counts.high} severity="high" label="High" color="#f97316" />
            <SeverityPill count={counts.medium} severity="medium" label="Medium" color="#f59e0b" />
            <SeverityPill count={counts.low} severity="low" label="Low" color="#3b82f6" />
          </div>
        </motion.div>

        {/* Financial Metrics Panel */}
        <motion.div
          variants={STAGGER.item}
          className="lg:col-span-2 rounded-2xl p-6"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-4"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            Position Summary
          </p>

          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <SkeletonLoader key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="divide-y-0">
              <MetricLine
                icon={<DollarSign size={13} style={{ color: "#10b981" }} />}
                label="Available Cash (Recorded)"
                sub="Based on confirmed bank/cash records"
                value={fmt(health?.availableCash)}
              />
              <MetricLine
                icon={<Clock size={13} style={{ color: "#f97316" }} />}
                label="Upcoming Obligations (30 days)"
                sub="Confirmed liabilities due within 30 days"
                value={fmt(health?.upcomingObligations30d)}
              />
              <MetricLine
                icon={<AlertTriangle size={13} style={{ color: "#f59e0b" }} />}
                label="Overdue Receivables"
                sub="Outstanding invoices past due date"
                value={fmt(health?.overdueReceivables)}
              />
              <MetricLine
                icon={<TrendingUp size={13} style={{ color: "#3b82f6" }} />}
                label="Portfolio Exposure"
                sub={
                  health?.portfolioExposure !== null
                    ? "Highest single-holding concentration"
                    : "No holdings with known prices"
                }
                value={
                  health?.portfolioExposure != null
                    ? `${Number(health.portfolioExposure).toFixed(1)}%`
                    : "—"
                }
              />
              <MetricLine
                icon={<ShieldCheck size={13} style={{ color: "#10b981" }} />}
                label="Record Freshness"
                sub="Proportion of records within freshness thresholds"
                value={
                  health?.recordFreshnessPct != null
                    ? `${health.recordFreshnessPct}%`
                    : "—"
                }
              />
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* ── Row 2: Early-Warning Alerts + Priority Queue ──────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="grid grid-cols-1 xl:grid-cols-3 gap-5"
      >
        {/* Early-Warning Alerts (2/3 width) */}
        <div
          className="xl:col-span-2 rounded-2xl p-6 flex flex-col gap-5"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p
                className="text-sm font-bold"
                style={{ color: "var(--color-text-primary)" }}
              >
                Early-Warning Alerts
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
                {loading
                  ? "Loading…"
                  : allAlerts.length === 0
                  ? "No active alerts"
                  : `${allAlerts.length} active alert${allAlerts.length > 1 ? "s" : ""}`}
              </p>
            </div>
          </div>

          {/* Category filter */}
          {!loading && allAlerts.length > 0 && (
            <CategoryFilter
              selected={categoryFilter}
              onChange={setCategoryFilter}
              alertCounts={alertCounts}
            />
          )}

          {/* Alert list */}
          <div className="space-y-3 flex-1 min-h-0">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <SkeletonLoader key={i} className="h-20 w-full rounded-xl" />
              ))
            ) : sortedAlerts.length === 0 ? (
              <EmptyState
                title="No alerts in this category"
                description={
                  categoryFilter === "all"
                    ? "Your monitored records are clean — no issues detected."
                    : "No alerts match the selected filter."
                }
                icon={CheckCircle2}
              />
            ) : (
              <AnimatePresence mode="popLayout">
                {sortedAlerts.map((alert) => (
                  <AlertCard
                    key={alert.id || alert.dedupeKey}
                    alert={alert}
                    onDismiss={handleDismiss}
                    onAcknowledge={handleAcknowledge}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Priority Action Queue (1/3 width) */}
        <div
          className="xl:col-span-1 rounded-2xl p-6 flex flex-col gap-4"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div>
            <p className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>
              Priority Action Queue
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
              Highest-impact items, ranked by severity
            </p>
          </div>

          <div className="space-y-2.5 flex-1">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <SkeletonLoader key={i} className="h-16 w-full rounded-xl" />
              ))
            ) : priorityQueue.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <CheckCircle2 size={28} style={{ color: "#10b981" }} className="mb-2" />
                <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                  No outstanding actions
                </p>
              </div>
            ) : (
              priorityQueue.slice(0, 7).map((item, idx) => (
                <PriorityActionRow key={item.id} item={item} rank={idx + 1} />
              ))
            )}
          </div>

          {priorityQueue.length > 7 && (
            <p className="text-xs text-center" style={{ color: "var(--color-text-tertiary)" }}>
              +{priorityQueue.length - 7} more items
            </p>
          )}
        </div>
      </motion.div>

      {/* ── Row 3: Data Quality Monitor ──────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
        className="rounded-2xl p-6"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div className="mb-5">
          <p className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>
            Data Quality Monitor
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
            Duplicate detection, missing evidence and unreviewed AI extractions
          </p>
        </div>
        <DataQualityBar dataQuality={dataQuality} loading={loading} />
      </motion.div>

      {/* ── Floating Insights Assistant ───────────────────────────────────── */}
      <InsightsAssistant alerts={allAlerts} healthOverview={health} />
    </div>
  );
}
