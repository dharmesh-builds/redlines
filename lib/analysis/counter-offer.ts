import type { CounterOffer } from "./contract";
import { createVerifier } from "./verbatim";

// Counter-offers (ADR 0006): for each flag, a rewritten clause and a short
// request to the vendor. The model drafts both; code decides whether the draft
// is shown. These checks are deterministic and run on every draft:
//
// 1. Both parts are non-empty: each has at least one letter or digit.
// 2. The request asks for something: see ASK below.
// 3. The rewrite differs from the clause it replaces, compared after
//    collapsing whitespace, unifying quote and dash variants and ignoring case.
// 4. The draft changes only its own clause: neither part may contain, word for
//    word (by the same verbatim check as citations), a verified source sentence
//    of any other displayed flag. A rewrite that carries another clause along
//    would have the user propose changes they didn't intend.
//
// A draft that fails is dropped and the flag stays, marked as having no
// counter-offer. ADR 0001 drops a flag only when its citation fails; the risk a
// verified flag describes is still in the document whether or not a fair
// rewrite could be drafted, so hiding it would hide risk.

// What the clause is replaced with is always the flag's verified source
// sentences, never text the model re-quoted.
export type CounterOfferShown =
  | { drafted: true; replaces: string[]; rewrittenClause: string; request: string }
  | { drafted: false; reason: CounterOfferProblem };

export type CounterOfferProblem =
  | "empty_rewrite"
  | "empty_request"
  | "no_ask"
  | "rewrite_unchanged"
  | "quotes_other_clause";

// An ask is a question to the vendor or an explicit request. Matched anywhere
// in the request, case-insensitively.
const ASK =
  /\?|\b(?:could|can|would|will|may) (?:we|you|vendor)\b|\bplease\b|\bwe(?: would|'d|’d) (?:like|ask|prefer)\b|\bwe (?:ask|request|propose)\b/i;

const HAS_CONTENT = /[\p{L}\p{N}]/u;

function comparable(text: string): string {
  return text
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[‐‑‒–—―−]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Checks one flag's drafted counter-offer. `replaces` is the flag's verified
 * source sentences; `otherSentences` are the verified source sentences of every
 * other displayed flag.
 */
export function checkCounterOffer(
  draft: CounterOffer,
  replaces: readonly string[],
  otherSentences: readonly string[],
): CounterOfferShown {
  const rewrittenClause = draft.rewrittenClause.trim();
  const request = draft.request.trim();

  if (!HAS_CONTENT.test(rewrittenClause)) return { drafted: false, reason: "empty_rewrite" };
  if (!HAS_CONTENT.test(request)) return { drafted: false, reason: "empty_request" };
  if (!ASK.test(request)) return { drafted: false, reason: "no_ask" };
  if (comparable(rewrittenClause) === comparable(replaces.join(" "))) {
    return { drafted: false, reason: "rewrite_unchanged" };
  }

  const own = new Set(replaces);
  const inRewrite = createVerifier(rewrittenClause);
  const inRequest = createVerifier(request);
  for (const sentence of otherSentences) {
    if (own.has(sentence)) continue;
    if (inRewrite.find(sentence) || inRequest.find(sentence)) {
      return { drafted: false, reason: "quotes_other_clause" };
    }
  }

  return { drafted: true, replaces: [...replaces], rewrittenClause, request };
}
