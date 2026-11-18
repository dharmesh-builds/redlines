# Build report: unattended v1 build

Started 2026-11-18. I'm keeping this file up to date as the build runs, so if it stops partway through, it still shows where things stood.

## Ticket status
(updated as each ticket finishes)

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
11. **Status lines.** A finished ticket is marked `Status: done`. A ticket that is stuck or can't be checked is marked `Status: blocked`, with the reason given here.

## Couldn't be verified (Supabase or the key missing)
(filled in as the build goes)

## First commands when you sit down
(filled in at the end)
