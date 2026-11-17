# 03: Confidence labels

**What to build:** Every **flag** carries a **confidence** label, set by checkable rules (ADR 0006), never by the model's own rating:
- **Low** if the clause depends on an undefined term, refers to outside terms, or spans several clauses
- **Medium** if the exposure is unquantified
- **High** otherwise.

The flag shows the reason for a Low label. Confidence looks clearly different from severity, and an unqualified "Low" never appears.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] Model output carries the undefined terms a clause uses, whether it refers to outside terms, and whether it spans several clauses
- [ ] Labels follow the rules exactly; the reason is shown for Low
- [ ] UI always says "Low confidence" / "Low severity", never a bare "Low"
- [ ] Flag explanations stay declarative; no stacked hedge words on top of a label
- [ ] Q7: the same scripted model output always yields the same labels
