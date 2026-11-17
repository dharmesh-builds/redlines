# Glossary

Domain terms for Redline. Use these words exactly; avoid the synonyms listed.

## Target user
Small-business buyer reviewing a vendor, SaaS or B2B subscription agreement before signing. See ADR 0002.
_Avoid:_ "consumer", "freelancer", "client", which name segments v1 does not serve.

## Flag
One risky clause found in the document, with its severity, a plain-English explanation and its source sentence. A flag without a verified source sentence does not exist (ADR 0001).
_Avoid:_ "issue", "warning", "finding".

## Source sentence
The exact sentence(s) from the stored document text that a flag is based on, checked verbatim before display.
_Avoid:_ "citation" when meaning the explanation, "reference", "snippet".

## Deadline flag
A flag on a notice, renewal, cancellation or exercise window. The summary states the deadline itself along with its source sentence. Redline does not track or remind (ADR 0002).
_Avoid:_ "reminder", "alert", which imply tracking.

## Severity
The rank of a flag: High, Medium or Low. It is set by worst-case money exposure, computed only from figures in the document (ADR 0003).
_Avoid:_ "risk score", "priority".

## Exposure
The most the target user could lose under a clause, using only figures the document states. **Unbounded** when the document sets no cap. **Unquantified** when the document gives no figure.
_Avoid:_ "estimated cost", which implies figures the document doesn't contain.

## Red line
A term the user has said they won't accept, kept in their editable list. A red line can raise a flag's severity or add a flag; it can never lower or hide one.
_Avoid:_ "preference", "filter", "rule".

## Boilerplate flag
A Low flag on a one-sided clause that appears in almost every contract: arbitration, class-action waiver, governing law and venue. Always shown.

## Confidence
How sure Redline is about a flag's *interpretation* (what the clause does and how big the exposure is): High, Medium or Low. Separate from severity, and never about whether the source sentence exists (ADR 0004).
_Avoid:_ an unqualified "Low"; say "Low confidence" or "Low severity".

## Verdict line
The opening line of a report with no High or Medium severity flags, stating plainly that nothing found costs money beyond what was agreed. Low flags are folded beneath it (ADR 0005).

## Incorporated terms
Outside documents a contract pulls in by reference: online terms, MSA, DPA, SLA. Redline hasn't read them. They are noted in the summary with their source sentence, not flagged (ADR 0005).
_Avoid:_ "attachments", "linked docs".
