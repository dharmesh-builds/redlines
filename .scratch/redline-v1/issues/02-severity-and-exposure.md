# 02: Severity and exposure

**What to build:** Each **flag** shows its **exposure**: the figures it is based on, each quoted from the document, with any arithmetic shown. Flags are ranked by **severity**:
- **High:** unbounded, or a stated exposure of at least 12 months of the contract's fees
- **Medium:** unquantified exposure (unquantified ranks first), or a stated exposure below the High line
- **Low:** **boilerplate flags**, always.

Severity is computed by code from the model's structured output, never chosen by the model (ADR 0003, ADR 0006).

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Model output carries figures (value + source sentence), whether a cap is stated, the periodic fee if stated, and a boilerplate clause type
- [ ] A flag with any figure whose quote fails verification is dropped
- [ ] Exposure is classed unbounded / stated (with arithmetic on quoted figures, e.g. "$778 × 12") / unquantified ("the document doesn't state the fee")
- [ ] When the 12-month fee can't be computed from the document, a bounded stated exposure is Medium
- [ ] Arbitration, class-action waiver, governing law and venue are always shown at Low
- [ ] UI ranks flags High → Medium (unquantified first) → Low and shows each flag's figures
- [ ] T3: every exposure number traces to a quoted figure or shown arithmetic
- [ ] Edge-case tests: unbounded; exactly 12 months of fees; just below; fee not stated; boilerplate
