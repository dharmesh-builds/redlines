# ADR 0004: Lean toward false alarms; every flag carries a confidence label

Status: Accepted, 2026-11-17

## Decision
- **When unsure whether to flag, flag.** Redline chooses more false alarms over more misses.
- **Each flag carries a confidence label:** High, Medium or Low. The label is about the *interpretation*: what the clause does and how big the exposure is. It is never about whether the text exists; ADR 0001 already guarantees that.

## Alternatives
- **Lean toward misses.** Every flag would be worth reading, but it stacks on top of the recall ADR 0001 already gives up.
- **Split thresholds by severity.** Two thresholds to tune and explain.
- **Flat claims with named gaps, hedge words banned** (the recommended option). Rejected in favour of explicit labels.
- **Always confident / hedge when unsure.** Wrong when wrong, or useless.

## Why
- A miss costs the target user $6k–$21k (research §1). A false alarm costs a minute reading one cited sentence. The source sentence is what makes false alarms cheap to dismiss.
- Labels say how sure Redline is about the interpretation without softening every sentence.

## Consequences
- **The two choices interact.** Leaning toward flagging adds mostly uncertain flags, so many will be labelled Low confidence. If users learn "Low confidence = ignore", the false-alarm bias quietly turns back into a miss bias. Watch for this in testing.
- **Confidence and severity are separate axes** and must look different in the UI. "Low" alone is ambiguous: say "Low severity" or "Low confidence".
- **Model self-reported confidence is poorly calibrated.** Ground the label in something checkable where possible, for example: Low when the clause relies on a term the document doesn't define. Exact rules are open.
- **Copy:** the label carries the uncertainty, so flag text stays declarative. No stacked hedges on top of a label.
