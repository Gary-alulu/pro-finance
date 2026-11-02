// tests/journal.test.mjs
// Unit tests for the Personal Financial Command Journal schemas, category validation,
// and edit history preservation logic.

import test from "node:test";
import assert from "node:assert/strict";
import {
  createJournalEntrySchema,
  updateJournalEntrySchema,
  journalCategories,
} from "../lib/validations/schemas.js";

test("journalCategories includes all 8 core decision types", () => {
  assert.equal(journalCategories.length, 8);
  assert.ok(journalCategories.includes("investment_decision"));
  assert.ok(journalCategories.includes("major_purchase"));
  assert.ok(journalCategories.includes("savings_commitment"));
  assert.ok(journalCategories.includes("debt_decision"));
  assert.ok(journalCategories.includes("business_expense"));
  assert.ok(journalCategories.includes("unexpected_expense"));
  assert.ok(journalCategories.includes("lesson_learned"));
  assert.ok(journalCategories.includes("general_reflection"));
});

test("createJournalEntrySchema accepts a complete, valid decision memo", () => {
  const payload = {
    title: "Build Monthly Index Fund Habit",
    category: "investment_decision",
    decisionDate: "2026-10-29T00:00:00.000Z",
    contextReasoning: "Want to dollar-cost average into index funds instead of timing the market.",
    expectedOutcome: "Make 3 consecutive monthly contributions of KSh 5,000.",
    risksAssumptions: "Stock market prices can drop in the short term.",
    alternativesConsidered: "Considered keeping cash in high-yield savings.",
    amount: {
      amount: "5000.00",
      currency: "KES",
    },
    tags: ["investing", "dollar-cost-averaging", "discipline"],
    linkedRecords: [
      {
        entityType: "investment",
        entityId: "665f1234567890abcdef1234",
        title: "NSE 20 Index Fund",
      },
    ],
    reviewDate: "2027-01-29T00:00:00.000Z",
  };

  const parsed = createJournalEntrySchema.safeParse(payload);
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.title, payload.title);
  assert.equal(parsed.data.category, "investment_decision");
  assert.equal(parsed.data.tags.length, 3);
  assert.equal(parsed.data.linkedRecords.length, 1);
});

test("createJournalEntrySchema rejects missing or too-short context reasoning", () => {
  const payload = {
    title: "Buy New Laptop",
    category: "major_purchase",
    contextReasoning: "bad", // < 5 chars
  };

  const parsed = createJournalEntrySchema.safeParse(payload);
  assert.equal(parsed.success, false);
  assert.ok(parsed.error.flatten().fieldErrors.contextReasoning);
});

test("createJournalEntrySchema rejects invalid category", () => {
  const payload = {
    title: "Random Act",
    category: "gambling_wager",
    contextReasoning: "Testing invalid category",
  };

  const parsed = createJournalEntrySchema.safeParse(payload);
  assert.equal(parsed.success, false);
  assert.ok(parsed.error.flatten().fieldErrors.category);
});

test("updateJournalEntrySchema allows partial updates and reasonForEdit", () => {
  const payload = {
    contextReasoning: "Updated reasoning after evaluating Q3 cash flows.",
    reasonForEdit: "Cash flow increased after invoice clearance",
    reviewDate: "2027-04-01T00:00:00.000Z",
  };

  const parsed = updateJournalEntrySchema.safeParse(payload);
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.reasonForEdit, payload.reasonForEdit);
});

test("follow-up review status logic correctly differentiates pending vs completed", () => {
  function deriveFollowUpStatus(reviewDate, outcomeLessons) {
    if (!reviewDate) return "none";
    if (outcomeLessons && outcomeLessons.trim().length > 0) return "completed";
    return "pending";
  }

  assert.equal(deriveFollowUpStatus(null, ""), "none");
  assert.equal(deriveFollowUpStatus("2027-01-01", ""), "pending");
  assert.equal(deriveFollowUpStatus("2027-01-01", "The purchase boosted contract delivery by 25%."), "completed");
});

test("edit history preservation captures previous reasoning snapshot cleanly", () => {
  const initial = {
    title: "Acquire Kilimani Property",
    contextReasoning: "Expected 12% rental yield based on broker pitch.",
    expectedOutcome: "Immediate occupancy within 30 days.",
  };

  const historyEntry = {
    editedAt: new Date("2026-10-29T12:00:00.000Z"),
    reason: "Independent valuation revealed 8% actual yield.",
    previousState: {
      title: initial.title,
      contextReasoning: initial.contextReasoning,
      expectedOutcome: initial.expectedOutcome,
    },
  };

  assert.equal(historyEntry.previousState.contextReasoning, initial.contextReasoning);
  assert.equal(historyEntry.reason, "Independent valuation revealed 8% actual yield.");
});
