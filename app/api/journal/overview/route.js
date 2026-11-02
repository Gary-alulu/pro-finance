// app/api/journal/overview/route.js
// GET /api/journal/overview — overview metrics, category counts, follow-up count

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import JournalEntry, { JOURNAL_CATEGORIES } from "@/lib/db/models/JournalEntry";
import { requireUserId, withErrorHandling } from "@/lib/auth/session";

async function handler() {
  const userId = await requireUserId();
  await connectDB();

  const now = new Date();

  const [activeEntries, archivedCount] = await Promise.all([
    JournalEntry.find({ ownerId: userId, status: "active" })
      .sort({ decisionDate: -1 })
      .lean(),
    JournalEntry.countDocuments({ ownerId: userId, status: "archived" }),
  ]);

  const totalActive = activeEntries.length;
  let followUpsPending = 0;
  let followUpsOverdue = 0;
  let followUpsCompleted = 0;

  const categoryCounts = {};
  JOURNAL_CATEGORIES.forEach((cat) => {
    categoryCounts[cat] = 0;
  });

  const tagCounts = {};

  activeEntries.forEach((entry) => {
    if (categoryCounts[entry.category] !== undefined) {
      categoryCounts[entry.category] += 1;
    }

    if (entry.reviewDate) {
      if (entry.followUpStatus === "completed") {
        followUpsCompleted += 1;
      } else {
        followUpsPending += 1;
        if (new Date(entry.reviewDate) <= now) {
          followUpsOverdue += 1;
        }
      }
    }

    if (Array.isArray(entry.tags)) {
      entry.tags.forEach((t) => {
        const clean = t.toLowerCase().trim();
        if (clean) tagCounts[clean] = (tagCounts[clean] || 0) + 1;
      });
    }
  });

  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }));

  const recent = activeEntries.slice(0, 4).map((e) => ({
    id: e._id.toString(),
    title: e.title,
    category: e.category,
    decisionDate: e.decisionDate,
    reviewDate: e.reviewDate,
    followUpStatus: e.followUpStatus,
    amount: e.amount?.amount ? {
      amount: e.amount.amount.toString(),
      currency: e.amount.currency || "KES",
    } : null,
  }));

  return NextResponse.json({
    metrics: {
      totalActive,
      archivedCount,
      followUpsPending,
      followUpsOverdue,
      followUpsCompleted,
    },
    categoryCounts,
    topTags,
    recentEntries: recent,
  });
}

export const GET = withErrorHandling(handler);
