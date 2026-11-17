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
