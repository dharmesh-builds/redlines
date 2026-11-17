# ADR 0003: Severity is money exposure; red lines raise, never suppress; boilerplate is always shown

Status: Accepted, 2026-11-17

## Decision
- **Severity ranks by worst-case money exposure**, not by whether a clause fires automatically and not by how far it is from market norms.
  - Exposure is worked out **only from figures in the document** (fees, terms, caps, multiples). Redline never estimates a dollar amount the text doesn't support.
  - **Unbounded exposure ranks highest:** uncapped indemnity, uncapped liability on the buyer's side, unlimited price increases.
  - **Auto-renewal exposure** = the renewal commitment the document states (for example, annual fee × renewal term). When no figure is stated, it is ranked as unquantified (see Consequences).
- **Red lines raise, never suppress.** A user's red line can push a clause up to High. It cannot lower or hide a built-in flag.
- **Boilerplate is flagged at Low, always.** Arbitration, class-action waivers, and governing law and venue are flagged every time, ranked Low.

## Alternatives
- **"Fires without you acting" as the High test** (the recommended option). It matches every loss story in the research, but rejected: the user chose stakes over mechanism.
- **Off-market terms.** Needs a model of "normal", which breaks the rule to state only what the document says.
- **Red lines fully override.** A user could mute auto-renewal, the core protection.
- **Boilerplate silent unless a red line, or a summary line only.** Less noise, but the user chose completeness.

## Why
- The target user (ADR 0002) is a business deciding whether to sign. The question they act on is "how much could this cost me?"
- Red lines are the user's knowledge; built-in severity is the product's floor. Letting the user lower the floor would let them silence the flag Redline exists for.

## Consequences
- **Tension with ADR 0002.** The segment was chosen because of auto-renewal losses, but under this rule an auto-renewal with no stated fee can rank below an uncapped indemnity. A deadline flag is not guaranteed the top slot.
- **Unquantified exposure needs a rule.** When the document gives no figure, the flag says so ("the document doesn't state the renewal fee"). It ranks between bounded and unbounded. To revisit if it feels wrong in testing.
- **Severity must be explainable from the cited text.** Each flag shows the figures its ranking came from, and each figure is quoted from a source sentence.
- **Nearly every SaaS contract will produce at least one Low flag.** "No flags" will be rare. See the round-three decision on fine documents.
- **Build:** red lines are stored per user (RLS). The analysis gets them as input and may only add flags or raise severity.
