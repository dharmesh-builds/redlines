# 12: Eval harness

**What to build:** An on-demand eval, separate from the build because it costs money. It runs the real OpenRouter adapter through `analyze()` against a labelled fixture set and reports:
- **Q1:** recall of High-labelled clauses (target 100%)
- **Q2:** exact deadline matches
- **Q3:** false-alarm rate per document
- **Q5:** incorporated terms found.

Any unverified flag fails the run (T1). It starts with a small seed set of fixtures until ticket 13 lands.

**Blocked by:** 02, 04

**Status:** done

- [x] One command runs the eval; it never runs as part of the normal test suite
- [x] Reads labelled fixtures in the format agreed with ticket 13
- [x] Reports Q1, Q2, Q3 and Q5 per document and in total, plus the model ID
- [x] Fails on any flag that doesn't pass the verbatim check
- [x] Seed set of 2–3 fixtures, labelled and marked as provisional
