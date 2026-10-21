// tests/sanitize.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeText, sanitizeDeep } from "../lib/security/sanitize.js";

test("HTML tags are stripped", () => {
  assert.equal(sanitizeText("<script>alert(1)</script>John"), "alert(1)John");
  assert.equal(sanitizeText('<img src=x onerror=alert(1)>Jane'), "Jane");
  assert.equal(sanitizeText('Bob<b>bold</b>'), "Bobbold");
});

test("control characters are removed, newlines and tabs kept", () => {
  assert.equal(sanitizeText("a\u0000b\u0007c"), "abc");
  assert.equal(sanitizeText("line1\nline2"), "line1\nline2");
  assert.equal(sanitizeText("col1\tcol2"), "col1\tcol2");
  assert.equal(sanitizeText("cr\r\ncrlf\rmixed"), "cr\ncrlf\nmixed");
});

test("whitespace runs collapse and outer space trims", () => {
  assert.equal(sanitizeText("  John   Doe  "), "John Doe");
  assert.equal(sanitizeText("a\u00A0\u00A0b"), "a b");
});

test("monetary and numeric strings pass through unchanged", () => {
  assert.equal(sanitizeText("12345.6789"), "12345.6789");
  assert.equal(sanitizeText("0"), "0");
  assert.equal(sanitizeText("KES"), "KES");
  assert.equal(sanitizeText("user@example.com"), "user@example.com");
});

test("sanitizeDeep walks nested objects and arrays", () => {
  const input = {
    name: "<b>Asset</b>  One ",
    meta: { note: "  line\n\n two ", tags: ["<i>a</i>", "  b  "] },
    count: 3,
    active: true,
    empty: null,
  };
  const out = sanitizeDeep(input);
  assert.equal(out.name, "Asset One");
  assert.equal(out.meta.note, "line\n\n two");
  assert.deepEqual(out.meta.tags, ["a", "b"]);
  assert.equal(out.count, 3);
  assert.equal(out.active, true);
  assert.equal(out.empty, null);
});

test("password-like keys are never rewritten", () => {
  const pw = "<script>Pa55 word</script>";
  const out = sanitizeDeep({
    password: pw,
    currentPassword: pw,
    newPassword: pw,
    passwordHash: "$2b$12$abc",
    name: "<b>x</b>",
  });
  assert.equal(out.password, pw);
  assert.equal(out.currentPassword, pw);
  assert.equal(out.newPassword, pw);
  assert.equal(out.passwordHash, "$2b$12$abc");
  assert.equal(out.name, "x");
});
