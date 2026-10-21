// lib/security/sanitize.js
// Server-side input sanitization, applied to every JSON request body before
// zod validation. Strips HTML tags and control characters, normalizes
// whitespace. Monetary/numeric strings are unaffected (digits and decimals
// pass through untouched). Password fields are never rewritten so that
// register/login hashing always sees the identical secret.

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const HTML_TAG = /<[^>]*>/g;
const MULTISPACE = /[ \t\u00A0]{2,}/g;
const SENSITIVE_KEY = /password/i;

/**
 * Sanitize a single text value: normalize newlines, strip control
 * characters and HTML tags, collapse runs of spaces/tabs, trim.
 */
export function sanitizeText(value) {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL_CHARS, "")
    .replace(HTML_TAG, "")
    .replace(MULTISPACE, " ")
    .trim();
}

/**
 * Deep-sanitize a parsed JSON value. Strings are sanitized in place;
 * numbers, booleans and null pass through; arrays/objects are walked.
 * Keys matching /password/i are skipped.
 */
export function sanitizeDeep(value) {
  if (typeof value === "string") return sanitizeText(value);
  if (Array.isArray(value)) return value.map(sanitizeDeep);
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, v] of Object.entries(value)) {
      out[key] = SENSITIVE_KEY.test(key) ? v : sanitizeDeep(v);
    }
    return out;
  }
  return value;
}

/**
 * Parse a request body as JSON and deep-sanitize it.
 * Throws the underlying SyntaxError on malformed JSON — withErrorHandling
 * converts that to a 400.
 */
export async function readJsonBody(request) {
  const body = await request.json();
  return sanitizeDeep(body);
}
