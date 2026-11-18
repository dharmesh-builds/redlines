# How I built Redline

A dense, chronological log of every step, decision and conversation behind Redline. Append-only and newest last. Each entry records what I asked, what was done, what came out and what was decided.

**Product hypothesis (v0):** Redline reads a contract, lease, freelance agreement or terms of service and tells the reader what they are signing:
- a plain-English summary
- risky clauses ranked by severity, each with the exact source sentence
- a drafted counteroffer for each risky clause
- a Q&A box that answers only from the document

Status: an unvalidated hypothesis.

---

## 2026-11-17 — Session 1: research before PRD

### 1. Setup
- `/effort` set to medium as the default for new sessions.
- `/voice` turned on (hold space to record).

### 2. Market research with 4 parallel agents
**What I asked for**
- Ground the idea in real pain before writing a PRD.
- Run 4 agents in parallel on Sonnet at medium effort. The main session does no research of its own.

**The four agents**
1. **Who has the pain:** real people in forums, with verbatim quotes and source URLs.
2. **What goes wrong:** clause types that burn people, ranked by frequency × severity.
3. **What exists:** competitors, with what each does, who it targets, its price and the top complaint.
4. **Who pays:** segments, willingness to pay (WTP), lawyer price anchors, and what people call "too expensive".

**Guardrails given to every agent**
- At most 12 searches and 15 page reads.
- Stop at 8 sourced findings.
- Every finding needs a URL; drop it otherwise.
- No speculation; state what couldn't be found.
- Write only `research/<name>.md`.

**Prompt design choices**
- Each agent had to include an "evidence that cuts against the hypothesis" section.
- Agent 1 had to use verbatim quotes only.
- Agent 4 had to keep *pain* separate from *WTP*.

**Outputs:** `research/who-has-the-pain.md`, `what-goes-wrong.md`, `what-exists.md`, `who-pays.md`, plus the synthesis in `research/summary.md`.

**Problems hit**
- reddit.com was blocked for all agents, so no Reddit evidence.
- Many figures came from search snippets or vendor pages; each file flags which.
- Several pages returned 403 (G2, Clio, WorldCC PDF).

**Key findings**
- **Sharpest pain:** missed auto-renewal and notice windows. Trustpilot cases (CoStar, Birdeye) ran about $6k–$21k. FTC auto-renewal complaints were about 70/day in 2024, up from 42 in 2021.
- **The pattern:** people *didn't notice* deadlines, automatic effects and conditional fees. They didn't say they *couldn't understand* the language.
- **Clause ranking:**
  1. auto-renewal
  2. freelancer nonpayment
  3. rental late fees
  4. deposits / lease-break
  5. non-compete
  6. arbitration waivers
  7. liability caps / indemnity

  No data on IP assignment, unilateral change, kill fees or escalators.
- **Competitors:**
  - Rocket Lawyer includes AI red flags in a plan from $149/yr.
  - 12+ free Product Hunt tools already flag, explain and rewrite clauses.
  - Superlegal starts at $999/mo.
  - DoNotPay is 1.7/5 on Trustpilot and got a $193k FTC order.
  - Free ChatGPT accepts uploads.
  - No pay-per-document option for individuals was found.
- **Pricing:** lawyer review costs $175–$1,500 per document. The realistic competitive range is about $3 per document to $30/mo. Zero direct WTP evidence was found.

**Verdict:** the evidence supports the pain, **not the product as specified**.
- The features are commodities.
- Much of the harm comes from enforcement and bargaining power, not comprehension.
- People rarely open contracts at all.
- Use is low-frequency.
- "AI lawyer" claims carry regulatory risk.

**Strongest signal:** small businesses missing renewal and notice deadlines in SaaS/B2B contracts, which points to deadline extraction and tracking. This was noted, not decided.

**Open gaps before the PRD**
- Reddit pain
- direct WTP evidence
- competitor depth (grounded Q&A, counteroffers)
- usage frequency

### 3. Git + GitHub
- `git init`: the folder already had an empty repo on `main`.
- Wrote a `.gitignore` covering:
  - Next.js build output and `node_modules`
  - all `.env*` files except `.env.example`
  - keys and certificates, `.npmrc`/`.netrc`, credentials and secrets files
  - local databases and `uploads/` (user contracts are sensitive)
  - logs, coverage, OS and editor files, `.claude/settings.local.json`
- Pre-commit check: listed the files and grepped for keys, tokens and email addresses. Clean. The research quotes public Trustpilot reviewers by name.
- First commit, `4837734`: `.gitignore` + the 5 research files.
- `gh repo create redline` failed because the name was taken by an older public repo (created 2026-09-10, on `master`). I left that repo untouched.
- **Decision:** use the name `redlines` instead → https://github.com/dharmeshmanglaniiitr-ship-it/redlines (public, `main`).
- No application code yet, by choice.

### 4. Build log
- Created this file, `how-i-build-this.md`, as the running memory of how Redline is built.
- `CLAUDE.md` tells every future session to keep appending here.

### 5. CLAUDE.md rewritten for unattended builds
- **What I asked for:** a CLAUDE.md of at most 60 lines, containing only what can't be read from the repo. Every line must pass the test "would leaving it out cause a mistake?"
- **Inputs I gave**
  - Settled stack: Next.js + Supabase + Vercel; files parsed in the browser with only text stored; every flag must cite its source sentence; model calls through OpenRouter.
  - Scope: 7 capabilities.
  - Excluded on purpose: payments, OCR, sharing. OCR because a misread text makes the citation worthless.
  - Rules: secrets in `.env.local`, claims only from the document, ask before adding a dependency.
- **Answers to Claude's clarifying questions**
  - When blocked: write the question to `QUESTIONS.md` and keep building.
  - Git: commit locally, never push.
  - Model: read from the `OPENROUTER_MODEL` env var, never hardcoded.
  - Keep the build-log rule.
- **Rules Claude added beyond my list**
  - Check each citation is a verbatim match in the stored text before showing it; drop the flag if not.
  - Scanned files get a "not supported" message.
  - Supabase row-level security on every table, since nothing is shared.
  - Server-only keys never get a `NEXT_PUBLIC_` prefix.
  - The question box says when the document doesn't contain the answer.
- **Output:** `CLAUDE.md` (50 lines), which replaces the earlier one-rule version.

### 6. Committed and pushed CLAUDE.md + build log
- **What I asked for:** commit and push.
- **Done:** committed `CLAUDE.md` and `how-i-build-this.md` and pushed to `origin/main` (redlines). The secret scan before committing was clean.
- **Note:** this was a push I explicitly asked for. The CLAUDE.md rule "never push" applies to unattended builds.

### 7. ADR 0001: every flag cites its source
- **What I asked for:** the first architecture decision record (ADR), at `docs/adr/0001-every-flag-cites-its-source.md`, in 4 sections and under 40 lines. No code.
- **Decision recorded:** each flag carries the exact source sentence and is checked as a verbatim match against the stored text before it is shown. A flag that can't be cited is dropped and treated as a bug.
- **Alternatives rejected:** model's own words; section references only; a paraphrase plus a link; citing only when possible.
- **Consequences worth remembering**
  - Risks that come from something *missing* from the document (e.g. no termination clause) can't be flagged without a separately designed treatment, which needs approval.
  - Analysis output must be structured, with quotes kept separate from explanations.
  - The check needs whitespace and quote-mark normalization that never changes the words.
  - Some real risks will be lost by design.
  - Tests must fail the build on any uncited flag and must include a fabrication case.

### 8. Engineering skill pack set up + harness commit
- **Plugins installed:** `mattpocock-skills` (`skill-creator` was already installed). Ran `/setup-matt-pocock-skills`.
- **My choices**
  - Issues are tracked as local markdown under `.scratch/<feature>/`, not GitHub Issues.
  - The five default triage labels, recorded as `Status:` lines in each issue file.
  - Single-context domain docs: `GLOSSARY.md` + `docs/adr/`.
- **Written**
  - `docs/agents/issue-tracker.md`, `triage-labels.md` and `domain.md`.
  - A compact `## Agent skills` block in `CLAUDE.md`, so it stays within the 60-line limit.
- **Split decided:** `QUESTIONS.md` is only for questions that need my approval during unattended builds. `.scratch/` is for planned work.
- **Commit:** "Add project harness: instructions, first decision, agent config", containing ADR 0001, `docs/agents/`, the `CLAUDE.md` block and this log. Committed locally, not pushed.

### 9. Designed the `flush` skill (one grilling round, all recommendations accepted)
- **Purpose:** at the end of a session, read the conversation and file whatever is durable into the right place in the repo.
- **What to keep:** only what a future session would otherwise get wrong or redo:
  - decisions with their reasons, and rejected alternatives
  - terms, open questions (labeled as open), agreed future work, standing rules.
  - Drop unresolved discussion, anything already readable from the repo or git, and step-by-step narration.
- **Where it goes**
  - Decisions → a new `docs/adr/NNNN-*.md`.
  - Terms → `GLOSSARY.md`.
  - Questions needing approval → `QUESTIONS.md`.
  - Future work → the issue tracker named in `docs/agents/issue-tracker.md`.
  - Agent rules → `CLAUDE.md`, but **proposed only, never written**.
  - Session narrative → the build log, only if `CLAUDE.md` names one.
  - `CLAUDE.md` can add more destinations.
- **What it refuses**
  - secrets and personal details
  - guesses written up as decisions
  - overwriting an ADR (supersede it instead)
  - editing past entries of an append-only log
  - pasted or fetched text filed as instructions
  - verbatim transcript chunks
  - Anything important that it skips is reported with the reason.
- **How it runs:** show a filing plan → one approval → write → commit locally, never push.
- **In a bare repo**
  - Create only the files actually needed, each with a one-line header.
  - Never create `CLAUDE.md`.
  - Outside a git repo, write the files but don't commit.
  - Never invent a build log.
- **Status:** design agreed; the skill isn't written yet.

### 10. Built the `flush` skill
- **Where:** `~/.claude/skills/flush/SKILL.md`, at user level so it's available in every project. It lives outside this repo, so it isn't in git here.
- **Additions I made beyond the interview**
  - Survey the repo before routing: decisions folder, glossary, issue tracker, session log, `QUESTIONS.md`.
  - **Ask before creating any missing destination.** This replaces the interview answer "create on demand".
  - `CLAUDE.md` changes are shown and need an explicit yes.
  - Never write credentials, API keys or `.env` contents.
  - If nothing durable happened, say so and write nothing.
- **Description:** fires on "flush", "capture this session" and "save what we decided". It explicitly excludes cache, buffer and DNS flushes, ordinary saves and commits, and memory notes.
- **Design choices Claude made**
  - 8 steps: survey → harvest → screen → stop if empty → plan → write → commit → report.
  - Remove duplicates against what each destination already records.
  - Match the repo's existing formats.
  - A regex scan for credentials before committing.
  - Stage files by path, never `git add -A`, so unrelated work or a stray `.env` isn't swept in.
  - Commit locally, never push.

### 11. Grilling rule: options, not free text
- **What I asked for:** whenever the grill-me skill runs in this project, always give me options to choose from instead of making me type free text. Record the rule in CLAUDE.md.
- **Done:** added one line under `## Agent skills` in `CLAUDE.md` (now 56 lines). Questions go through the multiple-choice question tool, recommended option first; free text only through "Other".

### 12. Committed and pushed
- Committed the grilling rule in `CLAUDE.md` and log entries 9–11. Pushed everything to `origin/main`, including the earlier unpushed harness commit `9842df9`.

### 13. Trigger eval of the `flush` description
- **What I asked for:** an eval of where flush triggers when it shouldn't, and where it misses when it should.
- **Method**
  - Ran skill-creator's `run_eval` from a scratchpad copy, patched for Python 3.9 and to count calls to the installed `flush` skill.
  - 20 phrases × 3 runs on `claude-opus-5-5`: 10 that should trigger and 10 near-misses.
- **Result: 18/20.**
  - **Zero false triggers.** It correctly ignored Redis, DNS and log-handler flushes, commit/push, memory notes, "write an ADR", summarize-in-chat, a log-line edit, and "what did we decide?".
  - **Misses**
    - "save what we decided about the supabase RLS setup…" fired 0/3, even though it contains the exact phrase.
    - "closing out for the night, make sure nothing we decided gets lost" (a paraphrase) fired 1/3.
- **Caveat:** each test is a fresh `claude -p` with no conversation, so "save what we decided about X" has nothing to save. Part of that miss may come from the test setup.
- **Open:** the description hasn't been changed yet.

### 14. Fixed the `flush` description and reran: 20/20
- **Change:** added to the description: `including when the phrase names a topic ("save what we decided about the auth flow")`.
- **Rerun** (same 20 phrases × 3 runs): **20/20, still zero false triggers.**
  - "save what we decided about … RLS" went from 0/3 to 3/3.
  - The "closing out for the night" paraphrase went from 1/3 to 3/3, so flush now fires more readily on paraphrases.
  - "capture this session … OCR" dropped from 3/3 to 2/3; still a pass, to watch.
- **Note:** 3 runs per phrase is a small sample, so changes of one run can be noise.

### 15. Grilled the brief: 10 questions, 3 rounds
- **What I asked for:** use grill-with-docs to make me *decide* things for the brief. Ten questions in three rounds (who it's for / what makes a clause dangerous / trade-offs and blind spots). Recommendation first; record vocabulary and ADRs as we go; stop after round three.
- **Vocabulary file:** used `GLOSSARY.md`, not `CONTEXT.md`, because the repo's domain-docs convention (`docs/agents/domain.md`) names `GLOSSARY.md`. Terms: target user, flag, source sentence, deadline flag, severity, exposure, red line, boilerplate flag, confidence, verdict line, incorporated terms.
- **Round 1 (all recommended):** SMB SaaS/B2B buyers; freelancers explicitly not served; deadlines flagged, not tracked. → ADR 0002. Pushback: "flag, don't track" would not have saved the Costar reviewer, whose loss came 11 months after signing.
- **Round 2:** severity = **biggest money exposure** (rejected my "fires without you acting"); red lines raise, never suppress (recommended); boilerplate **Low, always** (rejected "silent unless a red line"). → ADR 0003. Pushback: exposure ranking can put a no-fee-stated auto-renewal below an uncapped indemnity, which pulls against the reason the segment was chosen. Guard added: exposure only from figures in the document.
- **Round 3:** more false alarms (recommended); **confidence labels** (rejected "flat claims, named gaps"); verdict line with Lows folded (recommended); blind spot = **incorporated terms** (order form → vendor.com/terms, MSA, DPA), decided as **summary note only** (rejected "flag High"). → ADRs 0004, 0005.
- **Pushback recorded as open consequences:** (a) the false-alarm bias plus Low-confidence labels can quietly turn back into a miss bias; (b) the verdict line can say "fine" about an order form whose real terms Redline never read. Open: whether the verdict line names the unread documents.
- **Outputs:** `GLOSSARY.md`, `docs/adr/0002`–`0005`. Nothing went to `QUESTIONS.md`: nothing chosen needs a scope change.

### 16. Wrote `PRD.md` from the settled decisions
- **What I asked for:** a brief with 8 sections (who / problem / v1 list / what good looks like / my red lines / calls and costs / not building / research gaps). Every line must change what gets built or how it's judged. Quote the research; say where nothing supports a claim. No code.
- **Done:** `PRD.md`, built from ADRs 0001–0005, `GLOSSARY.md` and the research files. Real quotes: CoStar ×2 and Birdeye (Trustpilot). Paraphrases from the research are attributed and not shown as quotes.
- **"Good" is written as pass/fail tests:**
  - trust T1–T5: verbatim citation, fabrication rejected, figures traceable, refusals outside the document, red lines only add or raise
  - quality Q1–Q6: 100% of High-labelled clauses flagged, exact deadlines, false-alarm rate tracked, verdict line correct, incorporated terms found, counter-offers on target.
  - Quality tests need a **labelled fixture set that doesn't exist yet**. The brief names it as the first piece of work.
- **Red lines:** a clause table with usual severity, why it matters and the strength of evidence. Indemnity and liability rest on unverified WorldCC snippets; that is said in the table.
- **Claude's own call, flagged in the doc:** the High threshold, "≥ 12 months of the contract's fees", is marked *[Proposed; not yet decided]*. ADR 0003 set severity by exposure but gave no cut-off.
- **Calls table:** 10 rows (choice / chosen against / who is worse off). Two are still open: the confidence calibration rule, and whether the verdict line names unread incorporated documents. The research's CoStar §3 "link in the fine print" case is exactly the call-9 risk, and the brief says so.

### 17. Closed the open questions before specs
- **What I asked for:** ask me any remaining open questions, with options, before we move to specs.
- **Four questions, all answered with the recommended option:**
  - High cut-off = unbounded, or ≥ 12 months of fees
  - confidence set by checkable rules (Low: undefined term / outside terms / spans clauses; Medium: unquantified; High: otherwise), never the model's self-rating
  - the verdict line names unread incorporated documents
  - counter-offer = rewritten clause + an email-ready request to the vendor, for every flag.
- **Outputs:** `docs/adr/0006`. In `PRD.md`, the "[Proposed]" marker and both "open" notes were removed, Q4/Q6 tightened, and a new test Q7 added (labels follow the rules and stay the same across `OPENROUTER_MODEL`).
- **Why the rules:** they are deterministic and testable, and stay stable when the model env var changes. Cost: subtle ambiguity is missed.
- **Still unresolved:** nothing blocking specs. The research gaps (willingness to pay, competitor citations, whether vendors negotiate) remain as stated in PRD §8.

### 18. Wrote the v1 spec (`/to-spec`)
- **What I asked for:** read `PRD.md`, then run `/mattpocock-skills:to-spec`.
- **Seams (confirmed by me):** one main seam, an **Analysis** module (`analyze(documentText, redLines) → Report`, `ask(documentText, question) → Answer`) with the OpenRouter call behind an injected model port, plus two thin seams: browser **Extraction** (file → text or "unsupported") and **per-user isolation** (RLS).
  - Rejected: Analysis only, an HTTP-route seam, finer seams per rule.
- **Output:** `.scratch/redline-v1/spec.md`, `Status: ready-for-agent`. 57 user stories.
- **Key design decision in the spec:** the model returns only structured candidates (quotes, figures, cap stated or not, undefined terms, outside references, red-line match, counter-offer). **Severity, confidence and the verdict are computed by code,** never by the model. That is what makes T1–T5 and Q4/Q6/Q7 testable with a scripted model, and stable across `OPENROUTER_MODEL`.
- **Eval suite:** separate and on demand. It reuses `analyze` with the real adapter to measure Q1/Q2/Q3/Q5 on the labelled fixture set, which still doesn't exist.
- **Claude's own defaults, flagged in the spec:**
  - formats PDF/DOCX/TXT
  - bounded exposure with no computable 12-month fee = Medium
  - red-line edits don't auto re-run past reports
  - Q&A answers not stored.
- **Dependencies needing approval are listed, none added:** PDF and DOCX extraction, test runner, Supabase local stack, schema validation.

### 19. Broke the spec into tickets (`/to-tickets`)
- **What I asked for:** run `/mattpocock-skills:to-tickets` on `.scratch/redline-v1/spec.md`.
- **Proposed 13 tracer-bullet tickets; I approved them as is.** They are in `.scratch/redline-v1/issues/01`–`13`.
- **Order:**
  - 01 is the walking skeleton: sign in → .txt upload → `analyze` through the model port → verified flags shown and saved with the model ID, with T1/T2 tests.
  - From 01: 02 severity/exposure, 04 summary/deadlines/incorporated terms, 06 counter-offers, 08 question box, 09 PDF/DOCX extraction, 10 library.
  - Then: 03 confidence (needs 02), 05 verdict line (needs 02 + 04), 07 red lines (needs 02), 11 isolation tests (needs 07 + 10), 12 eval harness (needs 02 + 04).
  - 13, the labelled fixture set, is `ready-for-human` and has no blockers.
- **Why .txt first:** it keeps the skeleton free of any extraction library that needs approval. PDF/DOCX come in 09.
- **Gated on approval, written into the tickets:** test runner + Supabase credentials (01), PDF/DOCX libraries (09), local Supabase stack (11).
- **Frontier now:** 01 and 13.

### 20. Rule: user-facing copy goes through the humanizer
- **What I asked for:** add one rule to CLAUDE.md, in my own words, without restructuring the file. All copy a user reads (landing page, UI labels, error messages, empty states) is run through the humanizer skill before it is committed. Copy that reads as model-written is a defect, not a matter of taste.
- **Done:** a new final section, `## User-facing copy`, with the rule word for word. No other lines changed.
- **Effect on tickets:** every ticket with UI text goes through the humanizer before its commit. Examples: "not supported" messages (09), the verdict line (05), "the document doesn't say" (08), and empty library states (10).

### 21. `/impeccable init`: wrote `PRODUCT.md`
- **What I asked for:** run `/impeccable:impeccable init`.
- **Context:** no PRODUCT.md, DESIGN.md or UI code existed. Platform `web` and the stack were taken from CLAUDE.md; users, purpose, scope and terms from the PRD, ADRs and glossary. No image tool this session, so build path = code-first (nothing written to `.impeccable/config.json`). Live mode was skipped because there's no runnable app yet.
- **Three questions, all answered with the recommended option:**
  - **Positioning:** "every claim is checkable". A claim about the mechanism, not a comparison, because the research never checked competitors.
  - **Voice:** plain, flat, numbers first, never an "AI lawyer".
  - **Accessibility:** WCAG 2.2 AA; severity and confidence never conveyed by colour alone.
- **Output:** `PRODUCT.md`. No visual direction recorded (init doesn't set one); DESIGN.md is left to new-work when the first surface is built.

### 22. `/impeccable`: two surfaces designed, landing page built, DESIGN.md written
- **What I asked for:**
  - one direction round covering two surfaces, with me choosing on the page
  - **landing page:** for the PRD reader; demonstrates contract → ranked flags with exact sentences; one action; claims nothing the spec excludes; no invented prices, customers or quotes. Build it code-first, then a finish review and DESIGN.md.
  - **app shell:** surface brief only.
- **Three questions first, all answered with the recommended option:**
  - Reader follows the PRD (my "can't negotiate" wording conflicted with ADR 0002 and the counter-offers).
  - **Paste approved** as part of feature 1. Recorded in PRD.md, the spec and ticket 01.
  - **Next.js scaffolded** with next, react, react-dom and TypeScript only (+ @types). No CSS framework.
- **Direction round:** the roll (seed:b6abf84f3ea35674) assigned Green-bar Printout. One Hatch Show Print challenger was competitive; five were declined, each donating a raise. No image generation, so the cards carried HTML sketches.
- **I chose Tabbed Contract (the pick):** the contract itself is the hero, with sticky tabs at the risky sentences and tab length = severity.
- **Surface briefs:**
  - `.impeccable/surfaces/app-page-tsx.md`: landing, with the direction contract and the reviewer's ceiling notes
  - `.impeccable/surfaces/app-app-layout-tsx.md`: shell, Operate mode, regions/states/world reach. Nothing built.
- **Build:** `app/page.tsx`, `app/contract-demo.tsx` (client; tabs are aria-expanded buttons), `app/globals.css`, `app/layout.tsx` (Archivo + Source Serif 4, self-hosted via next/font).
  - The sample agreement is labelled as invented, and $640 × 12 = $7,680 is worked out on the page.
  - Captures use a Chrome DevTools-protocol script (no dependency) for true 390px emulation and opened-tab states.
- **Humanizer pass on all copy.** It also caught a trust-rule break: the Delaware note claimed "means hiring counsel there", which is general legal knowledge. Rewritten to what the clause says.
- **Finish review: fix → fix → (I funded round 3) → ship.** Fixes included:
  - two more trust-rule copy breaks ("standard clause", "Most agreements are fine")
  - eyebrow labels removed
  - translucent tab roots attached to the paper
  - steeper tab lengths, 232/164/110 (110, not 90, so "Low severity" fits; ADR 0004 bans a bare "Low")
  - the mobile first screen now shows the High flag
  - regressions fixed along the way: the $640 fee was hidden on phones; the High tab fell to 4.2:1 contrast (now full ink over the desk, ~6.2:1).
  - The ship covers the scored items only.
- **DESIGN.md + `.impeccable/design.json`** written by the documenter from the shipped build.
  - Not repaired: an unused `--desk-raised` token, hard-coded #24553a/#8a2a12/#4a4d53, `width` animation on tabs, a duplicate padding-right in the 1180px rule.
- **Open:** the CTA links to `/app`, which ticket 01 builds.

### 23. Light-mode toggle on the landing page
- **What I asked for:** a small light-mode button at the top right of the landing page.
- **Done:**
  - `app/theme-toggle.tsx`: a 36px round button with sun/moon SVG icons and an aria-label that names the action.
  - Header: the button sits after "Try it on your contract".
  - `:root[data-theme="light"]` changes only the desk tokens. Paper, tab inks, notes and highlighter don't change, so the contract looks the same in both modes.
  - The choice is saved in localStorage (try/catch), and an inline head script applies it before first paint. Dark stays the default.
- **Cleanup done along the way** (from the documenter's list):
  - removed the unused `--desk-raised`
  - tokenized the hard-coded #24553a/#8a2a12/#4a4d53/#5a5d63
  - all shadows now use `--lift`/`--lift-soft`, so they change with the theme.
- **DESIGN.md:** added a "Light mode" subsection under Colors.
- **Detector:** 8 advisories, all from before this change: font sizes not on the DESIGN.md type scale (0.875, 1.125, 1.3125, 2.125rem and the close heading). Not fixed; that is a separate decision about the type scale.

### 24. Vercel deployment diagnosis
- **What I asked for:** fix the Vercel deployment.
- **Checked:**
  - Local `npm run build` passes on Next 16.4.6 (static `/` and `/_not-found`).
  - `main` matches `origin/main` at c04361d.
  - GitHub has no Vercel deployments or commit statuses for the repo.
- **Dashboard (via Chrome):**
  - Project `redlines` is linked to `dharmeshmanglaniiitr-ship-it/redlines`, connected about 20 minutes before this check.
  - Framework preset is Next.js with default commands. It has zero deployments and shows "No Production Deployment".
  - A separate old project, `redline`, points at a different repo (`.../redline`, Sep 14). It's unrelated.
- **Cause:** Vercel deploys only on pushes made after the repo is connected. Every commit was pushed before the connection, so nothing ever triggered a build. The config and code are fine.
- **Fix:** Deployments → ⋯ → Create Deployment → `main` → Deploy to Production. I set it up, but the permission guard blocked the final click, so the user has to click it. The other route is the next push to `main`, which also needs the user's approval.

### 25. GitHub account renamed to dharmesh-builds
- **What I asked for:** I renamed my GitHub account to https://github.com/dharmesh-builds; update it everywhere.
- **It was a rename, not a new account:** the old `dharmeshmanglaniiitr-ship-it/redlines` path now redirects to `dharmesh-builds/redlines`, with the same repo and history.
- **Updated:** the local `origin` now points to `https://github.com/dharmesh-builds/redlines.git`. Fetch works.
- **Already correct:** Vercel's `redlines` project shows `dharmesh-builds/redlines`, because Vercel tracks the repo by ID.
- **Deploy (follow-up to entry 24):** the user clicked Deploy to Production. `c04361d` is Ready and serving on production.
- **Not changed, on purpose:**
  - Entries 7 and 24 still name the old account. This log is append-only, and this entry records the change.
  - The commit author email is tied to the email address, not the username, so it stays the same.
- **Left for the user:**
  - `gh auth status` still shows the old login name. The token is tied to the account ID, so it keeps working. Running `gh auth refresh` would update the name it displays.
  - The old Vercel project `redline` points at a different repo (`.../redline`). It wasn't touched.

### 26. Connecting Supabase (part 1: scaffold and integration started)
- **What I asked for:** connect Supabase if it isn't already.
- **Found:** Supabase wasn't set up at all: no `.env.local`, no packages, no CLI. The user was signed out of supabase.com.
- **Decisions (user, via question tool):**
  - **Route:** the Vercel Marketplace integration. Keys sync into the Vercel project automatically and never pass through chat or form fields.
  - **Account:** link the user's existing Supabase account, not a new account created through Vercel.
  - **Dependencies:** approved `@supabase/supabase-js` (^2.119.0) and `@supabase/ssr` (^0.12.7).
- **Integration form:** filled in for team `dharmesh9`. Access is limited to **Specific Projects → `redlines` only**, so the old `redline` project stays out. Connect Account, the Supabase sign-in and the OAuth approval are left for the user.
- **Code:**
  - `lib/supabase/env.ts` reads the URL and anon key and throws a clear error if either is missing. The service-role key is deliberately left out.
  - `lib/supabase/client.ts` is the browser client.
  - `lib/supabase/server.ts` is the server client. It's `server-only` and uses the anon key plus the session cookie, so RLS still applies on the server.
  - `proxy.ts` uses the Next 16 name for middleware. It refreshes the session cookie and uses `getUser()`, which revalidates the token, not `getSession()`. When the env vars are missing it passes requests through, so the landing page still works.
- **Open:** the user is writing `isProtectedPath` (TODO(human)). After the integration finishes: `vercel env pull .env.local`, then check that no service-role key has a `NEXT_PUBLIC_` prefix.
- **Build:** passes. The proxy shows up as `ƒ Proxy (Middleware)`.

### 27. OpenRouter credentials checked
- **What I asked for:** check the format of my `.env.local`, which holds the OpenRouter key, and gitignore it.
- **Checked (values masked, never printed):**
  - The file has 2 lines: `OPENROUTER_API_KEY` (73 chars, `sk-or-` prefix) and `OPENROUTER_MODEL=z-ai/glm-5.3-flash`.
  - No quotes, spaces, `export`, CRLF line endings or `NEXT_PUBLIC_` prefix.
  - The only defect was a missing final newline, which I fixed.
- **Verified:**
  - The model ID exists in OpenRouter's public model list.
  - The key is valid: `/api/v1/key` returns 200. It's a free-tier key with a $5 limit and $0 used.
- **Gitignore:** no change needed. The existing `.env.*` rule (`.gitignore:24`) already matches the file, and it has never been tracked or committed.
- **Gotcha recorded:** `vercel env pull .env.local` *overwrites* the file. Pull the Supabase vars into a separate file and merge them, or the OpenRouter lines are lost. The OpenRouter vars also need adding to Vercel's Environment Variables for production. The user has to paste them there.

### 25. First Vercel build triggered by a push
- **What I asked for:** take control of Chrome and fix the deployment. I approved pushing to trigger the build.
- **Done:**
  - No Chrome control was available in this session. A clean clone, `npm ci` and `next build` passed, so the code was not the problem; the cause in entry 24 (connected after every push) stood.
  - Pushed `c04361d..2412f39`. Vercel built `2412f39`: **Vercel: success**, a Production deployment.
- **The push was wider than I described when asking.** Another session had added commits in between: `bef0787` (account-rename log), `cfbe893` (Supabase clients + `proxy.ts` + 2 dependencies), `2412f39` (OpenRouter credential log).
  - Secret scan of the pushed diff was clean: no key strings, no env files tracked, no `NEXT_PUBLIC_` secret.
- **Not verified:** whether the page renders live.
  - Both the deployment URL and `redlines-dharmesh9.vercel.app` redirect to Vercel login (Deployment Protection).
  - `redlines.vercel.app` responds but isn't this page.
  - `proxy.ts` throws if `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` are missing in Vercel's environment, so check that once you're signed in.

### 28. Approved tools added; sign-in rule decided
- **What I asked for:** yes to Vitest and the PDF/Word readers. I'm not an engineer: give me pending items in plain terms, must-haves only, and use Chrome rather than the CLI for dashboard work.
- **Added:**
  - `pdfjs-dist` ^6.5.438 (Mozilla's PDF reader, runs in the browser) and `mammoth` ^1.13.0 (DOCX → plain text). These clear ticket 09's approval gate.
  - `vitest` ^5.1.1 as a dev dependency, with `npm test` / `npm run test:watch` scripts. This clears ticket 01's test-runner gate.
- **Audit:**
  - 5 "high" findings, all one advisory (GHSA-fc5q-39xc-vjpf, a ReDoS in `picomatch` ≤4.0.7) reached through vitest → vite/tinyglobby.
  - It's dev-only and never shipped. It needs attacker-controlled glob patterns, and no patched picomatch exists yet.
  - npm's suggested "fix" is a two-major downgrade to vitest 3.1.4. **Decision:** accept it for now and re-check when picomatch ships a fix.
- **Sign-in rule:** the user handed back the `TODO(human)`, so I decided it. `lib/auth/protected-paths.ts` protects `/app` and everything under it, and leaves `/`, `/sign-in` and the auth callback public.
  - It matches `/app` exactly or `/app/…`, so `/apple` isn't caught by a bare prefix match.
  - I moved it out of `proxy.ts` so it can be tested. There are 3 tests and all pass.
- **Build:** passes.
- **Waiting on the user:** reconnect the Chrome extension. Then I'll copy the Supabase vars from the Vercel dashboard into `.env.local` and confirm the OpenRouter vars are in Vercel. The user says Supabase is linked and the vars are added.

### 29. What's left before building; sign-in method decided
- **What I asked for:** anything remaining before we start building.
- **Must-haves found:**
  1. Supabase URL + anon key are missing from local `.env.local` (it only has the OpenRouter lines). Copy them by hand, because `vercel env pull` would overwrite the OpenRouter lines.
  2. The OpenRouter key and model aren't confirmed in Vercel's production env vars.
  3. Sign-in method was undecided.
- **Not blocking:** ticket 13 (labelled contracts, needed only to measure quality later); local commits not pushed.
- **Decision (via question tool):** email link, no passwords. → ADR 0007. Risk recorded: Supabase's default mailer is rate-limited, so custom SMTP is needed before real users, and that needs approval.
- **Note:** this log has two entries numbered 25 (mine, "First Vercel build triggered by a push", and a parallel session's). Left as-is because the log is append-only.
