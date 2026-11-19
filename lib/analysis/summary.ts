// The plain-English summary (ticket 04): summary points, deadlines and
// incorporated-term references. Each item the model proposes passes the same
// verbatim check as a flag (ADR 0001) and is dropped if its quote fails.
// Incorporated terms are a summary note only: they never create a flag and
// never change severity (ADR 0005).
//
// "Not stated" notes are worked out by code, never supplied by the model. A
// model's claim that something is missing has no sentence to check, so the
// contract has no field for it. Code adds a note from a fixed list, only when
// the condition can be checked against the verified report.

import type { DeadlineRelation, IncorporatedTerm, ModelOutput } from "./contract";
import type { TwelveMonthFee } from "./exposure";
import type { createVerifier } from "./verbatim";

type Verifier = ReturnType<typeof createVerifier>;

export type SummaryPointShown = {
  text: string;
  sourceSentences: string[];
};

export type DeadlineShown = {
  days: number;
  relation: DeadlineRelation;
  referencePoint: string;
  // e.g. "60 days before the renewal date", "10 business days after the invoice date".
  display: string;
  sourceSentence: string;
};

export type IncorporatedTermShown = {
  description: string;
  sourceSentence: string;
  // Always false: Redline reads only the document it was given (ADR 0005).
  readByRedline: false;
};

// The fixed vocabulary of things the summary can say the document doesn't state.
export type NotStatedKind = "fee";

export type NotStatedNote = { kind: NotStatedKind; text: string };

export const NOT_STATED_COPY: Record<NotStatedKind, string> = {
  fee: "The agreement renews automatically, but it doesn't state a regular fee, so Redline can't measure any cost against 12 months of fees.",
};

export type Summary = {
  points: SummaryPointShown[];
  deadlines: DeadlineShown[];
  incorporatedTerms: IncorporatedTermShown[];
  notStated: NotStatedNote[];
  // How many summary points, deadlines and references the model proposed, and
  // how many were dropped because a quote or a day count didn't check out.
  candidateCount: number;
  droppedCount: number;
};

/**
 * The day count as it is written in `sentence`: digits followed by "day" or
 * "days", optionally "calendar", "business" or "working" days, and allowing
 * "sixty (60) days" and "30-day". The word for "day" may also be Spanish or
 * Portuguese (días, dias), French (jours), Italian (giorni), German (Tage) or
 * Dutch (dagen), so a deadline in an agreement in one of those languages isn't
 * dropped. Number words alone are not accepted: a deadline written only in
 * words is dropped, the same way a figure is.
 * Returns the unit for display ("days", "business days"), or null.
 */
function dayCountIn(sentence: string, days: number): string | null {
  const DAY_COUNT =
    /(\d{1,3}(?:,\d{3})+|\d+)\)?[\s-]*(?:(calendar|business|working)[\s-]+)?(?:days?|d[ií]as?|jours?|giorn[oi]|tag(?:e|en)?|dag(?:en)?)\b/gi;
  for (const match of sentence.matchAll(DAY_COUNT)) {
    if (Number(match[1].replace(/,/g, "")) !== days) continue;
    const kind = match[2]?.toLowerCase();
    const unit = days === 1 ? "day" : "days";
    return kind ? `${kind} ${unit}` : unit;
  }
  return null;
}

function verifyPoint(
  point: ModelOutput["summaryPoints"][number],
  verifier: Verifier,
): SummaryPointShown | null {
  if (point.sourceSentences.length === 0 || point.text.trim() === "") return null;
  const sourceSentences: string[] = [];
  for (const quote of point.sourceSentences) {
    const match = verifier.find(quote);
    if (!match) return null;
    sourceSentences.push(match.text);
  }
  return { text: point.text, sourceSentences };
}

function verifyDeadline(deadline: ModelOutput["deadlines"][number], verifier: Verifier): DeadlineShown | null {
  if (!(deadline.days > 0)) return null;
  const referencePoint = deadline.referencePoint.trim();
  if (referencePoint === "") return null;
  const match = verifier.find(deadline.sourceSentence);
  if (!match) return null;
  const unit = dayCountIn(match.text, deadline.days);
  if (!unit) return null;
  return {
    days: deadline.days,
    relation: deadline.relation,
    referencePoint,
    display: `${deadline.days.toLocaleString("en-US")} ${unit} ${deadline.relation} ${referencePoint}`,
    sourceSentence: match.text,
  };
}

/** Incorporated-term references whose sentence is in the document, as it reads there. */
export function verifyIncorporatedTerms(
  terms: IncorporatedTerm[],
  verifier: Verifier,
): (IncorporatedTermShown & { start: number })[] {
  const out: (IncorporatedTermShown & { start: number })[] = [];
  for (const term of terms) {
    if (term.description.trim() === "") continue;
    const match = verifier.find(term.sourceSentence);
    if (!match) continue;
    out.push({ description: term.description, sourceSentence: match.text, readByRedline: false, start: match.start });
  }
  return out;
}

export function buildSummary(
  output: ModelOutput,
  verifier: Verifier,
  incorporated: (IncorporatedTermShown & { start: number })[],
  facts: { line: TwelveMonthFee | null; hasAutoRenewalFlag: boolean },
): Summary {
  const points = output.summaryPoints
    .map((p) => verifyPoint(p, verifier))
    .filter((p): p is SummaryPointShown => p !== null);
  const deadlines = output.deadlines
    .map((d) => verifyDeadline(d, verifier))
    .filter((d): d is DeadlineShown => d !== null);
  const incorporatedTerms = incorporated.map(({ start: _start, ...term }) => term);

  const notStated: NotStatedNote[] = [];
  // The agreement renews on its own, yet no regular fee checks out against the
  // text (ticket 02's twelve months of fees is null).
  if (facts.hasAutoRenewalFlag && facts.line === null) {
    notStated.push({ kind: "fee", text: NOT_STATED_COPY.fee });
  }

  const candidateCount = output.summaryPoints.length + output.deadlines.length + output.incorporatedTerms.length;
  return {
    points,
    deadlines,
    incorporatedTerms,
    notStated,
    candidateCount,
    droppedCount: candidateCount - points.length - deadlines.length - incorporatedTerms.length,
  };
}
