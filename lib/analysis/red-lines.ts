import type { Severity } from "./exposure";

// Red lines (ADR 0003): the user's own deal-breakers, in plain language.
// The model may report that a clause matches one; code decides whether that
// report counts. A red line can only add a flag or raise a severity. It can
// never lower one or hide one.

/** The comparison key: trimmed and case-folded. Nothing else is forgiven. */
export function redLineKey(line: string): string {
  return line.trim().toLowerCase();
}

/**
 * The red lines an analysis runs with: trimmed, blanks removed, and
 * duplicates (same key) kept once, first spelling wins. This is also the
 * snapshot the report records.
 */
export function cleanRedLines(lines: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of lines) {
    if (typeof raw !== "string") continue;
    const line = raw.trim();
    const key = redLineKey(line);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }
  return out;
}

/**
 * The supplied red line the model's `reported` value names, or null. A match
 * counts only when it equals one of the supplied red lines exactly after
 * trimming and case-folding. A paraphrase or a made-up red line is ignored:
 * Redline never shows a red line the user didn't write.
 */
export function matchRedLine(reported: string | null, redLines: readonly string[]): string | null {
  if (reported === null) return null;
  const key = redLineKey(reported);
  if (!key) return null;
  return redLines.find((line) => redLineKey(line) === key) ?? null;
}

const ORDER: Record<Severity, number> = { low: 0, medium: 1, high: 2 };

/** Final severity = the higher of built-in and red-line severity. A match means High. */
export function withRedLine(builtIn: Severity, matched: string | null): Severity {
  const fromRedLine: Severity = matched ? "high" : "low";
  return ORDER[fromRedLine] > ORDER[builtIn] ? fromRedLine : builtIn;
}
