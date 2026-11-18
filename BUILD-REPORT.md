# Build report: unattended v1 build

Started 2026-11-18. I'm keeping this file up to date as the build runs, so if it stops partway through, it still shows where things stood.

## Ticket status
- **01 Walking skeleton: done.** 42 tests pass, and the typecheck and build are clean.
  - Public `/analyze` lets anyone paste text or pick a .txt file, without signing in. When you're signed in, the document and report are saved.
  - Other pages and routes: `/sign-in` (email link), `/auth/callback`, `/auth/sign-out`, and the `POST /api/analyze` route.
  - The migration is `supabase/migrations/20261118000100_documents_reports.sql`.
  - Sign-in and the database rules are built but couldn't be tried out: no Supabase was available.
- **02 Severity and exposure: done.** 65 tests pass.
  - Severity, exposure and ranking are all worked out by code from quoted figures.
  - Whenever an amount is calculated, the sum is shown, e.g. "$750 × 12 = $9,000".
- **03 Confidence labels: done.** 93 tests pass. Confidence comes from checks against the document's text, never from the model's own rating. A Low or Medium label shows its reason.
- **04 Summary, deadlines and incorporated terms: done.** 111 tests pass.
  - The report opens with a summary, then deadlines, then the outside documents the contract refers to. Each of those is marked "Redline hasn't read this document".
  - Every item is checked word for word against the contract, the same way flags are.
- **05 Verdict line: done.** 123 tests pass.
  - When nothing is High or Medium, the report opens with "Nothing in this document costs you money beyond what you agreed to."
  - It names each outside document as unread, and the Low flags sit in a fold underneath.
- **06 Counter-offers: done.** 145 tests pass.
  - Each flag shows the original sentences, the proposed rewrite, and a short email to the vendor. Both the rewrite and the email have a Copy button.
  - Gap: the copy click isn't tested in a simulated browser, because the testing library needed for that wasn't approved. See QUESTIONS.md #1.
- **10 Library: done.** 168 tests pass.
  - `/app` lists your saved documents, newest first.
  - `/app/documents/[id]` shows the latest saved report and which model made it, without running the analysis again. Deleting asks you to confirm on the page itself.
  - The API is `GET /api/documents`, plus `GET` and `DELETE /api/documents/[id]`.
  - Tested against an in-memory stand-in for the database, never a real Supabase.
- **07 Red lines: done.** 203 tests pass.
  - `/app/red-lines` lets you add, edit and delete your own red lines.
  - A clause that matches one is raised to High and shows which red line it matched.
  - Each report keeps a copy of the red lines it was checked against. "Check again" makes a new report and keeps the old one.
  - The migration is `20261118000200_red_lines.sql`.
  - T5 is tested: adding a red line never removes a flag or lowers a severity.

## Decisions made in your absence
1. **The `mattpocock-skills:implement` skill isn't installed in this environment.** I followed the steps in your prompt directly.
2. **CONTEXT.md doesn't exist.** `GLOSSARY.md` holds the domain vocabulary, so I read that instead.
3. **DESIGN.md and the Next.js app already existed,** so I skipped the "write DESIGN.md" and "create the app" steps.
4. **Supabase.** A Supabase project *does* exist (`supabase-gray-ferry`, set up earlier on 2026-11-18, with the URL and publishable key in `.env.local`). I followed your prompt anyway: every table is written as a migration file under `supabase/migrations/` and none is applied. The app is built to run without the Supabase variables.
5. **Provider pin.** Before using it, I checked that Fireworks actually serves the model in `OPENROUTER_MODEL`. It does, and it supports `response_format`, `structured_outputs` and `reasoning_effort`, so `allow_fallbacks: false` won't make every call fail.
6. **No new dependencies for the model call or the model-output check.** The model call uses plain `fetch` (no OpenAI SDK). The model output is checked by a small hand-written validator instead of a schema library. Both avoid the approval gate in CLAUDE.md.
7. **Sign-in versus pasted documents.** Ticket 01 says a *signed-in* user uploads. Your prompt says pasting and analysing must work without Supabase. So both work:
   - Anyone can paste or upload and get an analysis, but nothing is stored.
   - When you're signed in, the document and report are saved.
8. **Push.** CLAUDE.md says never push. Your prompt (step 9) explicitly asks for one push at the end, so I treated that as your approval. I'll push only once the build and tests pass.
9. **Ticket 13 (labelled fixture set) is marked `ready-for-human`,** because it needs a person to label real contracts. I didn't build it. Ticket 12's seed fixtures stand in for it, marked provisional.
10. **No "Learn by Doing" handoffs.** The session's learning mode normally hands small pieces of code to you. You're away, so I wrote everything.
12. **The price-increase fixture is Medium, not High.** ADR 0003 calls an uncapped increase High, and the prompt asked for one Medium (unquantified) clause. So the fixture's renewal increase states a cap with no figure ("not exceed Vendor's standard list price"). That makes it unquantified, and therefore Medium.
13. **Auto-renewal fixture sits on the line.** Its renewal fee is exactly 12 months of fees ($9,000 against $750/month), which tests the "at least 12 months" edge.
14. **Shortest paste accepted: 200 characters (about 2–3 sentences); longest: 200,000.** Chosen by the ticket 01 agent.
15. **The landing page's "Try it" link now goes to `/analyze`.** `/app` needs an account, and pasting must not.
16. **Without Supabase, the proxy now sends `/app/*` to `/sign-in`.** Before, those pages loaded with no protection at all.
17. **The smoke script runs through Vitest with its own config** (`vitest.smoke.config.mts`), so it needed no new dependency, and `npm test` doesn't pick it up.
18. **New fields in what the model returns (ticket 02).**
    - The periodic fee is stated once for the whole contract, not once per flag.
    - Each figure carries a `unit` and a `per` (e.g. dollars per month).
    - Each flag says whether the clause costs money at all. Without that, a no-money clause with no cap would rank High.
19. **A quoted amount must actually appear in its sentence.** A figure whose number isn't written in digits in its verified sentence drops the whole flag, the same as a misquote.
20. **The amount at stake is the largest one the flag's own figures support.** Within High, uncapped flags come first. Within each level, larger amounts come first.
21. **Removed a thick coloured side border from the form error message** (`.form-error` in `app/globals.css`). The design checker flagged it as a known tell of AI-made screens, and DESIGN.md doesn't call for it.
22. **Whether a clause "spans several clauses" is worked out by code, not taken from the model.** Code checks where the quoted sentences sit in the stored text: quotes from two different numbered clauses count as spanning. A yes/no from the model would have been one more claim nobody can check.
23. **A term the model calls "undefined" is checked against the document first.** If the document defines it ("X" means…, (the "X"), or an order-form line starting with it), the flag doesn't lose confidence.
24. **Medium confidence also shows a reason.** DESIGN.md asks for a reason whenever confidence isn't High.
25. **Deadlines always read "N days before" or "N days after" something.** The model gives "before" or "after" plus a short reference point, rather than free text that couldn't be relied on to read that way.
26. **A deadline is kept only if its number is written in digits next to "day(s)" in the quoted sentence.** "Sixty (60) days" and "30-day" count. A number written only in words is dropped.
27. **"The document doesn't say…" notes come from code, from a fixed list.** The model can't add one, because there would be nothing to quote. Today there is one such note: an auto-renewal with no stated regular fee.
28. **Verdict wording for several outside documents.** With more than one, it reads "It also refers to X and Y. Redline hasn't read them." A "which" after a list could be read as covering only the last item.
29. **Outside documents are named the way the model describes them.** Only the sentence behind each one is checked. With the test fixture this reads a little stiffly ("refers to Acceptable Use Policy at https://…"). Worth checking with real output.
30. **A counter-offer that fails its checks drops the counter-offer, not the flag.** The flag shows "Redline couldn't draft a counter-offer for this clause." ADR 0001 drops a flag only when its citation fails, and a verified risk shouldn't vanish because the drafting went wrong.
31. **"Changes only that clause" is checked mechanically.** A rewrite or request that contains another flag's verified sentence word for word is rejected. A request must contain a real ask: a question, "please", "could/would/can you", and the like.
32. **The model is told never to guess whether the vendor will agree.** A test checks the prompt for this.
33. **Reports saved by an earlier version get a plain note instead of a partial display:** "made by an older version… check the agreement again". A half-shown report could quietly leave out checks the reader expects. The version number is stored inside the saved report, so no extra migration is needed.
34. **The library reads the database through a small interface,** so its logic can be tested against an in-memory version. Real sign-in isn't faked anywhere in the app itself.
35. **Dates show in UTC, British style ("17 Nov 2026").** A pasted document is named after its first line unless you give it a name. An uploaded file keeps its file name.
36. **Red-line limits:** up to 300 characters each and 30 per person. Duplicates are refused, ignoring case and extra spaces, and the database enforces this too.
37. **A red-line match must quote one of your red lines exactly** (ignoring case and spaces). The model can't make up a red line. If you're signed in and your red lines can't be loaded, the analysis stops with an error rather than quietly running without them.
38. **Reports are now version 2.** Reports saved before red lines existed show the "older version" note, with a button to check the agreement again.
39. **Only a document's latest report is shown.** Earlier ones stay in the database, but no screen lists them. A history view would be new scope, so it needs your approval.
40. **Fonts.** The model ID was shown in a monospace system font, which DESIGN.md doesn't allow. The design checker caught it, and I switched it to the interface font.
11. **Status lines.** A finished ticket is marked `Status: done`. A ticket that is stuck or can't be checked is marked `Status: blocked`, with the reason given here.

## Couldn't be verified (Supabase or the key missing)
- **Sign-in by email link, the auth callback, and saving documents and reports (ticket 01).** All of this is written against the real Supabase client, but none of it ran against a real project. The migration wasn't applied.
- **Known issue the ticket 01 agent found and left alone:** in `app/globals.css`, `:root` sets `--lift: var(--lift)`, which refers to itself, so dark-mode shadows don't render. Fixing it changes how the landing page looks, so it's yours to decide.

## First commands when you sit down
(filled in at the end)
