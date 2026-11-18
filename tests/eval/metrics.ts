import type { DeadlineShown, Flag, Report, Severity } from "../../lib/analysis";
import { createVerifier } from "../../lib/analysis/verbatim";
import type { EvalLabels, LabelledDeadline } from "./labels";

// Pure scoring of one Report against one document's labels. No I/O, no model:
// the runner (run.eval.ts) feeds it real reports, the unit tests hand-built ones.

// ---------------------------------------------------------------------------
// Matching

/**
 * Two quotes overlap when one appears inside the other word for word, after
 * the verbatim checker's own normalization (whitespace, quote marks, dashes,
 * line-break hyphens). So a flag that quotes a whole labelled sentence, part
 * of it, or a passage containing it all match that sentence.
 */
export function quotesOverlap(a: string, b: string): boolean {
  return createVerifier(a).find(b) !== null || createVerifier(b).find(a) !== null;
}

function anyOverlap(quotes: string[], labelled: string[]): boolean {
  return quotes.some((q) => labelled.some((l) => quotesOverlap(q, l)));
}

/** A flag matches a labelled item when any of its source sentences overlaps any labelled sentence. */
export function flagMatches(flag: Flag, sentences: string[]): boolean {
  return anyOverlap(flag.sourceSentences, sentences);
}

/**
 * Reference points are compared after lowercasing, unifying quote marks and
 * dashes, dropping punctuation and the words "the", "a" and "an", and
 * collapsing spaces. "The renewal date" equals "renewal date"; "the invoice
 * date" does not equal "the date of the invoice" unless the label lists it in
 * acceptedReferencePoints.
 */
export function normalizeReferencePoint(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[‐‑‒–—―−]/g, "-")
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .split(/\s+/)
    .filter((w) => w !== "" && w !== "the" && w !== "a" && w !== "an")
    .join(" ");
}

/**
 * Exact deadline rule: same number of days, same side (before/after), the
 * same reference point (see normalizeReferencePoint, or one of the label's
 * acceptedReferencePoints), and a source sentence that overlaps the labelled
 * sentence, so the deadline is the one the label means.
 */
export function deadlineIsExact(label: LabelledDeadline, shown: DeadlineShown): boolean {
  const accepted = [label.referencePoint, ...(label.acceptedReferencePoints ?? [])].map(normalizeReferencePoint);
  return (
    shown.days === label.days &&
    shown.relation === label.relation &&
    accepted.includes(normalizeReferencePoint(shown.referencePoint)) &&
    quotesOverlap(shown.sourceSentence, label.sentence)
  );
}

// ---------------------------------------------------------------------------
// T1: every citation in the report is in the document word for word.

export type CitationFailure = { where: string; quote: string };

/**
 * Re-runs the real verbatim check on every quote in the report, independently
 * of analyze(), so a bug there can't hide an unverified citation. Covers each
 * flag's source sentences, figure sentences and the sentences its
 * counter-offer replaces, and every summary quote. A flag with no source
 * sentence at all is a failure too.
 */
export function citationFailures(documentText: string, report: Report): CitationFailure[] {
  const verifier = createVerifier(documentText);
  const failures: CitationFailure[] = [];
  const check = (where: string, quote: string) => {
    if (verifier.find(quote) === null) failures.push({ where, quote });
  };

  report.flags.forEach((flag, i) => {
    const at = `flag ${i + 1}`;
    if (flag.sourceSentences.length === 0) failures.push({ where: `${at}: no source sentence`, quote: "" });
    flag.sourceSentences.forEach((s, j) => check(`${at} source sentence ${j + 1}`, s));
    flag.figures.forEach((f, j) => check(`${at} figure ${j + 1}`, f.sourceSentence));
    if (flag.counterOffer.drafted) {
      flag.counterOffer.replaces.forEach((s, j) => check(`${at} counter-offer replaces ${j + 1}`, s));
    }
  });
  report.summary.points.forEach((p, i) =>
    p.sourceSentences.forEach((s, j) => check(`summary point ${i + 1} sentence ${j + 1}`, s)),
  );
  report.summary.deadlines.forEach((d, i) => check(`deadline ${i + 1}`, d.sourceSentence));
  report.summary.incorporatedTerms.forEach((t, i) => check(`incorporated term ${i + 1}`, t.sourceSentence));
  return failures;
}

// ---------------------------------------------------------------------------
// Per-document score

export type HighMiss = { id: string; reason: "not flagged" | `flagged ${Severity}` };

export type DeadlineMiss = { label: string; got: string[] };

export type FalseAlarm = { flag: number; kind: "unlabelled" | "looks risky but isn't"; id: string | null; sentence: string };

export type DocumentScore = {
  document: string;
  provisional: boolean;
  modelId: string;
  t1: { failures: CitationFailure[] };
  q1: { labelled: number; found: number; missed: HighMiss[] };
  q2: { labelled: number; exact: number; inexact: DeadlineMiss[] };
  q3: { shown: number; falseAlarms: FalseAlarm[]; rate: number | null };
  q5: { labelled: number; found: number; missing: string[] };
  // Why this document fails the eval; empty when it passes.
  failures: string[];
};

function deadlineText(d: { days: number; relation: string; referencePoint: string }): string {
  return `${d.days} days ${d.relation} ${d.referencePoint}`;
}

export function scoreDocument(name: string, documentText: string, labels: EvalLabels, report: Report): DocumentScore {
  // T1
  const t1 = { failures: citationFailures(documentText, report) };

  // Q1: a High clause is found only by a flag that matches it AND is High.
  const highs = labels.clauses.filter((c) => c.expectedSeverity === "high");
  const missed: HighMiss[] = [];
  for (const clause of highs) {
    const matching = report.flags.filter((f) => flagMatches(f, clause.sentences));
    if (matching.some((f) => f.severity === "high")) continue;
    missed.push({ id: clause.id, reason: matching.length === 0 ? "not flagged" : `flagged ${matching[0].severity}` });
  }
  const q1 = { labelled: highs.length, found: highs.length - missed.length, missed };

  // Q2
  const inexact: DeadlineMiss[] = [];
  for (const label of labels.deadlines) {
    if (report.summary.deadlines.some((d) => deadlineIsExact(label, d))) continue;
    const near = report.summary.deadlines.filter((d) => quotesOverlap(d.sourceSentence, label.sentence));
    inexact.push({ label: deadlineText(label), got: near.map(deadlineText) });
  }
  const q2 = { labelled: labels.deadlines.length, exact: labels.deadlines.length - inexact.length, inexact };

  // Q3: a flag that matches no labelled clause is a false alarm; when it
  // lands on a looksRiskyButIsnt item it is reported as that kind.
  const falseAlarms: FalseAlarm[] = [];
  report.flags.forEach((flag, i) => {
    if (labels.clauses.some((c) => flagMatches(flag, c.sentences))) return;
    const decoy = labels.looksRiskyButIsnt.find((l) => flagMatches(flag, l.sentences));
    falseAlarms.push({
      flag: i + 1,
      kind: decoy ? "looks risky but isn't" : "unlabelled",
      id: decoy?.id ?? null,
      sentence: flag.sourceSentences[0] ?? "",
    });
  });
  const shown = report.flags.length;
  const q3 = { shown, falseAlarms, rate: shown === 0 ? null : falseAlarms.length / shown };

  // Q5
  const missing = labels.incorporatedTerms
    .filter((t) => !report.summary.incorporatedTerms.some((s) => quotesOverlap(s.sourceSentence, t.sentence)))
    .map((t) => t.description);
  const q5 = { labelled: labels.incorporatedTerms.length, found: labels.incorporatedTerms.length - missing.length, missing };

  const failures: string[] = [];
  if (t1.failures.length > 0) failures.push(`T1: ${t1.failures.length} citation(s) not in the document word for word`);
  if (missed.length > 0) failures.push(`Q1: ${missed.length} High clause(s) not flagged High`);
  if (inexact.length > 0) failures.push(`Q2: ${inexact.length} deadline(s) not stated exactly`);
  if (missing.length > 0) failures.push(`Q5: ${missing.length} incorporated term(s) not found`);

  return { document: name, provisional: labels.provisional, modelId: report.modelId, t1, q1, q2, q3, q5, failures };
}

// ---------------------------------------------------------------------------
// Totals across documents

export type DocumentError = { document: string; error: string };

export type Totals = {
  documents: number;
  q1: { labelled: number; found: number };
  q2: { labelled: number; exact: number };
  q3: { shown: number; falseAlarms: number; rate: number | null };
  q5: { labelled: number; found: number };
  t1Failures: number;
  passed: boolean;
};

/**
 * The run passes only when no document errored and none has a failure:
 * T1 any unverified citation, Q1/Q2/Q5 anything short of 100%. Q3 is tracked,
 * never failed (PRD §4: false alarms are counted, not capped).
 */
export function totalScores(scores: DocumentScore[], errors: DocumentError[] = []): Totals {
  const sum = (f: (s: DocumentScore) => number) => scores.reduce((n, s) => n + f(s), 0);
  const shown = sum((s) => s.q3.shown);
  const falseAlarms = sum((s) => s.q3.falseAlarms.length);
  return {
    documents: scores.length + errors.length,
    q1: { labelled: sum((s) => s.q1.labelled), found: sum((s) => s.q1.found) },
    q2: { labelled: sum((s) => s.q2.labelled), exact: sum((s) => s.q2.exact) },
    q3: { shown, falseAlarms, rate: shown === 0 ? null : falseAlarms / shown },
    q5: { labelled: sum((s) => s.q5.labelled), found: sum((s) => s.q5.found) },
    t1Failures: sum((s) => s.t1.failures.length),
    passed: errors.length === 0 && scores.length > 0 && scores.every((s) => s.failures.length === 0),
  };
}

// ---------------------------------------------------------------------------
// Printing

function ratio(found: number, of: number): string {
  return of === 0 ? "n/a (none labelled)" : `${found}/${of} (${Math.round((found / of) * 100)}%)`;
}

function rate(r: number | null, n: number, of: number): string {
  return r === null ? "n/a (no flags shown)" : `${n}/${of} flags (${Math.round(r * 100)}%)`;
}

export function formatEvalReport(
  configuredModel: string,
  scores: DocumentScore[],
  errors: DocumentError[],
  totals: Totals,
): string {
  const out: string[] = [`Redline eval`, `Model (OPENROUTER_MODEL): ${configuredModel}`, ""];

  for (const s of scores) {
    out.push(`== ${s.document}${s.provisional ? " (provisional labels)" : ""}`);
    out.push(`   Answered by: ${s.modelId}`);
    out.push(`   T1 citations verified: ${s.t1.failures.length === 0 ? "all" : `${s.t1.failures.length} FAILED`}`);
    for (const f of s.t1.failures) out.push(`      x ${f.where}: "${f.quote}"`);
    out.push(`   Q1 High clauses flagged High: ${ratio(s.q1.found, s.q1.labelled)}`);
    for (const m of s.q1.missed) out.push(`      x ${m.id}: ${m.reason}`);
    out.push(`   Q2 deadlines exact: ${ratio(s.q2.exact, s.q2.labelled)}`);
    for (const m of s.q2.inexact) {
      out.push(`      x expected "${m.label}"; got ${m.got.length === 0 ? "nothing for that sentence" : m.got.map((g) => `"${g}"`).join(", ")}`);
    }
    out.push(`   Q3 false alarms: ${rate(s.q3.rate, s.q3.falseAlarms.length, s.q3.shown)}`);
    for (const f of s.q3.falseAlarms) {
      out.push(`      - flag ${f.flag} (${f.kind}${f.id ? `: ${f.id}` : ""}): "${f.sentence}"`);
    }
    out.push(`   Q5 incorporated terms found: ${ratio(s.q5.found, s.q5.labelled)}`);
    for (const m of s.q5.missing) out.push(`      x ${m}`);
    out.push(`   Result: ${s.failures.length === 0 ? "PASS" : `FAIL (${s.failures.join("; ")})`}`, "");
  }

  for (const e of errors) out.push(`== ${e.document}`, `   Result: FAIL (analysis did not finish: ${e.error})`, "");

  out.push(
    `== Total over ${totals.documents} document(s), ${scores.length} scored`,
    `   T1 unverified citations: ${totals.t1Failures}`,
    `   Q1 High clauses flagged High: ${ratio(totals.q1.found, totals.q1.labelled)} (target 100%)`,
    `   Q2 deadlines exact: ${ratio(totals.q2.exact, totals.q2.labelled)}`,
    `   Q3 false alarms: ${rate(totals.q3.rate, totals.q3.falseAlarms, totals.q3.shown)} (tracked, not failed)`,
    `   Q5 incorporated terms found: ${ratio(totals.q5.found, totals.q5.labelled)}`,
    `   Result: ${totals.passed ? "PASS" : "FAIL"}`,
  );
  return out.join("\n");
}
