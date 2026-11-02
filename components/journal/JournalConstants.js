// components/journal/JournalConstants.js
// Visual and semantic configurations for Journal categories.

import {
  TrendingUp,
  ShoppingBag,
  PiggyBank,
  Landmark,
  Briefcase,
  AlertOctagon,
  Lightbulb,
  Compass,
} from "lucide-react";

export const JOURNAL_CATEGORY_META = {
  investment_decision: {
    label: "Investment Decision",
    icon: TrendingUp,
    color: "#6366f1",
    bgColor: "rgba(99, 102, 241, 0.12)",
    description: "Reasoning behind buying, holding, or selling securities & assets.",
  },
  major_purchase: {
    label: "Major Purchase",
    icon: ShoppingBag,
    color: "#06b6d4",
    bgColor: "rgba(6, 182, 212, 0.12)",
    description: "Significant equipment, personal, or property acquisitions.",
  },
  savings_commitment: {
    label: "Savings Commitment",
    icon: PiggyBank,
    color: "#10b981",
    bgColor: "rgba(16, 185, 129, 0.12)",
    description: "Disciplined contributions, emergency fund targets, and deposits.",
  },
  debt_decision: {
    label: "Debt & Loan Decision",
    icon: Landmark,
    color: "#f59e0b",
    bgColor: "rgba(245, 158, 11, 0.12)",
    description: "Borrowing, refinancing, credit limits, or debt payoff strategies.",
  },
  business_expense: {
    label: "Business / Career",
    icon: Briefcase,
    color: "#8b5cf6",
    bgColor: "rgba(139, 92, 246, 0.12)",
    description: "Investments in professional growth, ventures, tools, and courses.",
  },
  unexpected_expense: {
    label: "Unexpected Expense",
    icon: AlertOctagon,
    color: "#ef4444",
    bgColor: "rgba(239, 68, 68, 0.12)",
    description: "Emergency repairs, medical, or unbudgeted outlays.",
  },
  lesson_learned: {
    label: "Lesson Learned",
    icon: Lightbulb,
    color: "#eab308",
    bgColor: "rgba(234, 179, 8, 0.12)",
    description: "Financial wisdom gained from an outcome or market event.",
  },
  general_reflection: {
    label: "General Reflection",
    icon: Compass,
    color: "#94a3b8",
    bgColor: "rgba(148, 163, 184, 0.12)",
    description: "Periodic mindset, habit, or strategy thoughts.",
  },
};

export const JOURNAL_CATEGORIES = Object.keys(JOURNAL_CATEGORY_META);

