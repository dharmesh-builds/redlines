# 04: Summary, deadlines and incorporated terms

**What to build:** The report opens with a plain-English summary. Every point cites its **source sentence**. Every notice, renewal and cancellation deadline is stated with its exact number of days and its reference point (a **deadline flag**'s deadline). Every **incorporated term** (online terms, MSA, DPA, SLA) is listed with its source sentence and marked as not read by Redline (ADR 0005). Each item passes the same verbatim check as flags.

**Blocked by:** 01

**Status:** done

- [x] Summary points, deadlines and incorporated-term references come from the model as structured items with source sentences
- [x] Any item whose quote fails verification is dropped
- [x] Deadlines show days + reference point ("90 days before the renewal date")
- [x] Incorporated terms are a summary note, not a flag, and don't affect severity
- [x] The summary says plainly when the document doesn't state something it would need to (e.g. renewal fee)
- [x] Tests at the Analysis seam: fabricated summary point, deadline and reference are each dropped
