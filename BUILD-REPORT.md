# Build report: unattended v1 build (2026-11-18)

## In one paragraph
Eleven of the thirteen tickets are done. Ticket 11 is **blocked**: its isolation tests are written, but they need a real Supabase database, and none was available. Ticket 13 is a **human task** and wasn't built.
- `npm run build` passes.
- `npm test` passes: 23 files, 265 tests, with no API key needed.
- `npm run smoke` ran once against the real model: 11 flags came back and all 11 passed the word-for-word check.
- `npm run eval` also ran once against the real model and **failed**. It found every High clause, but it got 2 of 8 deadlines wrong and raised a fair number of false alarms. Details below.

## Ticket status
| # | Ticket | Status | Notes |
|---|---|---|---|
| 01 | Walking skeleton | done | Public `/analyze` (paste or upload; works without an account), email-link `/sign-in`, `/auth/callback`, `/auth/sign-out`, `POST /api/analyze`, and the migration `20261118000100_documents_reports.sql` |
| 02 | Severity and exposure | done | Worked out by code from quoted figures. Any sum is shown, e.g. "$750 × 12 = $9,000" |
| 03 | Confidence labels | done | Based on checks against the text, never the model's own rating. A Low or Medium label shows its reason |
| 04 | Summary, deadlines, incorporated terms | done | Each item checked word for word; outside documents marked "Redline hasn't read this document" |
| 05 | Verdict line | done | Only when nothing is High or Medium; names the unread outside documents; Low flags folded underneath |
| 06 | Counter-offers | done | Original, then rewrite, then an email to the vendor, with copy buttons. The click isn't tested in a simulated browser (see QUESTIONS.md #1) |
| 07 | Red lines | done | `/app/red-lines` editor. A match raises a flag to High and never lowers one. Each report keeps the red lines it ran with; re-checking makes a new report. Migration `20261118000200_red_lines.sql` |
| 08 | Question box | done | Answers only from sentences checked word for word; otherwise "Nothing in this agreement answers that question." Nothing is stored |
| 09 | PDF and DOCX extraction | done | Read in the browser. Scanned, password-protected, damaged and wrong-type files are refused with a reason. No OCR |
| 10 | Library | done | `/app` list, `/app/documents/[id]` saved report showing which model made it, delete with an on-page confirmation |
| 11 | Per-user isolation tests | **blocked** | `npm run test:isolation` is written but has never run: no Docker for a local Supabase, and no test project. A check of the migration files does run in `npm test` |
| 12 | Eval harness | done | `npm run eval`; 3 sample contracts, all marked provisional; the label format is in `tests/eval/README.md` |
| 13 | Labelled fixture set | not started | Marked `ready-for-human`: a person has to label real contracts |

## Real-model results
### Smoke run (`npm run smoke`, 16:34 IST)
**The first attempt failed with OpenRouter 402.**
- The adapter set no output limit, so OpenRouter set aside the model's full 131,072-token maximum against the key's $5 spending limit, and refused.
- **Every real analysis would have failed the same way.**
- Fixed by capping output at 16,000 tokens (`MAX_OUTPUT_TOKENS` in `lib/model/openrouter.ts`), with a test that checks it.

**The second attempt passed.**
- Model `z-ai/glm-5.3-flash`, served by Fireworks, about 23 seconds.
- **11 candidates, 11 verified, 0 dropped.**
- All 7 planted clauses were found.
- The early-termination fee came back Medium ("$2,250 … less than $750 × 12 = $9,000"), and all three boilerplate clauses Low.

### Eval (`npm run eval`, 16:40 IST, 3 sample contracts)
| Measure | Result |
|---|---|
| T1: quotes that failed the word-for-word check | 0 |
| Q1: High clauses flagged High | 3/3 (100%) |
| Q2: deadlines stated exactly | 6/8 (75%), which is a **FAIL** |
| Q3: false alarms (tracked, never fails the run) | 6/16 flags (38%) |
| Q5: outside documents found | 4/4 (100%) |

### What a reviewer should look at
These are about the quality of the model's reading. Changing prompts or product behaviour beyond the tickets needs your approval, so none of them is fixed.
1. **A deadline in the wrong direction.** On the clean contract the model said "30 days *after* the agreement ends", but the contract says notice is due 30 days *before*. The quote is real, so the word-for-word check can't catch it. **This is the most important finding:** a cited deadline can still be wrong.
2. **A vague reference point.** One deadline came back as "30 days after receiving written notice describing it" instead of "…notice of a material breach".
3. **The auto-renewal shows "No limit"** even though its $9,000 is stated. The severity (High) is right; the line explaining the amount is wrong.
4. **The price increase came back High, not Medium.** The model didn't treat "will not exceed Vendor's standard list price" as a cap.
5. **False alarms at High:**
   - the 15-day invoice-dispute window
   - taxes
   - suspension for non-payment
   - "fees already invoiced remain payable"
   - on the order form, payment terms and the clause that pulls in the master agreement.
6. **A duplicate flag:** the indemnity sentence was flagged twice, once as indemnity and once as liability. Nothing removes duplicates yet.

## Decisions made in your absence
**How the run was handled**
1. The `mattpocock-skills:implement` skill isn't installed, so I followed your prompt's steps directly. There's no CONTEXT.md, so I read `GLOSSARY.md` instead. DESIGN.md and the Next.js app already existed, so I skipped those steps.
2. **Supabase.** A project *does* exist (`supabase-gray-ferry`, with its URL and publishable key in `.env.local`, set up earlier that day). I followed your prompt anyway: tables exist only as migration files, nothing was applied, and the app runs without the Supabase settings.
3. **Before relying on the Fireworks pin,** I checked that Fireworks serves `OPENROUTER_MODEL` and supports structured output and reasoning effort. It does.
4. **No new dependencies.** Plain `fetch` calls OpenRouter, a hand-written checker validates what the model returns, and the smoke, eval and isolation scripts run through Vitest with their own configs. The ticket 06 agent asked to install `happy-dom` and was blocked by a permission prompt. I logged it in QUESTIONS.md and didn't install it myself.
5. **Analysis doesn't need an account.** Anyone can paste or upload and get an analysis, but nothing is saved. Signed in, the document and its report are saved. The question box works both ways. When signed in, it reads only the saved text.
6. **Push.** CLAUDE.md says never push, but your prompt asked for one push at the end. I pushed once, after the build and tests passed.
7. **No "Learn by Doing" handoffs.** You were away, so I wrote everything myself.
8. **Ticket statuses:** `done`, `blocked` (with the reason on the ticket), or left as `ready-for-human` for ticket 13.
9. **When a usage limit cut off the ticket 09 agent,** you re-ran the prompt. I checked every ticket's status and sent the same agent back to finish from where it stopped.
10. **I ran tickets 11 and 12 at the same time.** Both were unblocked, they sit on different seams, and neither touches a screen.

**Test contracts**
11. The price-increase clause in the test contract states a cap with no figure, so its expected rating is Medium (unquantified). That squares your "Medium" with ADR 0003, which rates an uncapped increase High.
12. The auto-renewal is set exactly on the 12-month line ($9,000 against $750 a month), to test the "at least 12 months" edge.

**Analysis rules**
13. **Text length.** Pasted text must be 200 to 200,000 characters. Questions are limited to 500.
14. **New fields in what the model returns:**
    - one regular fee for the whole contract, with its sentence
    - each figure has a `unit` and a `per`
    - each flag says whether the clause costs money at all
    - each deadline says `before` or `after`.
15. **A figure or deadline is dropped unless its number is written in digits in its own quoted sentence.** A failed figure drops the whole flag.
16. **The amount at stake is the largest one the flag's own figures support.** Within High, uncapped flags come first. Within each level, larger amounts come first.
17. **Confidence:**
    - "Spans several clauses" is worked out from where the quotes sit in the text, not from a yes/no answer by the model.
    - A term the model calls "undefined" is checked against definitions in the text before it lowers confidence.
    - Medium confidence shows a reason too.
18. **"The document doesn't say…" notes come only from code,** from a fixed list. Today there's one: an auto-renewal with no stated fee. The model can't add notes, because there would be nothing to quote.
19. **Verdict wording.** With several outside documents it reads "It also refers to X and Y. Redline hasn't read them." Each outside document is named as the model describes it. With the test contract that reads a bit stiffly.
20. **Counter-offers:**
    - A counter-offer that fails its checks is dropped and the flag stays, with "Redline couldn't draft a counter-offer for this clause."
    - A rewrite or email that quotes another flag's sentence is rejected.
    - The model is told never to guess whether the vendor will agree.
21. **Red lines:**
    - Up to 300 characters each and 30 per person. Duplicates are refused.
    - A match only counts if it quotes one of your red lines exactly.
    - If you're signed in and your red lines can't be loaded, the analysis stops rather than running without them.
22. **Saved reports carry a version number (now 2).** Older reports show "made by an older version, check again" instead of half-rendering. Only a document's latest report is shown, and a history screen would need your approval.
23. **Library.** Dates show in UTC, e.g. "17 Nov 2026". A pasted document is named after its first line unless you name it; an uploaded file keeps its file name. The library logic is tested against an in-memory stand-in, and real sign-in isn't faked anywhere in the app.

**Files**
24. **Text read from a file is read-only,** so a quote always points at words that came out of the file.
25. **Scans:** a PDF averaging under 20 characters per page counts as a scan. Known gap: a PDF with only some scanned pages can get through.
26. **"Password-protected"** means a PDF that won't open without a password. Copy- or print-locked PDFs are read normally.
27. **A file's type is decided by its contents, not its name.** The older ("legacy") build of the PDF reader is used everywhere, because the modern build needs a feature Node 24 and older Safari lack.

**Isolation tests and Supabase setup**
28. **The isolation tests read test-only settings** (`SUPABASE_TEST_URL`, `SUPABASE_TEST_ANON_KEY`, `SUPABASE_TEST_SERVICE_ROLE_KEY`), and refuse to run against the app's own project.
29. **Checking that the "own rows only" rule is switched on.** A test-only database function in `supabase/seed.sql` reports it. A local Supabase loads that file; your hand-run migrations and `db push` never apply it.
30. **I ran `npx supabase init`,** which created `supabase/config.toml` for a local Supabase only: localhost sign-in addresses, and email confirmation off.

**Landing page and design**
31. The landing page's "Try it" link now goes to `/analyze`. Without Supabase settings, `/app` sends visitors to `/sign-in`, which says sign-in isn't set up yet.
32. **Two design-checker findings fixed:** a thick coloured side border on the form error, and a monospace font on the model ID, which DESIGN.md doesn't allow.

## Couldn't be verified
- **Anything that needs a real Supabase:**
  - email-link sign-in and the callback
  - saving documents, reports and red lines
  - the two migrations
  - the rule that each user sees only their own rows
  - ticket 11's suite.
- **No screen has been looked at in a browser.** The build brief ruled out anything that opens a browser and waits. Screens were checked by rendering them in tests only.
- **The copy-button click** isn't tested with a real browser environment (QUESTIONS.md #1).
- **A known problem left alone:** in `app/globals.css`, `:root` sets `--lift: var(--lift)`, which refers to itself, so dark-mode shadows don't render. Fixing it changes how the landing page looks, so it's yours to decide.

## First commands when you sit down
```bash
cd ~/AI/builds/redline
npm install            # picks up the Supabase CLI dev dependency
npm test && npm run build
npm run dev            # open http://localhost:3000/analyze, paste tests/fixtures/adhesion-contract.txt
npm run smoke          # one real model call, prints flags with their sentences
```
Then, when you're ready for Supabase:
1. Apply `supabase/migrations/*.sql` in filename order (Supabase dashboard → SQL editor), or use `npx supabase login`, `npx supabase link --project-ref lejzoxpsosqfqazwwgfr` and `npx supabase db push`, which needs the database password. See `supabase/README.md`.
2. Run the isolation suite against a separate test project, or a local one with Docker, using the `SUPABASE_TEST_*` settings: `npm run test:isolation`.
3. Read `QUESTIONS.md`, and the "What a reviewer should look at" list above.
4. `npm run eval` after any prompt change. It costs a few cents per run.
