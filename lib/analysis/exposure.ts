// Exposure and severity (ADR 0003, ADR 0006). Computed by code from figures the
// model copied out of the document, never chosen by the model. Every number a
// reader sees here is either a figure quoted from a verified sentence or the
// result of arithmetic shown on those figures.

import type { CandidateFlag, ClauseType, FeePeriod, FigureUnit, PeriodicFee, QuotedFigure } from "./contract";
import type { createVerifier } from "./verbatim";

type Verifier = ReturnType<typeof createVerifier>;

export type Severity = "high" | "medium" | "low";

/** A figure as shown on a flag: the number, and the verified sentence it was quoted from. */
export type ShownFigure = {
  label: string;
  value: number;
  unit: FigureUnit;
  per: FeePeriod | null;
  // How the figure reads, e.g. "$9,000", "$750 a month", "60 days", "5%".
  display: string;
  sourceSentence: string;
};

/** Twelve months of the contract's fees: the line between High and Medium. */
export type TwelveMonthFee = {
  amount: number;
  display: string;
  // e.g. "$750 × 12 = $9,000"; null when the fee is already stated per year.
  arithmetic: string | null;
  sourceSentence: string;
};

export type Exposure =
  | { kind: "unbounded"; statement: string }
  | {
      kind: "stated";
      amount: number;
      display: string;
      // e.g. "$750 × 12 = $9,000"; null when the amount is quoted as it stands.
      arithmetic: string | null;
      // null when the document doesn't state a fee to measure against.
      twelveMonthFee: TwelveMonthFee | null;
      statement: string;
    }
  | { kind: "unquantified"; statement: string }
  | { kind: "none"; statement: string };

export const EXPOSURE_COPY = {
  unbounded: "No limit. The document sets no cap on what you could owe under this clause.",
  unquantified: "The document doesn't state the fee, so Redline can't work out what this could cost.",
  none: "No direct cost. Redline lists it so you know it's in the agreement.",
  atOrAboveLine: (amount: string, line: string) => `${amount}. That's at least 12 months of fees (${line}).`,
  belowLine: (amount: string, line: string) => `${amount}. That's less than 12 months of fees (${line}).`,
  noFee: (amount: string) =>
    `${amount}. The document doesn't state the fee, so Redline can't compare this with 12 months of fees.`,
} as const;

// ---------------------------------------------------------------------------
// Reading numbers out of a verified sentence.

const NUMBER = /\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g;
const CURRENCY = /[$£€¥]/;

type Occurrence = { symbol: string | null; percent: boolean };

/**
 * Where `value` is written in `sentence` as digits ("9,000", "9000", "9,000.00").
 * Returns null if it isn't there: the figure then has nothing to stand on.
 */
function findValue(sentence: string, value: number): Occurrence | null {
  for (const match of sentence.matchAll(NUMBER)) {
    if (Number(match[0].replace(/,/g, "")) !== value) continue;
    const before = sentence.slice(Math.max(0, match.index - 2), match.index).trim().slice(-1);
    const after = sentence.slice(match.index + match[0].length).trimStart();
    return { symbol: CURRENCY.test(before) ? before : null, percent: after.startsWith("%") };
  }
  return null;
}

function money(amount: number, symbol: string | null): string {
  const rounded = Math.round(amount * 100) / 100;
  const digits = rounded.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(rounded) ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${symbol ?? ""}${digits}`;
}

const PERIOD_WORD: Record<FeePeriod, string> = { month: "a month", quarter: "a quarter", year: "a year" };

function plural(n: number, one: string, many: string) {
  return `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
}

function displayFigure(figure: QuotedFigure, symbol: string | null): string {
  switch (figure.unit) {
    case "money":
      return figure.per ? `${money(figure.value, symbol)} ${PERIOD_WORD[figure.per]}` : money(figure.value, symbol);
    case "percent":
      return `${figure.value}%`;
    case "days":
      return plural(figure.value, "day", "days");
    case "months":
      return plural(figure.value, "month", "months");
    case "years":
      return plural(figure.value, "year", "years");
    case "count":
      return figure.value.toLocaleString("en-US");
  }
}

/**
 * Checks one figure: its sentence must appear verbatim in the document and its
 * value must be written in that sentence. Returns null if either fails, and the
 * caller drops the whole flag.
 */
export function verifyFigure(
  figure: QuotedFigure,
  verifier: Verifier,
): (ShownFigure & { symbol: string | null }) | null {
  const match = verifier.find(figure.sourceSentence);
  if (!match) return null;
  const at = findValue(match.text, figure.value);
  if (!at) return null;
  if (figure.unit === "percent" && !at.percent) return null;
  return {
    label: figure.label,
    value: figure.value,
    unit: figure.unit,
    per: figure.unit === "money" ? figure.per : null,
    display: displayFigure(figure, at.symbol),
    sourceSentence: match.text,
    symbol: at.symbol,
  };
}

/** Twelve months of fees from the document's verified periodic fee, or null. */
export function twelveMonthFee(fee: PeriodicFee | null, verifier: Verifier): TwelveMonthFee | null {
  if (!fee || !(fee.amount > 0)) return null;
  const match = verifier.find(fee.sourceSentence);
  if (!match) return null;
  const at = findValue(match.text, fee.amount);
  if (!at) return null;

  const times = { month: 12, quarter: 4, year: 1 }[fee.period];
  const amount = fee.amount * times;
  const display = money(amount, at.symbol);
  return {
    amount,
    display,
    arithmetic: times === 1 ? null : `${money(fee.amount, at.symbol)} × ${times} = ${display}`,
    sourceSentence: match.text,
  };
}

// ---------------------------------------------------------------------------
// Stated exposure: the largest amount computable from the flag's own figures.

type Amount = { amount: number; display: string; arithmetic: string | null };

function statedAmounts(figures: (ShownFigure & { symbol: string | null })[], line: TwelveMonthFee | null): Amount[] {
  const out: Amount[] = [];
  const durations = figures.filter((f) => f.unit === "months" || f.unit === "years");

  for (const f of figures) {
    if (f.unit === "money" && f.per === null) {
      out.push({ amount: f.value, display: money(f.value, f.symbol), arithmetic: null });
    }

    if (f.unit === "money" && f.per !== null) {
      // A recurring amount over a stated duration: "$778 a month" for "12 months".
      for (const d of durations) {
        const factors =
          f.per === "month" && d.unit === "months"
            ? [d.value]
            : f.per === "month" && d.unit === "years"
              ? [12, d.value]
              : f.per === "year" && d.unit === "years"
                ? [d.value]
                : null;
        if (!factors) continue;
        const amount = factors.reduce((a, b) => a * b, f.value);
        const display = money(amount, f.symbol);
        out.push({
          amount,
          display,
          arithmetic: `${money(f.value, f.symbol)} × ${factors.join(" × ")} = ${display}`,
        });
      }
    }

    if (f.unit === "percent" && line) {
      // A stated percentage of a year's fees, e.g. a capped price increase.
      const amount = (f.value / 100) * line.amount;
      const symbol = line.display.match(CURRENCY)?.[0] ?? null;
      const display = money(amount, symbol);
      out.push({ amount, display, arithmetic: `${f.value}% × ${line.display} = ${display}` });
    }
  }
  return out;
}

export type Assessment = { exposure: Exposure; severity: Severity };

export function assess(
  candidate: Pick<CandidateFlag, "clauseType" | "costsMoney" | "capStated">,
  figures: (ShownFigure & { symbol: string | null })[],
  line: TwelveMonthFee | null,
): Assessment {
  // Boilerplate and clauses with no direct money exposure: always Low.
  if (isBoilerplate(candidate.clauseType) || !candidate.costsMoney) {
    return { exposure: { kind: "none", statement: EXPOSURE_COPY.none }, severity: "low" };
  }

  if (!candidate.capStated) {
    return { exposure: { kind: "unbounded", statement: EXPOSURE_COPY.unbounded }, severity: "high" };
  }

  const amounts = statedAmounts(figures, line);
  if (amounts.length === 0) {
    return { exposure: { kind: "unquantified", statement: EXPOSURE_COPY.unquantified }, severity: "medium" };
  }

  const worst = amounts.reduce((a, b) => (b.amount > a.amount ? b : a));
  const shown = worst.arithmetic ?? worst.display;
  const lineShown = line ? (line.arithmetic ?? `${line.display} ${PERIOD_WORD.year}`) : "";
  const high = line !== null && worst.amount >= line.amount;
  return {
    exposure: {
      kind: "stated",
      ...worst,
      twelveMonthFee: line,
      statement: !line
        ? EXPOSURE_COPY.noFee(shown)
        : high
          ? EXPOSURE_COPY.atOrAboveLine(shown, lineShown)
          : EXPOSURE_COPY.belowLine(shown, lineShown),
    },
    severity: high ? "high" : "medium",
  };
}

function isBoilerplate(type: ClauseType) {
  return type === "boilerplate";
}

// ---------------------------------------------------------------------------
// Ranking: High (unbounded first, then the largest stated amount), then Medium
// (unquantified first, then the largest stated amount), then Low. Ties keep
// the order the model gave.

const SEVERITY_ORDER: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
const KIND_ORDER: Record<Exposure["kind"], number> = { unbounded: 0, unquantified: 0, stated: 1, none: 2 };

export function rank<T extends { severity: Severity; exposure: Exposure }>(flags: T[]): T[] {
  return flags
    .map((flag, i) => ({ flag, i }))
    .sort((a, b) => {
      const bySeverity = SEVERITY_ORDER[a.flag.severity] - SEVERITY_ORDER[b.flag.severity];
      if (bySeverity !== 0) return bySeverity;
      const byKind = KIND_ORDER[a.flag.exposure.kind] - KIND_ORDER[b.flag.exposure.kind];
      if (byKind !== 0) return byKind;
      const amountA = a.flag.exposure.kind === "stated" ? a.flag.exposure.amount : 0;
      const amountB = b.flag.exposure.kind === "stated" ? b.flag.exposure.amount : 0;
      return amountB - amountA || a.i - b.i;
    })
    .map(({ flag }) => flag);
}
