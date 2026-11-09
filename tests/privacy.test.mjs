// tests/privacy.test.mjs
// Test suite for the Privacy Blur figure detection engine.

import test from "node:test";
import assert from "node:assert/strict";
import { looksLikeFigure } from "../lib/privacy/figureDetection.js";

// ── 1. Kenyan & Major Currency Detection ─────────────────────────────────────

test("privacy: detects Kenyan and major foreign currencies", () => {
  assert.equal(looksLikeFigure("KES 50,000"), true);
  assert.equal(looksLikeFigure("Ksh 1,500"), true);
  assert.equal(looksLikeFigure("KSh. 450,000"), true);
  assert.equal(looksLikeFigure("125,000.00 KES"), true);
  assert.equal(looksLikeFigure("kes 2500"), true);
  assert.equal(looksLikeFigure("$1,000"), true);
  assert.equal(looksLikeFigure("€500.00"), true);
  assert.equal(looksLikeFigure("£250"), true);
  assert.equal(looksLikeFigure("USD 100"), true);
});

// ── 2. Formatted & Grouped Numbers ──────────────────────────────────────────

test("privacy: detects grouped thousands and decimal monetary amounts", () => {
  assert.equal(looksLikeFigure("1,000"), true);
  assert.equal(looksLikeFigure("50,000.00"), true);
  assert.equal(looksLikeFigure("12,500,000.50"), true);
  assert.equal(looksLikeFigure("42.50"), true);
  assert.equal(looksLikeFigure("0.00"), true);
});

// ── 3. Signed Financial Values ──────────────────────────────────────────────

test("privacy: detects positive and negative signed figures", () => {
  assert.equal(looksLikeFigure("-KES 50,000"), true);
  assert.equal(looksLikeFigure("+10,000.00"), true);
  assert.equal(looksLikeFigure("−125,000.00"), true); // Unicode minus
  assert.equal(looksLikeFigure("-4500"), true);
});

// ── 4. Percentages & Rates ──────────────────────────────────────────────────

test("privacy: detects financial percentages and interest rates", () => {
  assert.equal(looksLikeFigure("15%"), true);
  assert.equal(looksLikeFigure("+12.5%"), true);
  assert.equal(looksLikeFigure("-3.2%"), true);
  assert.equal(looksLikeFigure("0.5 %"), true);
});

// ── 5. Large & Non-Year Integers ────────────────────────────────────────────

test("privacy: detects unformatted large integers and non-year 4-digit numbers", () => {
  assert.equal(looksLikeFigure("50000"), true);
  assert.equal(looksLikeFigure("1000000"), true);
  assert.equal(looksLikeFigure("4500"), true); // 4-digit non-year
  assert.equal(looksLikeFigure("8500"), true);
});

// ── 6. Preserves Dates Without Blurring ──────────────────────────────────────

test("privacy: preserves calendar dates and timestamps without blurring", () => {
  assert.equal(looksLikeFigure("2026-11-09"), false);
  assert.equal(looksLikeFigure("15/11/2026"), false);
  assert.equal(looksLikeFigure("Nov 9, 2026"), false);
  assert.equal(looksLikeFigure("November 9, 2026"), false);
  assert.equal(looksLikeFigure("9 Nov 2026"), false);
  assert.equal(looksLikeFigure("2026"), false); // Standalone year label
  assert.equal(looksLikeFigure("2025"), false);
  assert.equal(looksLikeFigure("14:30"), false);
  assert.equal(looksLikeFigure("09:45:00"), false);
  assert.equal(looksLikeFigure("12:00 PM"), false);
});

// ── 7. Preserves Non-Financial Labels ────────────────────────────────────────

test("privacy: preserves standard navigation and UI text labels", () => {
  assert.equal(looksLikeFigure("Net Worth"), false);
  assert.equal(looksLikeFigure("Overview"), false);
  assert.equal(looksLikeFigure("Total Assets"), false);
  assert.equal(looksLikeFigure("Settings"), false);
  assert.equal(looksLikeFigure("Item 1"), false);
  assert.equal(looksLikeFigure("Step 2"), false);
  assert.equal(looksLikeFigure("Financial Planning Engine"), false);
});

// ── 8. Null and Edge Case Resilience ────────────────────────────────────────

test("privacy: safely handles null, undefined, empty, and whitespace strings", () => {
  assert.equal(looksLikeFigure(null), false);
  assert.equal(looksLikeFigure(undefined), false);
  assert.equal(looksLikeFigure(""), false);
  assert.equal(looksLikeFigure("   "), false);
});
