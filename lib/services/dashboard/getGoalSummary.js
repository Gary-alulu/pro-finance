// lib/services/dashboard/getGoalSummary.js
// Integrates goals, savings commitments, reminders and simulator projections.
// Strictly differentiates projected/simulated numbers from recorded wealth.

import { connectDB } from "@/lib/db/mongoose";
import JournalEntry from "@/lib/db/models/JournalEntry";
import Reminder from "@/lib/db/models/Reminder";
import FinancialScenario from "@/lib/db/models/FinancialScenario";
import Transaction from "@/lib/db/models/Transaction";
import { DEFAULT_CURRENCY } from "@/lib/finance/currency";
import { Decimal } from "decimal.js";

export async function getGoalSummary(
  userId,
  { reportingCurrency = DEFAULT_CURRENCY, currentNetWorth = null } = {}
) {
  await connectDB();
  const rep = (reportingCurrency || DEFAULT_CURRENCY).toUpperCase();
  const now = new Date();

  const [journalEntries, reminders, defaultScenario, recentCommitmentTxs] =
    await Promise.all([
      JournalEntry.find({
        ownerId: userId,
        category: { $in: ["savings_commitment", "investment_decision", "lesson_learned"] },
      })
        .sort({ entryDate: -1 })
        .limit(10)
        .lean(),
      Reminder.find({
        ownerId: userId,
        status: "open",
      })
        .sort({ dueAt: 1 })
        .limit(10)
        .lean(),
      FinancialScenario.findOne({
        ownerId: userId,
        $or: [{ isDefault: true }, { status: "active" }],
      }).lean(),
      // Actual savings/investment contributions in last 30 days
      Transaction.find({
        ownerId: userId,
        date: { $gte: new Date(now.getTime() - 30 * 24 * 3600 * 1000) },
        category: { $in: ["investment_purchase", "asset_purchase"] },
      }).lean(),
    ]);

  // Aggregate actual monthly contributions
  let actualMonthlyContribution = new Decimal(0);
  for (const tx of recentCommitmentTxs) {
    if (tx.amount) {
      actualMonthlyContribution = actualMonthlyContribution.plus(
        new Decimal(tx.amount.toString()).abs()
      );
    }
  }

  // Parse commitments from Journal entries
  const commitments = journalEntries.map((j) => {
    const isCompleted = j.followUpReview?.status === "completed";
    return {
      id: j._id.toString(),
      title: j.title,
      category: j.category,
      date: j.entryDate,
      reasoning: j.contextReasoning,
      reviewDate: j.followUpReview?.targetDate || null,
      isCompleted,
      isPendingReview: !isCompleted && j.followUpReview?.targetDate,
      daysUntilReview: j.followUpReview?.targetDate
        ? Math.round((new Date(j.followUpReview.targetDate).getTime() - now.getTime()) / (24 * 3600 * 1000))
        : null,
    };
  });

  // Upcoming milestones from Reminders
  const upcomingMilestones = reminders.map((r) => {
    const due = new Date(r.dueAt);
    const daysUntil = Math.round((due.getTime() - now.getTime()) / (24 * 3600 * 1000));
    return {
      id: r._id.toString(),
      title: r.title,
      dueAt: r.dueAt,
      priority: r.priority,
      daysUntil,
      isOverdue: daysUntil < 0,
      entityType: r.entityType,
    };
  });

  // Simulator scenario targets (Explicitly labeled "projected")
  let targetProjection = null;
  if (defaultScenario && defaultScenario.assumptions) {
    const plannedMonthly = defaultScenario.assumptions.monthlyInvestment || 0;
    const actualMonthly = actualMonthlyContribution.toNumber();
    const plannedMonthlyDec = new Decimal(plannedMonthly);

    const completionRate = plannedMonthlyDec.greaterThan(0)
      ? Math.min(100, Math.round((actualMonthly / plannedMonthly) * 100))
      : 0;

    targetProjection = {
      scenarioId: defaultScenario._id.toString(),
      scenarioName: defaultScenario.name,
      plannedMonthlyInvestment: plannedMonthly.toString(),
      actualMonthlyContribution: actualMonthlyContribution.toFixed(2),
      contributionRatePct: completionRate,
      assumedAnnualReturnPct: defaultScenario.assumptions.assumedAnnualReturnPct,
      timeHorizonYears: defaultScenario.timeHorizonYears,
      isProjected: true, // Crucial distinction
    };
  }

  return {
    commitments,
    upcomingMilestones,
    targetProjection,
    actualMonthlySavings: actualMonthlyContribution.toFixed(2),
    summary: {
      activeCommitmentsCount: commitments.filter((c) => !c.isCompleted).length,
      upcomingReviewsCount: commitments.filter((c) => c.isPendingReview).length,
      milestonesCount: upcomingMilestones.length,
    },
  };
}
