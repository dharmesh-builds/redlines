# ADR 0006: High cut-off, confidence rules, verdict wording and counter-offer shape

Status: Accepted, 2026-11-17. Resolves the open items in ADRs 0003, 0004 and 0005 and in `PRD.md` §§5–6.

## Decision
1. **High cut-off.** High = unbounded exposure, or stated exposure of at least 12 months of the contract's fees. When no fee is stated, the exposure is unquantified and the clause is Medium.
2. **Confidence is set by checkable rules, not the model.**
   - Low: the clause depends on a term the document doesn't define, refers to outside terms, or spans several clauses.
   - Medium: the exposure is unquantified.
   - High: otherwise.
3. **The verdict line names unread documents.** When the document refers to outside terms, the verdict reads "…in this document. It also refers to [X], which Redline hasn't read." Incorporated terms are still a summary note, not a flag (ADR 0005).
4. **Counter-offer = rewritten clause + a short email-ready request to the vendor,** for every flag. Redline doesn't guess whether the vendor will negotiate; the user decides whether to send it.

## Alternatives
1. A fixed dollar cut-off (≥ $5k); unbounded only; a user-set cut-off.
2. The model's own rating; rules that the model can lower.
3. No verdict at all when references exist; leave the verdict unchanged.
4. Add a "can't negotiate" fallback (calendar the date and so on), or give the clause rewrite only.

## Why
1. The cut-off scales with contract size, and a stated one-year auto-renewal (the CoStar and Birdeye cases) is High.
2. Rules are deterministic, testable and stable when `OPENROUTER_MODEL` changes. Self-rated confidence is none of those.
3. This closes the riskiest combination in the brief: a "fine" verdict on an order form whose real terms Redline never read. Call 9 stays as it is.
4. The research has no data on whether vendors negotiate with small buyers. Giving the request to the user avoids guessing. A fallback would drift into advice from outside the document and toward the deadline tracking that was ruled out.

## Consequences
- **Auto-renewals without a stated fee stay Medium.** The tension in ADR 0003 remains, now made explicit.
- **Confidence misses ambiguity the rules don't encode.** New rules are added only when they are testable.
- **The analysis output must carry** the defined-term checks, a reference to any outside terms, and whether the flag spans clauses, so the rules have inputs.
- **Some counter-offers will be unsendable,** for example for click-through terms. That is accepted.
