"use client";
// components/ui/CommandPalette.js
// Global search + quick-action palette (⌘K / Ctrl+K).
// Searches navigation destinations and offers quick-create actions.
// Opened from the TopBar search button or the global keyboard shortcut.

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  LayoutDashboard,
  Network,
  Landmark,
  TrendingUp,
  ArrowLeftRight,
  FileText,
  BarChart3,
  ShieldCheck,
  Settings,
  Plus,
  Moon,
  Sun,
  CornerDownLeft,
} from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";

const NAV_COMMANDS = [
  { id: "nav-overview", label: "Go to Overview", section: "Navigation", href: "/overview", icon: LayoutDashboard },
  { id: "nav-map", label: "Go to Financial Map", section: "Navigation", href: "/map", icon: Network },
  { id: "nav-assets", label: "Go to Assets & Liabilities", section: "Navigation", href: "/assets", icon: Landmark },
  { id: "nav-investments", label: "Go to Investments", section: "Navigation", href: "/investments", icon: TrendingUp },
  { id: "nav-transactions", label: "Go to Transactions", section: "Navigation", href: "/transactions", icon: ArrowLeftRight },
  { id: "nav-documents", label: "Go to Documents", section: "Navigation", href: "/documents", icon: FileText },
  { id: "nav-reports", label: "Go to Reports", section: "Navigation", href: "/reports", icon: BarChart3 },
  { id: "nav-accountability", label: "Go to Accountability", section: "Navigation", href: "/accountability", icon: ShieldCheck },
  { id: "nav-settings", label: "Go to Settings", section: "Navigation", href: "/settings", icon: Settings },
];

const ACTION_COMMANDS = [
  { id: "act-asset", label: "Add asset", section: "Quick actions", href: "/assets?new=asset", icon: Plus },
  { id: "act-liability", label: "Add liability", section: "Quick actions", href: "/assets?new=liability", icon: Plus },
  { id: "act-investment", label: "Add investment", section: "Quick actions", href: "/investments?new=1", icon: Plus },
  { id: "act-transaction", label: "Add transaction", section: "Quick actions", href: "/transactions?new=1", icon: Plus },
  { id: "act-document", label: "Upload document", section: "Quick actions", href: "/documents?new=1", icon: Plus },
];

export default function CommandPalette({ open, onClose }) {
  const router = useRouter();
  const { theme, toggle: toggleTheme } = useTheme();
  const [query, setQuery] = useState("");
  // Cursor is keyed to the query it was moved under, so it derives back to 0
  // the moment the query changes — no reset effect needed.
  const [cursor, setCursor] = useState({ forQuery: "", index: 0 });
  const activeIndex = cursor.forQuery === query ? cursor.index : 0;
  const setActiveIndex = useCallback((value) => {
    setCursor((prev) => ({
      forQuery: query,
      index:
        typeof value === "function"
          ? value(prev.forQuery === query ? prev.index : 0)
          : value,
    }));
  }, [query]);
  const [recordResults, setRecordResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Debounced record search (min 2 chars, regex-escaped server-side).
  // All state updates happen inside the timeout callback, never in the effect body.
  useEffect(() => {
    const q = query.trim();
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (q.length < 2) {
        setRecordResults([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setRecordResults(data.groups || []);
      } catch {
        if (!controller.signal.aborted) setRecordResults([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const commands = useMemo(() => {
    const themeCommand = {
      id: "act-theme",
      label: theme === "dark" ? "Switch to light theme" : "Switch to dark theme",
      section: "Quick actions",
      icon: theme === "dark" ? Sun : Moon,
      run: toggleTheme,
    };

    const all = [...NAV_COMMANDS, ...ACTION_COMMANDS, themeCommand];
    const q = query.trim().toLowerCase();
    const filtered = q ? all.filter((c) => c.label.toLowerCase().includes(q)) : all;

    const recordCommands = recordResults.flatMap((group) =>
      group.items.map((item) => ({
        id: `rec-${group.entityType}-${item.id}`,
        label: item.title + (item.secondary ? ` — ${item.secondary}` : ""),
        section: `Records · ${group.label}`,
        href: item.href,
        icon:
          group.entityType === "asset"
            ? Landmark
            : group.entityType === "liability"
            ? Landmark
            : group.entityType === "investment"
            ? TrendingUp
            : group.entityType === "transaction"
            ? ArrowLeftRight
            : FileText,
      }))
    );

    return [...filtered, ...recordCommands];
  }, [query, theme, toggleTheme, recordResults]);

  // Reset query and cursor whenever the palette closes; refocus the input on open.
  const handleClose = useCallback(() => {
    setQuery("");
    setCursor({ forQuery: "", index: 0 });
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      // Focus after the animation frame so the input is mounted.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const runCommand = useCallback(
    (cmd) => {
      handleClose();
      if (cmd.run) {
        cmd.run();
        return;
      }
      if (cmd.href) router.push(cmd.href);
    },
    [handleClose, router]
  );

  function handleKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, commands.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = commands[activeIndex];
      if (cmd) runCommand(cmd);
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleClose();
    }
  }

  // Group by section for rendering
  const grouped = [];
  let lastSection = null;
  commands.forEach((cmd, idx) => {
    if (cmd.section !== lastSection) {
      grouped.push({ type: "header", section: cmd.section });
      lastSection = cmd.section;
    }
    grouped.push({ type: "command", cmd, idx });
  });

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0"
            style={{ background: "var(--color-bg-overlay)", zIndex: "var(--z-overlay)" }}
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Palette */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="fixed left-1/2 top-[15vh] w-[min(560px,92vw)] overflow-hidden"
            style={{
              transform: "translateX(-50%)",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-xl)",
              zIndex: "var(--z-modal)",
            }}
            onKeyDown={handleKeyDown}
          >
            {/* Search input */}
            <div
              className="flex items-center gap-2.5 px-4"
              style={{ borderBottom: "1px solid var(--color-border)", height: "52px" }}
            >
              <Search size={16} style={{ color: "var(--color-text-tertiary)" }} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search pages, actions and records…"
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: "var(--color-text-primary)" }}
                aria-label="Search pages and actions"
                autoComplete="off"
              />
              <kbd
                className="hidden sm:flex items-center px-1.5 py-0.5 text-[10px] font-medium"
                style={{
                  color: "var(--color-text-tertiary)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div ref={listRef} className="max-h-[320px] overflow-y-auto py-1.5" role="listbox">
              {grouped.length === 0 && (
                <p className="px-4 py-6 text-center text-sm" style={{ color: "var(--color-text-tertiary)" }}>
                  {searching ? "Searching…" : <>No results for “{query}”</>}
                </p>
              )}
              {grouped.map((item) =>
                item.type === "header" ? (
                  <p
                    key={`h-${item.section}`}
                    className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    {item.section}
                  </p>
                ) : (
                  <button
                    key={item.cmd.id}
                    role="option"
                    aria-selected={item.idx === activeIndex}
                    onMouseEnter={() => setActiveIndex(item.idx)}
                    onClick={() => runCommand(item.cmd)}
                    className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors"
                    style={{
                      background:
                        item.idx === activeIndex ? "var(--color-surface-2)" : "transparent",
                      color: "var(--color-text-primary)",
                    }}
                  >
                    <item.cmd.icon
                      size={15}
                      style={{ color: "var(--color-text-tertiary)", flexShrink: 0 }}
                    />
                    <span className="flex-1 truncate">{item.cmd.label}</span>
                    {item.idx === activeIndex && (
                      <CornerDownLeft size={13} style={{ color: "var(--color-text-tertiary)" }} />
                    )}
                  </button>
                )
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
