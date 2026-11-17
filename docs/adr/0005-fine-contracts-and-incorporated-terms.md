# ADR 0005: A fine contract leads with a verdict line; incorporated terms are a summary note

Status: Accepted, 2026-11-17

## Decision
- **Verdict line.** When there are no High or Medium severity flags, the report leads with a plain verdict ("nothing here that costs you money beyond what you agreed to"). Low flags, including boilerplate (ADR 0003), sit folded underneath. They are still shown, but they don't lead.
- **Incorporated terms: summary note only.** When the document pulls in outside terms ("subject to the Terms at vendor.com/terms", or an MSA, DPA or SLA it refers to), the plain-English summary says so and cites the sentence. It is not a flag and doesn't affect severity.

## Alternatives
- **Reverse the boilerplate call** so a fine contract shows zero flags. Rejected: completeness stays.
- **Flat list with no verdict.** Guarantees the "always finds problems" impression.
- **Flag incorporated terms as High** (the recommended option). It would make a clean verdict impossible while unread terms exist. Rejected as too noisy.
- **Analyze order form + MSA + DPA together.** Not requested. It would need approval as a scope change.

## Why
- Most contracts are fine. A tool that always leads with problems stops being believed.
- The user prefers the summary to carry context, with flags kept for clauses Redline has actually read.

## Consequences
- **The highest-risk combination in the brief is now possible.** An order form whose auto-renewal lives at vendor.com/terms can get the "nothing here that costs you money" verdict. Only the summary note warns otherwise. Under ADR 0001, Redline can't flag text it never saw.
- **Open, needs a decision before the verdict copy ships:** whether the verdict line names unread referenced documents ("…in this document. It also refers to the Terms at vendor.com/terms, which Redline hasn't read."). This would keep the note in the summary but stop the verdict from overclaiming.
- **Build:** detecting references to outside terms is its own extraction step, and its source sentence must pass the same verbatim check.
