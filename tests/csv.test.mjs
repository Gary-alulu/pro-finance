// tests/csv.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { csvEscape, toCsv, exportFilename } from "../lib/reports/csv.js";

test("plain values pass through unchanged", () => {
  assert.equal(csvEscape("hello"), "hello");
  assert.equal(csvEscape(42), "42");
  assert.equal(csvEscape(18.5), "18.5");
});

test("null and undefined become empty cells (missing ≠ zero)", () => {
  assert.equal(csvEscape(null), "");
  assert.equal(csvEscape(undefined), "");
  assert.equal(csvEscape(""), "");
  assert.equal(csvEscape(0), "0"); // real zero is preserved
});

test("commas, quotes and newlines are quoted per RFC 4180", () => {
  assert.equal(csvEscape("a,b"), '"a,b"');
  assert.equal(csvEscape('say "hi"'), '"say ""hi"""');
  assert.equal(csvEscape("line1\nline2"), '"line1\nline2"');
});

test("formula injection is neutralized", () => {
  assert.equal(csvEscape("=SUM(A1)"), "'=SUM(A1)");
  assert.equal(csvEscape("+12345"), "'+12345");
  assert.equal(csvEscape("-12345"), "'-12345");
  assert.equal(csvEscape("@cmd"), "'@cmd");
});

test("toCsv produces header + CRLF rows", () => {
  const cols = [
    { key: "name", label: "Name" },
    { key: "amount", label: "Amount" },
  ];
  const csv = toCsv(cols, [
    { name: "Plot", amount: "12500000" },
    { name: "Unvalued", amount: null },
  ]);
  assert.equal(csv, "Name,Amount\r\nPlot,12500000\r\nUnvalued,\r\n");
});

test("exportFilename is date-stamped and entity-scoped", () => {
  const name = exportFilename("assets", new Date("2026-10-20T00:00:00Z"));
  assert.equal(name, "profinance-assets-2026-10-20.csv");
});
