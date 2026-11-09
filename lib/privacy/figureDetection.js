// lib/privacy/figureDetection.js
// Pure helpers for the global "blur figures" privacy mode.
// Kept side-effect-free so they can be unit tested without a DOM.

const CURRENCY_SYMBOL = /[$€£¥₹]/;
// Case-insensitive currency codes, including Kenyan formats (KSh, Ksh, KSh., KES, etc.)
const CURRENCY_CODE = /\b(?:KES|USD|EUR|GBP|UGX|TZS|ZAR|KSh|USh|TSh|Ksh)\b\.?/i;
const GROUPED_NUMBER = /(?:[−\-+]?\s*)?\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b/;
const DECIMAL_NUMBER = /(?:[−\-+]?\s*)?\b\d+\.\d{2,}\b/;
const PERCENTAGE = /(?:[−\-+]?\s*)?\b\d+(?:\.\d+)?\s?%/;
// Large integers (5+ digits) are treated as numbers/balances
const LARGE_INTEGER = /\b\d{5,}\b/;
// 4-digit numbers that are not standard calendar years (1900-2099)
const FOUR_DIGIT_NON_YEAR = /\b(?!19\d{2}|20\d{2})\d{4}\b/;

// Date & time patterns that must NOT be blurred unless explicitly accompanied by currency
const ISO_DATE = /^\s*\d{4}[-/]\d{1,2}[-/]\d{1,2}\s*$/;
const SLASH_DATE = /^\s*\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\s*$/;
const TEXT_DATE = /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}\b/i;
const TEXT_DATE_REV = /\b\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?),?\s+\d{4}\b/i;
const STANDALONE_YEAR = /^\s*(?:19|20)\d{2}\s*$/;
const TIME_STRING = /^\s*\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?\s*$/;

/**
 * Decide whether a piece of text looks like a financial figure that should be
 * blurred in privacy mode.
 *
 * @param {string} text
 * @returns {boolean}
 */
export function looksLikeFigure(text) {
  if (text === null || text === undefined) return false;
  const value = String(text);
  if (!value.trim()) return false;

  // 1. Explicit currency symbols or codes always qualify as financial figures
  const hasCurrency = CURRENCY_SYMBOL.test(value) || CURRENCY_CODE.test(value);
  if (hasCurrency) return true;

  // 2. Pure dates and timestamps without currency should NOT be blurred
  if (
    ISO_DATE.test(value) ||
    SLASH_DATE.test(value) ||
    TEXT_DATE.test(value) ||
    TEXT_DATE_REV.test(value) ||
    STANDALONE_YEAR.test(value) ||
    TIME_STRING.test(value)
  ) {
    return false;
  }

  // 3. Formatted numbers, decimals, percentages, and non-year amounts
  return (
    GROUPED_NUMBER.test(value) ||
    DECIMAL_NUMBER.test(value) ||
    PERCENTAGE.test(value) ||
    LARGE_INTEGER.test(value) ||
    FOUR_DIGIT_NON_YEAR.test(value)
  );
}
