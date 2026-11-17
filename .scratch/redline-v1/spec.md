# Spec: Redline v1

Status: ready-for-agent

Source: `PRD.md`, ADRs `docs/adr/0001`–`0006` and `GLOSSARY.md`. Terms in **bold** are defined in the glossary and used here exactly as it defines them.

## Problem Statement

The **target user** is a small business about to sign a vendor, SaaS or B2B subscription agreement. They don't read it, or they skim it. The terms that hurt them act on a deadline or automatically: auto-renewals, notice windows, price increases and minimum commitments. People in the research found these terms only when the invoice arrived, and lost $6k–$21k a year each. Existing tools and chatbots will explain a contract, but the reader can't tell a real clause from a plausible invention. So the reader either trusts the tool blindly or ignores it.

## Solution

The user uploads the agreement. It is parsed in their browser and only the text is stored. Redline returns:
- a plain-English summary that states every deadline and lists every **incorporated term**
- **flags** ranked by **severity**, each showing its verified **source sentence**, the figures behind its **exposure**, a **confidence** label and a drafted counter-offer
- a **verdict line** when nothing is High or Medium
- a question box that answers only from the document.

The user's own **red lines** can add flags or raise severity, never lower or hide them. Past documents are kept in a per-user library.

Every claim on screen can be checked against one quoted sentence of the user's own document. Anything that fails that check is not shown.

## User Stories

**Upload and extraction**
1. As a target user, I want to upload a PDF of an agreement, so that I can have it analyzed without retyping it.
2. As a target user, I want to upload a DOCX agreement, so that contracts sent as Word files work too.
3. As a target user, I want to upload a plain-text file, so that terms I copied from a web page can be analyzed.
4. As a target user, I want my file parsed in my browser, so that the original file never leaves my machine.
5. As a target user, I want a clear "not supported" message when I upload a scanned or image-only file, so that I know why nothing was analyzed and don't get flags based on misread text.
6. As a target user, I want a clear message when a file is password-protected, corrupt or of an unsupported type, so that I know what to do next.
7. As a target user, I want to see the extracted text before analysis, so that I can confirm Redline read the right document.
8. As a target user, I want to give the document a name, so that I can find it in my library later.

**Summary**
9. As a target user, I want a plain-English summary of the agreement, so that I understand what I'm signing without reading every clause.
10. As a target user, I want every point in the summary to show the sentence it came from, so that I can check the summary against the contract.
11. As a target user, I want the summary to state every notice, renewal and cancellation deadline with its exact number of days and reference point, so that I know exactly when I must act.
12. As a target user, I want the summary to list every outside document the agreement pulls in (online terms, MSA, DPA, SLA), each with its source sentence, so that I know what Redline hasn't read.
13. As a target user, I want the summary to say plainly when the document doesn't state something important, such as the renewal fee, so that I don't assume it is covered.

**Flags**
14. As a target user, I want flags ranked by severity (High, Medium, Low), so that I read the most expensive risks first.
15. As a target user, I want each flag to show its exact source sentence or sentences, so that I can confirm the clause exists and says what the flag claims.
16. As a target user, I want a flag that spans several clauses to cite every sentence involved, so that the whole risk can be checked.
17. As a target user, I want each flag to show the figures its severity came from, quoted from the document, so that I can see why it ranks where it does.
18. As a target user, I want any calculated exposure shown as arithmetic on quoted figures ("$778 × 12"), so that I can redo the sum myself.
19. As a target user, I want a flag to say "the document doesn't state the fee" when exposure is unquantified, so that a missing number isn't hidden.
20. As a target user, I want unbounded exposure (no cap stated) ranked High, so that open-ended liability is never buried.
21. As a target user, I want an auto-renewal with a stated renewal commitment of 12 months of fees or more ranked High, so that the kind of clause that cost the research's reviewers $6k–$21k is at the top.
22. As a target user, I want boilerplate (arbitration, class-action waiver, governing law and venue) always shown at Low, so that the list is complete without leading with noise.
23. As a target user, I want each flag to carry a confidence label, so that I know when Redline's reading of a clause is uncertain.
24. As a target user, I want to see why a flag's confidence is Low (an undefined term, outside terms, or a clause spanning several sentences), so that I know what to check.
25. As a target user, I want "Low severity" and "Low confidence" to look clearly different, so that I don't confuse an uncertain reading with a cheap risk.
26. As a target user, I want flag explanations written as plain statements, without stacked hedges, so that I can act on them.
27. As a target user, I want Redline never to show a flag whose source can't be verified, so that every flag I see is real.

**Verdict line**
28. As a target user, I want the report to lead with a plain verdict when there are no High or Medium flags, so that a fine contract looks fine.
29. As a target user, I want the verdict line to name any outside documents Redline hasn't read, so that "fine" never overclaims for terms that live elsewhere.
30. As a target user, I want Low flags folded under the verdict line, so that they are available but don't lead.
31. As a target user, I want no verdict line whenever any High or Medium flag exists, so that a reassuring line never sits above a real risk.

**Counter-offers**
32. As a target user, I want a rewritten version of each flagged clause, so that I have specific wording to propose.
33. As a target user, I want a short, email-ready request to the vendor for each flag, so that I can ask for the change without drafting it myself.
34. As a target user, I want each counter-offer to quote the clause it replaces and change only that clause, so that I'm not proposing changes I didn't intend.
35. As a target user, I want to copy a counter-offer in one action, so that I can paste it into an email.

**Question box**
36. As a target user, I want to ask a question about the agreement in plain English, so that I can check something specific without reading everything.
37. As a target user, I want every answer to cite the sentence or sentences it relies on, so that I can verify it.
38. As a target user, I want Redline to say "the document doesn't say" when the answer isn't in the text, so that I never get general legal knowledge or a guess.
39. As a target user, I want questions about enforceability, legality or market norms answered with "the document doesn't say" unless the document itself addresses them, so that the tool doesn't act as a lawyer.

**Red lines**
40. As a target user, I want to keep a list of my own red lines in plain language, so that Redline checks every contract against what I won't accept.
41. As a target user, I want to add, edit and delete red lines, so that the list stays current.
42. As a target user, I want a clause that matches one of my red lines raised to High, so that my own deal-breakers are never ranked low.
43. As a target user, I want a red line to create a flag even for a clause type Redline wouldn't flag otherwise, so that my specific concerns are covered.
44. As a target user, I want a red-line flag to show which red line it matched, so that I know why it is there.
45. As a target user, I want red lines never to lower or hide a built-in flag, so that I can't accidentally silence the protection Redline exists for.
46. As a target user, I want to re-run an analysis after changing my red lines, so that an old document is checked against my current list.
47. As a target user, I want each report to show which red lines it ran with, so that I know whether it is out of date.

**Library and account**
48. As a target user, I want to sign in, so that my documents and red lines are kept between visits.
49. As a target user, I want a list of my past documents with name and date, so that I can return to an earlier analysis.
50. As a target user, I want to open a past document and see its saved report, so that I don't pay for or wait on a re-run.
51. As a target user, I want to delete a document and its reports, so that I control what is stored.
52. As a target user, I want to be certain no other user can read my documents, reports or red lines, so that confidential contracts stay mine.

**Builder / maintainer**
53. As the builder, I want every flag checked verbatim against the stored text before display, so that ADR 0001 holds by construction.
54. As the builder, I want the model to be chosen only through `OPENROUTER_MODEL`, so that switching models needs no code change.
55. As the builder, I want each saved report to record the model ID it was produced with, so that differences between runs can be explained.
56. As the builder, I want severity, confidence and the verdict line computed by deterministic code from the model's structured output, so that they are testable and stable across models.
57. As the builder, I want an eval suite that runs the real model against a labelled fixture set, so that the PRD's quality tests (Q1–Q3) can be measured.

## Implementation Decisions

**Modules**
- **Extraction (browser).**
  - Input: a user-selected file. Output: either extracted text with its source format, or "unsupported" with a reason (scanned/image-only, encrypted, corrupt, wrong type).
  - Supported: PDF with a text layer, DOCX, plain text, and pasted text (paste approved 2026-11-18 as part of feature 1; same verbatim rules, nothing but the text is stored).
  - A PDF counts as scanned/image-only when it yields almost no text relative to its page count. No OCR fallback, ever.
  - The file itself is never sent to the server or stored.
- **Analysis (server). The one deep module and the main test seam.** Two operations:
  - `analyze(documentText, redLines) → Report`
  - `ask(documentText, question) → Answer`, where Answer is either answered (text + verified source sentences) or not-in-document.
  - Inside, it calls the **model port**, verifies quotes, computes exposure, severity, confidence and the verdict line, and applies red lines. None of that is exposed.
- **Model port.**
  - One operation: send a prompt plus an expected output shape, and get back structured data.
  - The production adapter calls OpenRouter server-side only, with the model ID read from `OPENROUTER_MODEL`. If the variable is missing, it fails loudly; there is no default model.
  - Tests supply scripted adapters.
- **Persistence.** Supabase tables, all per user, with row-level security limiting every operation to `user_id = auth.uid()`:
  - documents (name, extracted text, created date)
  - reports (document, report payload, model ID, the red lines snapshot it ran with, created date)
  - red lines (text, created date).
- **API routes.** Thin, server-side:
  - analyze a stored document
  - ask a question of a stored document
  - CRUD for red lines and documents.
  - Each route reads the stored text under the signed-in user's session; the browser never sends document text to the model directly. The OpenRouter key and Supabase service-role key never reach the browser.
- **UI.** Upload, library, report view (verdict line, summary, flags, counter-offers), question box, red-line editor.

**What the model returns (the contract between model and code)**
- **Summary points,** each with source sentences.
- **Deadlines,** each with days, reference point and source sentence.
- **Incorporated-term references,** each with a description and source sentence.
- **Candidate flags.** Each carries:
  - clause type (including a boilerplate type)
  - source sentences
  - explanation
  - figures, each with its value and the source sentence it was quoted from
  - whether a cap is stated
  - the annual or periodic fee if stated
  - terms used but not defined in the document
  - whether it refers to outside terms
  - matched red line, if any
  - counter-offer: the rewritten clause plus a request to the vendor.
- **The model never returns** severity, confidence or verdict. Code computes those.

**Deterministic rules applied by code**
- **Verbatim check (ADR 0001).**
  - Each quoted sentence must appear in the stored text after normalization only: collapse whitespace, unify curly/straight quotes and dash variants, rejoin hyphenated line breaks.
  - Words are never changed.
  - A flag, summary point, deadline, reference or answer whose quote fails is dropped. A flag with any failing figure quote is dropped.
- **Exposure:**
  - unbounded, when no cap is stated on a money obligation
  - stated, when computable from quoted figures, with the arithmetic shown
  - unquantified, when no figure is given.
- **Severity (ADR 0003, 0006):**
  - **High** = unbounded, or stated exposure ≥ 12 months of the contract's fees.
  - **Medium** = unquantified, or stated exposure below that line. Within Medium, unquantified ranks first.
  - **Low** = boilerplate.
  - If the 12-month fee can't be computed from the document, a stated (bounded) exposure is Medium.
- **Red lines (ADR 0003).**
  - A model-reported red-line match sets severity to High.
  - Final severity = the higher of built-in and red-line severity.
  - A red line can add a flag but never removes one.
- **Confidence (ADR 0006):**
  - **Low** if the clause relies on an undefined term, refers to outside terms, or spans several clauses
  - **Medium** if the exposure is unquantified
  - **High** otherwise.
- **Verdict line (ADR 0005, 0006).**
  - Present only when there are no High or Medium flags.
  - When there are incorporated-term references, it names each one as unread.

**Behaviour choices**
- Editing red lines does not re-run past analyses automatically. The report shows the red lines it ran with, and the user can re-run.
- Question-box answers are not stored.

## Testing Decisions

- **What a good test is.** It drives a seam's public interface and asserts on externally visible output: the report, the answer, the extraction result, or the rows a user can read. It never asserts on internal helpers, prompt wording or intermediate structures. Refactoring the inside of Analysis must not break tests.
- **Seam 1: Analysis** (the main seam). Tests call `analyze`/`ask` with a scripted model adapter and fixed document text, covering:
  - **T1:** every flag in every report passes the verbatim check.
  - **T2:** a scripted flag quoting text not in the document is absent from the report. The same holds for a fabricated figure, deadline, summary point, reference and answer source.
  - **T3:** every exposure number traces to a quoted figure or to shown arithmetic.
  - **T4:** a scripted "not in document" outcome, and a scripted answer whose sources fail verification, both yield not-in-document.
  - **T5:** for any red-line set, adding a red line never removes a flag or lowers a severity. Test this property over several scripted outputs.
  - **Q4:** the verdict line is present iff there are no High or Medium flags, and names every incorporated-term reference.
  - **Q6:** each counter-offer quotes its clause and contains a request.
  - **Q7:** confidence labels follow the rules. The same scripted output always gives the same labels.
  - Severity edge cases: unbounded, exactly 12 months of fees, just below it, fee not stated, boilerplate.
  - Normalization edge cases: curly quotes, hyphenated line breaks, collapsed whitespace pass; a single changed word fails.
- **Seam 2: Extraction.** Fixture files go in and the result is checked:
  - a text-layer PDF, a DOCX and a TXT give text
  - an image-only PDF gives unsupported (scanned)
  - an encrypted PDF and a wrong file type give unsupported with their reasons.
- **Seam 3: Per-user isolation.** With two signed-in users against a Supabase instance, user B cannot read, update or delete user A's documents, reports or red lines.
- **Eval suite** (separate from the build, costs money, runs on demand). It uses the same `analyze` interface with the real OpenRouter adapter against the labelled fixture set and reports:
  - **Q1:** recall of High-labelled clauses (target 100%)
  - **Q2:** exact deadline matches
  - **Q3:** false-alarm rate per document, tracked over time
  - **Q5:** incorporated terms found.
  - T1 also runs here: a single unverified flag fails the eval.
- **Prior art:** none. The repo has no code yet. These tests set the pattern.

## Out of Scope

From `PRD.md` §7 and CLAUDE.md:
- payments and billing
- OCR for scanned files
- sharing between users
- deadline tracking and reminders
- analyzing an order form + MSA + DPA together
- fetching linked terms from URLs
- flags for missing clauses
- "off-market" or comparison-with-other-contracts judgments
- freelancer, tenant or employee features.

Anything beyond the seven PRD features needs approval through `QUESTIONS.md`.

## Further Notes

- **Dependencies need approval before they are added** (CLAUDE.md):
  - a PDF text-extraction library
  - a DOCX extraction library
  - a test runner
  - the Supabase CLI or local stack for Seam 3
  - any schema-validation library for the model output.
  - Next.js and Supabase themselves are settled.
  - An implementing agent writes each request to `QUESTIONS.md` and continues with work that doesn't need it.
- **The labelled fixture set doesn't exist.** It is the first piece of work for the eval suite: real or realistic SaaS agreements, each with risky clauses, severity, deadlines and incorporated terms marked by a person. Seams 1–3 don't depend on it.
- **Defaults chosen while writing this spec, not decided in grilling.** Revisit if wrong:
  - supported formats are PDF/DOCX/TXT
  - a bounded exposure with no computable 12-month fee is Medium
  - red-line edits don't auto re-run past reports
  - answers aren't stored.
- **Known tensions carried from the ADRs:**
  - an auto-renewal with no stated fee ranks Medium (ADR 0003)
  - flags leaning toward false alarms plus Low-confidence labels can turn back into a miss bias (ADR 0004).
