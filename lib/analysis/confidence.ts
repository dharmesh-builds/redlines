// Confidence (ADR 0004, ADR 0006). How sure Redline is about its reading of a
// clause, set by checkable rules and never by the model's own rating:
// - Low: the clause relies on a term the document doesn't define, refers to
//   outside terms, or spans several clauses
// - Medium: the exposure is unquantified
// - High: otherwise.
//
// Every input is checked against the document before it can lower a label:
// - Undefined terms. The model names them; code keeps a term only if it is
//   written in the document and the document doesn't define it. A term the
//   document defines ("Users" means ..., (the "Service"), or an order-form
//   line such as "Effective Date: ...") is dropped, and so is a term that
//   isn't in the document at all.
// - Outside terms. The model's flag, or code finding that one of the flag's
//   verified sentences is a verified incorporated-term reference.
// - Spanning clauses. Derived by code from where the flag's verified source
//   sentences sit in the document; the model is not asked. Each sentence is
//   placed in the numbered clause it falls under (the nearest line above it
//   that starts with a clause number such as "9.1" or "3."), or, before the
//   first numbered clause, in its paragraph. Sentences in two or more
//   different clauses mean the flag spans clauses. A model boolean would be
//   one more unchecked claim; positions in the stored text are not.

import type { Exposure } from "./exposure";

export type ConfidenceLevel = "high" | "medium" | "low";

export type ConfidenceReason =
  | { kind: "undefined_terms"; terms: string[] }
  | { kind: "outside_terms" }
  // `clauses` holds clause numbers as written in the document ("9.1"); it is
  // empty when the clauses aren't numbered.
  | { kind: "spans_clauses"; clauses: string[] }
  | { kind: "unquantified" };

export type Confidence = {
  level: ConfidenceLevel;
  // Always names confidence: "Low confidence", never a bare "Low".
  label: string;
  reasons: ConfidenceReason[];
  // The reasons as one or more plain sentences; null for High.
  reasonText: string | null;
};

export const CONFIDENCE_COPY = {
  label: {
    high: "High confidence",
    medium: "Medium confidence",
    low: "Low confidence",
  } satisfies Record<ConfidenceLevel, string>,
  undefinedTerms: (terms: string[]) =>
    `The clause uses ${listOf(terms.map((t) => `"${t}"`))}, which the document never defines.`,
  outsideTerms: "It depends on another document that Redline hasn't read.",
  spansClauses: (clauses: string[]) =>
    clauses.length >= 2 ? `It combines clauses ${listOf(clauses)}.` : "It combines more than one clause.",
  unquantified: "The document doesn't state an amount for this clause.",
} as const;

function listOf(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

export function reasonSentence(reason: ConfidenceReason): string {
  switch (reason.kind) {
    case "undefined_terms":
      return CONFIDENCE_COPY.undefinedTerms(reason.terms);
    case "outside_terms":
      return CONFIDENCE_COPY.outsideTerms;
    case "spans_clauses":
      return CONFIDENCE_COPY.spansClauses(reason.clauses);
    case "unquantified":
      return CONFIDENCE_COPY.unquantified;
  }
}

// ---------------------------------------------------------------------------
// The document, read once for every flag.

type ClauseMarker = { start: number; label: string | null };

export type DocumentIndex = {
  /** Terms from `claimed` that are written in the document and not defined there, as the document writes them. */
  undefinedTerms(claimed: readonly string[]): string[];
  /** The clause a document offset falls in. */
  clauseAt(offset: number): ClauseMarker;
};

const toStraight = (s: string) => s.replace(/[‘’‚‛′]/g, "'").replace(/[“”„‟″]/g, '"');
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// A line that opens a numbered clause: "9.1 Any dispute", "3. Term", "Section 4".
// A bare number ("30 days" wrapped onto a new line) is not a clause number.
const CLAUSE_START =
  /^[ \t]*(?:(?:Section|SECTION|Article|ARTICLE|Clause|CLAUSE)[ \t]+(\d{1,3}(?:\.\d{1,3})*)|(\d{1,3}(?:\.\d{1,3})+|\d{1,3}\.))[ \t]+(?=\S)/gm;
const PARAGRAPH_BREAK = /\n[ \t]*\r?\n/g;

const DEFINING_WORDS =
  "(?:shall\\s+mean|means|mean|shall\\s+have\\s+the\\s+meaning|has\\s+the\\s+meaning|have\\s+the\\s+meaning|refers?\\s+to|(?:is|are)\\s+defined)";

export function indexDocument(documentText: string): DocumentIndex {
  // Quote marks unified, whitespace collapsed; offsets aren't needed for terms.
  const flat = toStraight(documentText).replace(/\s+/g, " ");
  const straight = toStraight(documentText);

  const markers: ClauseMarker[] = [];
  for (const m of documentText.matchAll(CLAUSE_START)) {
    markers.push({ start: m.index, label: (m[1] ?? m[2]).replace(/\.$/, "") });
  }
  const firstNumbered = markers[0]?.start ?? Infinity;
  const paragraphs: ClauseMarker[] = [{ start: 0, label: null }];
  for (const m of documentText.matchAll(PARAGRAPH_BREAK)) {
    if (m.index < firstNumbered) paragraphs.push({ start: m.index + m[0].length, label: null });
  }

  function variants(term: string): string[] {
    const out = [term];
    if (/s$/i.test(term)) out.push(term.slice(0, -1));
    else out.push(`${term}s`);
    return out.filter((v) => v.length > 0);
  }

  function isDefined(term: string): boolean {
    for (const v of variants(term)) {
      const t = escape(v);
      const quoted = `["']${t}["']`;
      const patterns = [
        // "Term" means ... / "Term" shall have the meaning ...
        new RegExp(`${quoted}\\s*,?\\s*${DEFINING_WORDS}\\b`, "i"),
        // (the "Term"), ("Term"), (each, a "Term"), (collectively, the "Terms")
        new RegExp(`\\([^()"]{0,40}${quoted}\\s*\\)`, "i"),
      ];
      if (patterns.some((p) => p.test(flat))) return true;
      // An order-form line that sets the term: "Effective Date: December 1, 2026"
      if (new RegExp(`^[ \\t]*${t}[ \\t]*:[ \\t]*\\S`, "im").test(straight)) return true;
    }
    return false;
  }

  function writtenAs(term: string): string | null {
    const m = flat.match(new RegExp(`(?<![\\p{L}\\p{N}])${escape(term)}(?![\\p{L}\\p{N}])`, "iu"));
    return m ? m[0] : null;
  }

  return {
    undefinedTerms(claimed) {
      const out: string[] = [];
      const seen = new Set<string>();
      for (const raw of claimed) {
        const term = toStraight(raw).replace(/\s+/g, " ").trim().replace(/^["']+|["']+$/g, "").trim();
        if (!/[\p{L}\p{N}]/u.test(term)) continue;
        const key = term.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        const asWritten = writtenAs(term);
        if (!asWritten || isDefined(term)) continue;
        out.push(asWritten);
      }
      return out;
    },
    clauseAt(offset) {
      const list = offset >= firstNumbered ? markers : paragraphs;
      let found = list[0];
      for (const m of list) {
        if (m.start > offset) break;
        found = m;
      }
      return found;
    },
  };
}

// ---------------------------------------------------------------------------

export type ConfidenceInput = {
  // Terms the model says the clause relies on but the document doesn't define.
  claimedUndefinedTerms: readonly string[];
  refersToOutsideTerms: boolean;
  // Where each verified source sentence starts in the document.
  sourceOffsets: readonly number[];
  exposure: Exposure;
};

export function assessConfidence(input: ConfidenceInput, doc: DocumentIndex): Confidence {
  const low: ConfidenceReason[] = [];

  const terms = doc.undefinedTerms(input.claimedUndefinedTerms);
  if (terms.length > 0) low.push({ kind: "undefined_terms", terms });

  if (input.refersToOutsideTerms) low.push({ kind: "outside_terms" });

  const clauses = new Map<number, string | null>();
  for (const offset of input.sourceOffsets) {
    const clause = doc.clauseAt(offset);
    clauses.set(clause.start, clause.label);
  }
  if (clauses.size > 1) {
    const ordered = [...clauses.entries()].sort((a, b) => a[0] - b[0]).map(([, label]) => label);
    const labels = ordered.every((l): l is string => l !== null) ? ordered : [];
    low.push({ kind: "spans_clauses", clauses: labels });
  }

  if (low.length > 0) return withCopy("low", low);
  if (input.exposure.kind === "unquantified") return withCopy("medium", [{ kind: "unquantified" }]);
  return withCopy("high", []);
}

function withCopy(level: ConfidenceLevel, reasons: ConfidenceReason[]): Confidence {
  return {
    level,
    label: CONFIDENCE_COPY.label[level],
    reasons,
    reasonText: reasons.length === 0 ? null : reasons.map(reasonSentence).join(" "),
  };
}
