"use client";
// components/command-centre/HealthScoreRing.js
// Animated SVG ring that shows a 0-100 health score.

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function scoreToColor(score) {
  if (score >= 80) return "#10b981"; // emerald
  if (score >= 60) return "#f59e0b"; // amber
  if (score >= 40) return "#f97316"; // orange
  return "#ef4444";                  // red
}

function scoreLabel(score) {
  if (score >= 80) return "Strong";
  if (score >= 60) return "Fair";
  if (score >= 40) return "At Risk";
  return "Critical";
}

export default function HealthScoreRing({ score = 0, loading = false }) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const color = scoreToColor(clampedScore);
  const label = scoreLabel(clampedScore);
  const dashOffset = CIRCUMFERENCE - (clampedScore / 100) * CIRCUMFERENCE;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: 140, height: 140 }}>
        <svg width={140} height={140} viewBox="0 0 140 140">
          {/* Track */}
          <circle
            cx={70}
            cy={70}
            r={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={10}
          />
          {/* Progress */}
          {!loading && (
            <motion.circle
              cx={70}
              cy={70}
              r={RADIUS}
              fill="none"
              stroke={color}
              strokeWidth={10}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              initial={{ strokeDashoffset: CIRCUMFERENCE }}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              transform="rotate(-90 70 70)"
            />
          )}
          {loading && (
            <circle
              cx={70}
              cy={70}
              r={RADIUS}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={10}
              strokeDasharray="34 300"
              className="animate-spin"
              style={{ transformOrigin: "70px 70px" }}
            />
          )}
        </svg>

        {/* Centre text */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          aria-label={`Health score: ${clampedScore}`}
        >
          {loading ? (
            <div className="w-10 h-5 rounded bg-white/10 animate-pulse" />
          ) : (
            <>
              <motion.span
                key={clampedScore}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.8 }}
                className="font-bold"
                style={{ fontSize: "1.75rem", color, lineHeight: 1 }}
              >
                {clampedScore}
              </motion.span>
              <span className="text-xs font-medium mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                / 100
              </span>
            </>
          )}
        </div>
      </div>

      <div className="text-center">
        {loading ? (
          <div className="w-16 h-4 rounded bg-white/10 animate-pulse mx-auto" />
        ) : (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-sm font-semibold tracking-wide"
            style={{ color }}
          >
            {label}
          </motion.p>
        )}
      </div>
    </div>
  );
}
