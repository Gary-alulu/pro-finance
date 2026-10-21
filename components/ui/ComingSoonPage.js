"use client";
// components/ui/ComingSoonPage.js
import { motion } from "framer-motion";
import Link from "next/link";
import { Hourglass } from "lucide-react";

export default function ComingSoonPage({ title, description, phase, links = [] }) {
  return (
    <div
      className="h-full flex flex-col items-center justify-center p-8"
      style={{ background: "var(--color-bg)", minHeight: "calc(100vh - 60px)" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
        className="text-center max-w-lg"
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: "var(--color-accent-bg)", border: "1px solid var(--color-gold-300)" }}
        >
          <Hourglass size={28} style={{ color: "var(--color-accent)" }} />
        </div>

        <div
          className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4 uppercase tracking-wider"
          style={{
            background: "var(--color-accent-bg)",
            color: "var(--color-gold-500)",
            border: "1px solid var(--color-gold-300)",
          }}
        >
          Coming — {phase}
        </div>

        <h2
          className="text-2xl font-semibold mb-3"
          style={{ color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}
        >
          {title}
        </h2>

        <p
          className="leading-relaxed mb-8"
          style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}
        >
          {description}
        </p>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: "var(--color-surface-2)", color: "var(--color-text-primary)", border: "1px solid var(--color-border)" }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
