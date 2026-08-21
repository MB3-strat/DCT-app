/**
 * Minimal client-side CSV export — used by the admin Feedback and Reported
 * issues tabs to let data be pulled into a spreadsheet (or anything else)
 * for deeper analysis than a dashboard table can offer.
 */

// User-submitted free text (feedback comments, issue descriptions) ends up
// in these exports. If a cell's first character is one of these, Excel,
// Google Sheets, and most other spreadsheet software will interpret the
// whole cell as a formula when the file is opened — "CSV/formula
// injection" — which could run arbitrary lookups or, in older Excel
// versions, worse. Prefixing with a leading apostrophe forces the cell to
// be read as plain text instead, and is invisible in the rendered sheet.
const FORMULA_TRIGGER_CHARS = new Set(["=", "+", "-", "@", "\t", "\r"]);

function neutralizeFormulaInjection(value: string): string {
  return value.length > 0 && FORMULA_TRIGGER_CHARS.has(value[0]) ? `'${value}` : value;
}

function escapeCell(value: string): string {
  const safe = neutralizeFormulaInjection(value);
  // Quote any cell containing a comma, quote, or newline; double up
  // internal quotes per RFC 4180.
  if (/[",\n]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function toCsv(headers: string[], rows: string[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(","));
  // Leading BOM so Excel opens UTF-8 files (accented characters, etc.)
  // without mangling them.
  return "﻿" + lines.join("\r\n");
}

export function downloadCsv(filename: string, headers: string[], rows: string[][]): void {
  const csv = toCsv(headers, rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
