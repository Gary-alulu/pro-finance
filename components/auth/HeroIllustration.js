// components/auth/HeroIllustration.js
// Animated hero artwork for the auth split-screen: an abstract wealth
// dashboard — growing area chart, staggered bars, net-worth ring, and
// floating record chips wired together like the financial map.

"use client";

import { motion } from "framer-motion";

const ease = [0.16, 1, 0.3, 1];

const chips = [
  { x: 24, y: 36, delay: 0.9, label: "Asset", value: "+12.4%", tone: "#34d399" },
  { x: 300, y: 22, delay: 1.15, label: "Net worth", value: "KES 48.2M", tone: "#e8b84b" },
  { x: 356, y: 322, delay: 1.4, label: "Liability", value: "−KES 9.1M", tone: "#fca89e" },
];

const bars = [
  { x: 70, h: 52, delay: 0.5 },
  { x: 114, h: 78, delay: 0.58 },
  { x: 158, h: 64, delay: 0.66 },
  { x: 202, h: 102, delay: 0.74 },
  { x: 246, h: 88, delay: 0.82 },
  { x: 290, h: 124, delay: 0.9 },
];

export default function HeroIllustration() {
  return (
    <motion.svg
      viewBox="0 0 520 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-[520px] h-auto"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="pf-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="pf-stroke" x1="60" y1="0" x2="440" y2="0">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#e8b84b" />
        </linearGradient>
        <linearGradient id="pf-bar" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#059669" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0.9" />
        </linearGradient>
        <radialGradient id="pf-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </radialGradient>
        <pattern id="pf-grid" width="26" height="26" patternUnits="userSpaceOnUse">
          <path d="M26 0H0V26" stroke="#e8f5ef" strokeOpacity="0.07" strokeWidth="1" />
        </pattern>
      </defs>

      {/* Backdrop plate */}
      <rect x="20" y="48" width="480" height="320" rx="20" fill="#0f1f16" stroke="#1f3a2b" strokeWidth="1" />
      <rect x="20" y="48" width="480" height="320" rx="20" fill="url(#pf-grid)" />
      <circle cx="260" cy="200" r="180" fill="url(#pf-glow)" />

      {/* Header row inside plate */}
      <circle cx="44" cy="72" r="4" fill="#34d399" />
      <rect x="56" y="68" width="86" height="8" rx="4" fill="#e8f5ef" fillOpacity="0.22" />
      <rect x="404" y="64" width="76" height="16" rx="8" fill="#10b981" fillOpacity="0.18" />
      <rect x="412" y="69" width="40" height="6" rx="3" fill="#34d399" fillOpacity="0.8" />

      {/* Bars */}
      {bars.map((b, i) => (
        <motion.rect
          key={i}
          x={b.x}
          width="26"
          rx="6"
          fill="url(#pf-bar)"
          initial={{ height: 0, y: 300 }}
          animate={{ height: b.h, y: 300 - b.h }}
          transition={{ duration: 0.7, ease, delay: b.delay }}
        />
      ))}

      {/* Area chart */}
      <motion.path
        d="M56 268 C 120 262, 150 236, 190 228 C 240 218, 268 236, 310 208 C 350 182, 388 168, 464 148 L 464 300 L 56 300 Z"
        fill="url(#pf-area)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.0 }}
      />
      <motion.path
        d="M56 268 C 120 262, 150 236, 190 228 C 240 218, 268 236, 310 208 C 350 182, 388 168, 464 148"
        stroke="url(#pf-stroke)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.4, ease, delay: 0.55 }}
      />
      <motion.circle
        cx="464" cy="148" r="6"
        fill="#e8b84b"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.35, ease, delay: 1.85 }}
      />
      <motion.circle
        cx="464" cy="148" r="12"
        fill="none"
        stroke="#e8b84b"
        strokeOpacity="0.4"
        strokeWidth="1.5"
        initial={{ scale: 0 }}
        animate={{ scale: [1, 1.5, 1] }}
        transition={{ duration: 2.4, ease: "easeInOut", repeat: Infinity, delay: 2.1 }}
      />

      {/* Net-worth ring */}
      <motion.circle
        cx="120" cy="140" r="34"
        stroke="#1f3a2b"
        strokeWidth="7"
        fill="none"
      />
      <motion.circle
        cx="120" cy="140" r="34"
        stroke="#e8b84b"
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
        strokeDasharray="214"
        transform="rotate(-90 120 140)"
        initial={{ strokeDashoffset: 214 }}
        animate={{ strokeDashoffset: 60 }}
        transition={{ duration: 1.2, ease, delay: 1.1 }}
      />
      <motion.text
        x="120" y="145" textAnchor="middle"
        fill="#e8f5ef" fontSize="13" fontWeight="600"
        fontFamily="var(--font-geist-sans), sans-serif"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.7 }}
      >
        72%
      </motion.text>

      {/* Map nodes + dashed links */}
      <motion.path
        d="M300 130 C 330 150, 350 180, 386 196"
        stroke="#34d399"
        strokeOpacity="0.45"
        strokeWidth="1.5"
        strokeDasharray="4 5"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease, delay: 1.5 }}
      />
      {[
        { cx: 300, cy: 130, r: 9, fill: "#10b981" },
        { cx: 386, cy: 196, r: 7, fill: "#e8b84b" },
        { cx: 340, cy: 246, r: 6, fill: "#34d399" },
      ].map((n, i) => (
        <motion.g key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.4, ease, delay: 1.55 + i * 0.12 }}>
          <circle cx={n.cx} cy={n.cy} r={n.r + 5} fill={n.fill} fillOpacity="0.18" />
          <circle cx={n.cx} cy={n.cy} r={n.r} fill={n.fill} />
        </motion.g>
      ))}
      <motion.path
        d="M300 130 C 316 170, 320 210, 340 246"
        stroke="#34d399"
        strokeOpacity="0.3"
        strokeWidth="1.5"
        strokeDasharray="4 5"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease, delay: 1.7 }}
      />

      {/* Floating chips */}
      {chips.map((c, i) => (
        <motion.g
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: [0, -5, 0] }}
          transition={{
            opacity: { duration: 0.5, delay: c.delay },
            y: { duration: 3.6, repeat: Infinity, ease: "easeInOut", delay: c.delay },
          }}
        >
          <rect x={c.x} y={c.y} width="140" height="44" rx="12" fill="#15281d" stroke="#274534" strokeWidth="1" />
          <rect x={c.x + 10} y={c.y + 12} width="20" height="20" rx="6" fill={c.tone} fillOpacity="0.18" />
          <circle cx={c.x + 20} cy={c.y + 22} r="4" fill={c.tone} />
          <rect x={c.x + 40} y={c.y + 11} width="44" height="6" rx="3" fill="#e8f5ef" fillOpacity="0.25" />
          <text
            x={c.x + 40} y={c.y + 32}
            fill={c.tone} fontSize="11" fontWeight="600"
            fontFamily="var(--font-geist-sans), sans-serif"
          >
            {c.value}
          </text>
        </motion.g>
      ))}
    </motion.svg>
  );
}
