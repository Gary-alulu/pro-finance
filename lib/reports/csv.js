// lib/reports/csv.js
// RFC 4180 CSV serialization used by all report exports.
// Also guards against spreadsheet formula injection: values starting with
// =, +, -, @, tab or CR are prefixed with an apostrophe so opening the file
// in Excel/Sheets cannot execute formulas.

const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export function csvEscape(value) {
  if (value === null || value === undefined) return "";
  let s = String(value);
  if (FORMULA_PREFIX.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Build a CSV document from column definitions and row objects.
 * @param {Array<{key: string, label: string}>} columns
 * @param {Array<Record<string, unknown>>} rows
 * @returns {string} CSV text with CRLF line endings
 */
export function toCsv(columns, rows) {
  const header = columns.map((c) => csvEscape(c.label)).join(",");
  const lines = rows.map((row) =>
    columns.map((c) => csvEscape(row[c.key])).join(",")
  );
  return [header, ...lines].join("\r\n") + "\r\n";
}

/**
 * Content-Disposition filename that is safe for ASCII headers.
 */
export function exportFilename(entity, date = new Date()) {
  const stamp = date.toISOString().slice(0, 10);
  return `profinance-${entity}-${stamp}.csv`;
}
