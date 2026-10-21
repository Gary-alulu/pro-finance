"use client";
// components/map/NodeDetailDrawer.js
// Slide-over drawer when a map node is selected.

import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Building2,
  Landmark,
  LineChart,
  FileText,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  History,
  Calendar,
} from "lucide-react";
import { formatCurrency } from "@/lib/finance/currency";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Link from "next/link";

export default function NodeDetailDrawer({ selectedNode, onClose }) {
  if (!selectedNode) return null;

  const data = selectedNode.data;
  const isAsset = data.entityType === "asset";
  const isLiability = data.entityType === "liability";
  const isInvestment = data.entityType === "investment";
  const isDocument = data.entityType === "document";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.2 }}
        className="absolute right-4 top-4 bottom-4 w-80 md:w-96 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-xl z-20 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <span
              className={`p-1.5 rounded-lg ${
                isAsset
                  ? "bg-[var(--color-emerald-50)] text-[var(--color-emerald-600)]"
                  : isLiability
                  ? "bg-[var(--color-coral-50)] text-[var(--color-coral-600)]"
                  : isInvestment
                  ? "bg-sky-50 text-sky-600"
                  : "bg-purple-50 text-purple-600"
              }`}
            >
              {isAsset ? (
                <Building2 className="w-4 h-4" />
              ) : isLiability ? (
                <Landmark className="w-4 h-4" />
              ) : isInvestment ? (
                <LineChart className="w-4 h-4" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
              {data.entityType} Details
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
          <div>
            <h3 className="text-base font-bold text-[var(--color-text-primary)]">
              {data.title || data.label}
            </h3>
            {data.category && (
              <p className="text-[11px] text-[var(--color-text-secondary)] capitalize mt-0.5">
                Category: {data.category.replace(/_/g, " ")}
              </p>
            )}
          </div>

          {data.amount && (
            <div className="p-3.5 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)]">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-text-tertiary)]">
                {isLiability ? "Outstanding Obligation" : "Monetary Value"}
              </span>
              <div
                className={`text-xl font-bold mt-0.5 ${
                  isLiability ? "text-[var(--color-coral-600)]" : "text-[var(--color-text-primary)]"
                }`}
              >
                {formatCurrency(data.amount, data.currency || "KES")}
              </div>
            </div>
          )}

          {data.status && (
            <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--color-border)]">
              <span className="text-[11px] text-[var(--color-text-secondary)]">
                Valuation Freshness
              </span>
              <Badge
                tone={
                  data.status === "fresh" || data.status === "approved"
                    ? "emerald"
                    : data.status === "warning"
                    ? "gold"
                    : "coral"
                }
                dot
              >
                {data.status}
              </Badge>
            </div>
          )}

          {data.interestRate && (
            <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--color-border)]">
              <span className="text-[11px] text-[var(--color-text-secondary)]">Interest Rate</span>
              <span className="font-bold text-[var(--color-text-primary)]">
                {data.interestRate}% APR
              </span>
            </div>
          )}

          {data.asOf && (
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-tertiary)]">
              <Calendar className="w-3.5 h-3.5" />
              <span>Last verified: {new Date(data.asOf).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-surface-2)]">
          <Link
            href={
              (isAsset
                ? "/assets"
                : isLiability
                ? "/assets"
                : isInvestment
                ? "/investments"
                : "/documents") +
              (data.entityId ? `?focus=${data.entityId}` : "")
            }
          >
            <Button variant="primary" className="w-full text-xs" icon={ExternalLink}>
              Manage {data.entityType} Records
            </Button>
          </Link>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
