"use client";
// components/layout/Sidebar.js
// Premium collapsible sidebar navigation.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Activity,
  Network,
  Landmark,
  TrendingUp,
  ArrowLeftRight,
  FileText,
  ReceiptText,
  BarChart3,
  ShieldCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
} from "lucide-react";
import { signOut } from "next-auth/react";

const NAV_ITEMS = [
  { href: "/overview",         label: "Overview",            icon: LayoutDashboard },
  { href: "/command-centre",   label: "Command Centre",      icon: Activity, badge: "New" },
  { href: "/map",              label: "Financial Map",       icon: Network },
  { href: "/assets",           label: "Assets & Liabilities",icon: Landmark },
  { href: "/investments",      label: "Investments",         icon: TrendingUp },
  { href: "/transactions",     label: "Transactions",        icon: ArrowLeftRight },
  { href: "/documents",        label: "Documents",           icon: FileText },
  { href: "/invoices",         label: "Invoices",            icon: ReceiptText },
  { href: "/reports",          label: "Reports",             icon: BarChart3 },
  { href: "/accountability",   label: "Accountability",      icon: ShieldCheck },
];

const BOTTOM_ITEMS = [
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar({ collapsed, onToggle, user, isMobile = false }) {
  const pathname = usePathname();

  const sidebarWidth = collapsed && !isMobile ? "64px" : "240px";

  function isActive(href) {
    if (href === "/overview") return pathname === "/overview" || pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <motion.aside
      animate={{ width: sidebarWidth }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="h-full flex flex-col overflow-hidden"
      style={{
        background: "var(--sidebar-bg)",
        borderRight: "1px solid var(--sidebar-border)",
        width: sidebarWidth,
      }}
      aria-label="Main navigation"
    >
      {/* ── Logo & collapse toggle ─────────────────────────────────────── */}
      <div
        className="flex items-center px-4 flex-shrink-0"
        style={{
          height: "var(--topbar-height)",
          borderBottom: "1px solid var(--sidebar-border)",
        }}
      >
        <Link
          href="/overview"
          className="flex items-center gap-3 min-w-0 flex-1"
        >
          {/* Monogram */}
          <div
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
            style={{
              background: "var(--color-emerald-500)",
              color: "#faf9f6",
              minWidth: "2rem",
            }}
          >
            P
          </div>

          {/* Brand name */}
          <AnimatePresence initial={false}>
            {(!collapsed || isMobile) && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="font-semibold text-sm whitespace-nowrap overflow-hidden"
                style={{ color: "var(--sidebar-text-active)" }}
              >
                ProFinance
              </motion.span>
            )}
          </AnimatePresence>
        </Link>

        {/* Close button (mobile) or collapse toggle (desktop) */}
        <button
          onClick={onToggle}
          className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-md ml-1 transition-colors"
          style={{ color: "var(--sidebar-text)", background: "transparent" }}
          aria-label={isMobile ? "Close navigation" : collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isMobile ? (
            <X size={16} />
          ) : collapsed ? (
            <ChevronRight size={15} />
          ) : (
            <ChevronLeft size={15} />
          )}
        </button>
      </div>

      {/* ── Primary navigation ────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <SidebarItem
            key={item.href}
            item={item}
            collapsed={collapsed && !isMobile}
            active={isActive(item.href)}
          />
        ))}
      </nav>

      {/* ── Bottom section ─────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 py-3 px-2 space-y-0.5"
        style={{ borderTop: "1px solid var(--sidebar-border)" }}
      >
        {BOTTOM_ITEMS.map((item) => (
          <SidebarItem
            key={item.href}
            item={item}
            collapsed={collapsed && !isMobile}
            active={isActive(item.href)}
          />
        ))}

        {/* User + sign out */}
        <div className="mt-2 pt-2" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
          <div
            className="flex items-center gap-3 px-2 py-2 rounded-lg"
            style={{ minHeight: "40px" }}
          >
            {/* Avatar */}
            <div
              className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: "var(--color-emerald-700)", color: "#faf9f6" }}
            >
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>

            {/* Name + sign out */}
            <AnimatePresence initial={false}>
              {(!collapsed || isMobile) && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 min-w-0 overflow-hidden"
                >
                  <p
                    className="text-xs font-medium truncate"
                    style={{ color: "var(--sidebar-text-active)" }}
                  >
                    {user?.name || user?.email || "Account"}
                  </p>
                  <p
                    className="text-xs truncate"
                    style={{ color: "var(--sidebar-text)", fontSize: "0.7rem" }}
                  >
                    {user?.email}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {(!collapsed || isMobile) && (
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex-shrink-0 p-1 rounded transition-colors"
                style={{ color: "var(--sidebar-text)" }}
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.aside>
  );
}

function SidebarItem({ item, collapsed, active }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className="flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-all group relative"
      style={{
        color: active ? "var(--sidebar-text-active)" : "var(--sidebar-text)",
        background: active ? "rgba(16,185,129,0.15)" : "transparent",
        minHeight: "38px",
      }}
      aria-current={active ? "page" : undefined}
    >
      {/* Active indicator */}
      {active && (
        <motion.span
          layoutId="sidebar-active"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r"
          style={{ background: "var(--color-emerald-400)" }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        />
      )}

      <Icon
        size={17}
        className="flex-shrink-0"
        style={{
          color: active ? "var(--color-emerald-400)" : "inherit",
          minWidth: "17px",
        }}
      />

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 whitespace-nowrap overflow-hidden flex-1 min-w-0"
          >
            <span className="truncate">{item.label}</span>
            {item.badge && (
              <span
                className="flex-shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded-full"
                style={{
                  fontSize: "0.6rem",
                  background: "rgba(16,185,129,0.2)",
                  color: "var(--color-emerald-400)",
                  letterSpacing: "0.04em",
                }}
              >
                {item.badge}
              </span>
            )}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}
