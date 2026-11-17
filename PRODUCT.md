# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
Next.js, Supabase (auth and database, row-level security on every table), Vercel. All model calls go through OpenRouter, server-side only; the model ID comes from `OPENROUTER_MODEL`. Settled in CLAUDE.md.

## Users
A small business about to sign a vendor, SaaS or B2B subscription agreement. The person reading has no lawyer reviewing it before signing. The losses in the research were $6k–$21k a year each, from auto-renewals and missed notice windows (`research/summary.md`, ADR 0002).

Their job: before signing, find out what the contract will cost them and when they have to act. Today they mostly don't open the contract, find the term on the invoice, and pay a lawyer after the fact.

Not served in v1: freelancers, tenants, employees (ADR 0002).

## Product Purpose
The user uploads an agreement. Redline returns:
- a plain-English summary with every deadline stated
- flags ranked by money exposure, each with its exact source sentence, a confidence label and a drafted counter-offer
- a verdict line when nothing costs money beyond what was agreed
- a question box that answers only from the document.

Success means the user can trust every line without trusting the model. Each claim is checkable against one sentence of their own contract. Full brief: `PRD.md`.

## Positioning
Every claim is checkable. Every flag, figure and answer points to a sentence in the user's own document, checked word for word. If Redline can't show it, it doesn't say it (ADR 0001).

This is a claim about the mechanism, not a comparison. The research never checked whether competitors already cite source sentences, so no surface may claim Redline is the only one or better than a named tool.

## Operating Context
- **When it's used:** before signing, usually once per agreement. Frequency is unmeasured (`PRD.md` §8).
- **Input:** a contract file (PDF with a text layer, DOCX or TXT), parsed in the browser. Only the extracted text is stored, never the file. A scanned or image-only file gets "not supported", with no OCR.
- **What the user does after reading the report:** copies a counter-offer into an email to the vendor, or signs.
- **The library:** past documents and their reports are kept per user. Nothing is shared between users.

## Capabilities and Constraints
- **Scope:** the seven v1 features in CLAUDE.md, and nothing else without approval.
- **Excluded:** payments, OCR, sharing, deadline reminders, analyzing several documents together, fetching linked terms, and flags for missing clauses.
- **Terminology** is defined in `GLOSSARY.md`: flag, source sentence, severity, exposure, confidence, red line, verdict line, incorporated terms, boilerplate flag, deadline flag. Use those words exactly in UI copy.
- **Severity and confidence are separate axes.** The UI never shows a bare "Low"; it always says "Low severity" or "Low confidence" (ADR 0004).
- **The verdict line names any outside documents Redline hasn't read** (ADR 0006). Copy may change its wording, never its claim.
- **No legal advice.** Redline states only what the document says. Questions it can't answer from the document get "the document doesn't say".

## Brand Commitments
- **Name:** Redline.
- **Voice: plain, flat, numbers first.** Write like a careful colleague who read the contract:
  - short declarative sentences, with the figure and the date up front
  - no legal jargon, no alarm words, and no reassurance the document can't back
  - no stacked hedges; the confidence label carries the uncertainty.
- **Never frame Redline as a lawyer or "AI lawyer".** The FTC acted against DoNotPay over that claim (research §5.6).
- **All user-facing copy goes through the humanizer skill before it is committed** (CLAUDE.md). Copy that reads as model-written is a defect.

## Evidence on Hand
- **Research:** `research/` (four reports plus the summary). Real quotes from Trustpilot reviewers (CoStar, Birdeye) and Hacker News, with URLs.
- **Absent, and must not be invented:** customers, testimonials, usage numbers, accuracy benchmarks, pricing and willingness-to-pay data, comparisons with competitors. The labelled fixture set for measuring accuracy doesn't exist yet (ticket 13).

## Product Principles
1. **Checkable over fluent.** A claim the user can't verify against their own document isn't shown.
2. **Money and dates first.** Lead with what it costs and when to act; explanation comes second.
3. **A fine contract looks fine.** Don't manufacture alarm; the verdict line leads when nothing is High or Medium.
4. **Say what Redline hasn't read.** Unread incorporated terms, missing figures and undefined terms are named, never glossed over.
5. **The user decides.** Redline drafts the counter-offer and request, and the user chooses whether to send it.

## Accessibility & Inclusion
**WCAG 2.2 AA.** Severity and confidence are never conveyed by colour alone, since High/Medium/Low is the core of the report. Every source sentence, flag and counter-offer is reachable and copyable by keyboard and screen reader.
