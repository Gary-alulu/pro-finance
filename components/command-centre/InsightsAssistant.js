"use client";
// components/command-centre/InsightsAssistant.js
// Slide-in AI-style Financial Insights Assistant panel.
// Uses the /api/command-centre/explain/[id] endpoint for per-alert explanations.
// Note: No actions are executed automatically — the assistant only explains and suggests.

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, X, ChevronRight, AlertTriangle, Info } from "lucide-react";

const STARTER_PROMPTS = [
  "What are my most urgent financial risks right now?",
  "Which alerts should I address first?",
  "Explain my data quality issues",
  "How can I improve my financial health score?",
];

function AssistantMessage({ msg }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
    >
      {msg.role === "assistant" && (
        <div
          className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5"
          style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}
        >
          <Sparkles size={13} style={{ color: "#fff" }} />
        </div>
      )}
      <div
        className="max-w-[85%] px-3.5 py-2.5 rounded-xl text-sm leading-relaxed"
        style={
          msg.role === "user"
            ? {
                background: "rgba(16,185,129,0.12)",
                border: "1px solid rgba(16,185,129,0.2)",
                color: "var(--color-text-primary)",
              }
            : {
                background: "var(--color-surface-2)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-secondary)",
              }
        }
      >
        {msg.loading ? (
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "var(--color-text-tertiary)" }}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        ) : (
          <p style={{ whiteSpace: "pre-wrap" }}>{msg.text}</p>
        )}
      </div>
    </motion.div>
  );
}

export default function InsightsAssistant({ alerts = [], healthOverview = null }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "intro",
      role: "assistant",
      text: "Hi! I'm your Financial Insights Assistant. I can help you understand your alerts, explain what needs attention, and suggest what to prioritise.\n\nAll actions remain yours to execute — I only explain, never act.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef(null);
  const msgCounter = useRef(0);

  useEffect(() => {
    if (open) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [messages, open]);

  function buildContext() {
    const criticals = alerts.filter((a) => a.severity === "critical");
    const highs = alerts.filter((a) => a.severity === "high");
    return {
      alertSummary: `${alerts.length} total alerts (${criticals.length} critical, ${highs.length} high)`,
      topAlerts: alerts.slice(0, 5).map((a) => `${a.severity.toUpperCase()}: ${a.title} — ${a.summary}`).join("\n"),
      healthScore: healthOverview?.recordFreshnessPct ?? null,
      currency: healthOverview?.currency ?? "KES",
    };
  }

  async function generateResponse(userMessage) {
    const ctx = buildContext();

    // Purely client-side context-aware response — no hallucinated numbers,
    // everything derived from the actual alerts passed in.
    const lower = userMessage.toLowerCase();

    // Urgent / risk
    if (lower.includes("urgent") || lower.includes("risk") || lower.includes("critical")) {
      const criticals = alerts.filter((a) => a.severity === "critical");
      if (criticals.length === 0) {
        return "Great news — there are no critical alerts at this time. Review 'high' severity items as your next priority.";
      }
      return (
        `You currently have ${criticals.length} critical alert${criticals.length > 1 ? "s" : ""}:\n\n` +
        criticals.map((a, i) => `${i + 1}. **${a.title}**\n   ${a.summary}`).join("\n\n") +
        "\n\nAddress these first — they represent the highest risk to your financial position."
      );
    }

    // Prioritise / first
    if (lower.includes("first") || lower.includes("priorit") || lower.includes("which")) {
      const sorted = [...alerts].sort((a, b) => {
        const order = { critical: 4, high: 3, medium: 2, low: 1 };
        return (order[b.severity] || 0) - (order[a.severity] || 0);
      });
      if (sorted.length === 0) return "You have no active alerts — your financial records look clean!";
      const top = sorted.slice(0, 3);
      return (
        "Here are your top 3 priorities:\n\n" +
        top.map((a, i) => `${i + 1}. [${a.severity.toUpperCase()}] ${a.title}\n   → ${a.actionLabel || "Review and take action"}`).join("\n\n")
      );
    }

    // Data quality
    if (lower.includes("data") || lower.includes("quality") || lower.includes("duplicate")) {
      const dq = alerts.filter(
        (a) => a.category === "data_integrity" || a.ruleKey?.startsWith("duplicate") || a.ruleKey?.startsWith("missing")
      );
      if (dq.length === 0) return "Your data quality looks good — no duplicate or missing record alerts detected.";
      return (
        `There are ${dq.length} data quality issue${dq.length > 1 ? "s" : ""} detected:\n\n` +
        dq.map((a) => `• ${a.title}: ${a.summary}`).join("\n") +
        "\n\nResolving these ensures your net worth calculations and reports are accurate."
      );
    }

    // Health score
    if (lower.includes("health") || lower.includes("score") || lower.includes("improve")) {
      const score = ctx.healthScore;
      const tips = [];
      if (alerts.some((a) => a.severity === "critical")) tips.push("resolve all critical alerts immediately");
      if (alerts.some((a) => a.ruleKey === "stale_asset_valuation")) tips.push("update stale asset valuations");
      if (alerts.some((a) => a.ruleKey === "invoice_overdue")) tips.push("follow up on overdue invoices");
      if (alerts.some((a) => a.ruleKey === "missing_investment_price")) tips.push("record current investment prices");
      if (tips.length === 0) tips.push("keep records up to date and review periodically");
      return (
        `Your record freshness is at ${score ?? "unknown"}%.\n\nTo improve your financial health score:\n\n` +
        tips.map((t, i) => `${i + 1}. ${t.charAt(0).toUpperCase() + t.slice(1)}.`).join("\n")
      );
    }

    // Invoices
    if (lower.includes("invoice") || lower.includes("overdue") || lower.includes("receiv")) {
      const inv = alerts.filter((a) => a.category === "invoices_receivables");
      if (inv.length === 0) return "No invoice or receivables alerts are currently active.";
      return (
        `${inv.length} invoice alert${inv.length > 1 ? "s" : ""} detected:\n\n` +
        inv.map((a) => `• ${a.title}: ${a.summary}`).join("\n")
      );
    }

    // Fallback
    return (
      `Based on your current ${ctx.alertSummary}, here's a brief overview:\n\n` +
      (alerts.length === 0
        ? "Your financial records appear clean — no active alerts detected."
        : alerts.slice(0, 4).map((a) => `• [${a.severity.toUpperCase()}] ${a.title}`).join("\n")) +
      "\n\nAsk me about specific categories (cash flow, invoices, investments, data quality) for more detail."
    );
  }

  async function handleSend(text) {
    const userText = (text ?? input).trim();
    if (!userText) return;
    setInput("");

    const uid = (msgCounter.current += 1);
    setMessages((prev) => [
      ...prev,
      { id: `u${uid}`, role: "user", text: userText },
      { id: `a${uid}`, role: "assistant", text: "", loading: true },
    ]);
    setIsTyping(true);

    // Simulate brief "thinking" delay for a natural feel
    await new Promise((r) => setTimeout(r, 800));
    const response = await generateResponse(userText);

    setMessages((prev) =>
      prev.map((m) =>
        m.id === `a${uid}` ? { ...m, text: response, loading: false } : m
      )
    );
    setIsTyping(false);
  }

  return (
    <>
      {/* FAB trigger */}
      <motion.button
        onClick={() => setOpen(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl"
        style={{
          background: "linear-gradient(135deg,#10b981,#059669)",
          color: "#fff",
          boxShadow: "0 8px 32px rgba(16,185,129,0.35)",
        }}
        aria-label="Open Financial Insights Assistant"
      >
        <Sparkles size={16} />
        <span className="text-sm font-semibold">Ask Insights</span>
      </motion.button>

      {/* Slide-in panel */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40"
              style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }}
            />

            {/* Panel */}
            <motion.div
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md flex flex-col"
              style={{
                background: "var(--color-surface)",
                borderLeft: "1px solid var(--color-border)",
                boxShadow: "var(--shadow-xl)",
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                style={{ borderBottom: "1px solid var(--color-border)" }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}
                  >
                    <Sparkles size={15} style={{ color: "#fff" }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>
                      Financial Insights Assistant
                    </p>
                    <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                      Explains · Never executes
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: "var(--color-text-tertiary)", background: "var(--color-surface-2)" }}
                  aria-label="Close assistant"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Disclaimer */}
              <div
                className="px-5 py-2.5 flex items-start gap-2 text-xs"
                style={{
                  background: "rgba(59,130,246,0.06)",
                  borderBottom: "1px solid var(--color-border)",
                  color: "var(--color-text-tertiary)",
                }}
              >
                <Info size={12} className="flex-shrink-0 mt-0.5" style={{ color: "#3b82f6" }} />
                <span>
                  Based solely on your recorded data. This assistant explains — you decide what to action.
                </span>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {messages.map((msg) => (
                  <AssistantMessage key={msg.id} msg={msg} />
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Starter prompts */}
              {messages.length < 3 && (
                <div
                  className="px-5 py-3 flex flex-wrap gap-2"
                  style={{ borderTop: "1px solid var(--color-border)" }}
                >
                  {STARTER_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleSend(prompt)}
                      className="text-xs px-3 py-1.5 rounded-full transition-colors"
                      style={{
                        background: "var(--color-surface-2)",
                        border: "1px solid var(--color-border)",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div
                className="px-5 py-4 flex-shrink-0"
                style={{ borderTop: "1px solid var(--color-border)" }}
              >
                <div className="flex items-end gap-2">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Ask about your financial position…"
                    rows={2}
                    className="flex-1 resize-none rounded-xl px-3.5 py-2.5 text-sm outline-none transition-colors"
                    style={{
                      background: "var(--color-surface-2)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text-primary)",
                    }}
                    disabled={isTyping}
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isTyping}
                    className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                    style={{
                      background: input.trim() && !isTyping
                        ? "linear-gradient(135deg,#10b981,#059669)"
                        : "var(--color-surface-2)",
                      color: input.trim() && !isTyping ? "#fff" : "var(--color-text-tertiary)",
                      border: "1px solid var(--color-border)",
                    }}
                    aria-label="Send message"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
