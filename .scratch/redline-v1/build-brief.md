# Build brief: rules every implementing agent follows

You are one agent in an unattended build. The owner is away and nobody can answer questions. When you would ask, choose the option that best fits the docs below, and state that choice and its reason in your final reply.

## Read first
- `CLAUDE.md`: project rules. Its "ask before adding a dependency" rule is replaced, for this run, by the section "Dependencies" below.
- `PRD.md`, `GLOSSARY.md` (the domain vocabulary; there is no CONTEXT.md), every file in `docs/adr/`
- `.scratch/redline-v1/spec.md`: especially "Implementation Decisions" and "Testing Decisions"
- For any screen: `DESIGN.md`, `PRODUCT.md`, and `.impeccable/surfaces/app-app-layout-tsx.md` (the app shell brief). The landing page brief is `.impeccable/surfaces/app-page-tsx.md`.

## The two settled answers
1. **Model.** Whatever `OPENROUTER_MODEL` says, called through OpenRouter's OpenAI-compatible endpoint (`https://openrouter.ai/api/v1/chat/completions`) with `OPENROUTER_API_KEY`, server-side only. Every request includes:
   - `provider: { order: ["fireworks"], allow_fallbacks: false, require_parameters: true }`
   - `reasoning: { effort: "low" }`
   - structured JSON output (`response_format: { type: "json_schema", json_schema: { name, strict: true, schema } }`) for every analysis and answer call.

   Never write a model ID into code. If `OPENROUTER_MODEL` or the key is unset, the production adapter throws a clear error. Use plain `fetch`, with no OpenAI SDK. Fireworks serves the configured model and supports `response_format`, `structured_outputs` and `reasoning_effort` (checked 2026-11-18).
2. **Supabase.** Treat it as not provisioned. Build sign-in (email magic link, ADR 0007), the library and red lines against the Supabase client, reading `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - Write every table and RLS policy as SQL migration files under `supabase/migrations/` (timestamped names, e.g. `20261118000100_documents_reports.sql`). The owner runs them by hand. Never run anything against a remote database.
   - The app must start, and must analyse a pasted document, with those two variables absent. Only the library and red lines need an account. When Supabase isn't configured, account features show a plain "sign-in isn't available" state instead of crashing.
   - Do not mock auth in the product.

## Rules: what does NOT count as done
A ticket that contains any of these is still open:
- a function that returns a fixed value
- a TODO, or a "not implemented" error
- a test that only checks that a file exists or a function is defined
- a test that mocks the thing it is meant to test.

Tests drive a seam's public interface (`analyze`, `ask`, the extraction function, route handlers) and assert on visible output. The model is the only thing stubbed: tests use a scripted model adapter that returns payloads built from `tests/fixtures/*.json` sidecars, so the suite runs without a key.

## Screens and copy
- Every screen obeys `DESIGN.md`, `PRODUCT.md` and the app shell brief. Reuse the existing tokens in `app/globals.css`, and don't invent a new visual direction.
- Do NOT run an impeccable direction round, or anything that opens a browser and waits for a person.
- All copy a reader sees (labels, errors, empty states, verdict text) goes through the `humanizer:humanizer` skill before you finish. Invoke it via the Skill tool on your copy strings.

## Fixtures
- `tests/fixtures/` holds an adhesion contract with planted clauses plus a sidecar JSON (exact sentences and expected severity bands), and a clean document with none.
- Every test that needs a document uses these. Don't invent new contract text in tests unless the case can't be built from the fixtures (e.g. a deliberately changed word), and then derive it from fixture text.

## Dependencies
- Prefer none. The libraries already installed are Next 16, React 19, `@supabase/ssr`, `@supabase/supabase-js`, `pdfjs-dist`, `mammoth`, Vitest and the Supabase CLI.
- No schema-validation library: write a small hand-rolled validator for model output.
- If something is truly needed, you may add it, but name it and justify it in your final reply.

## Secrets
- Never print or commit `.env.local` values. Never prefix the OpenRouter key or a service-role key with `NEXT_PUBLIC_`.
- Server-only modules import `server-only`.

## Commands
- Typecheck: `npx tsc --noEmit`
- Tests: `npm test` (Vitest). Run a single file with `npx vitest run <path>`.
- Build: `npm run build`

## Don'ts
- Don't commit, push, or edit `how-i-build-this.md`, `BUILD-REPORT.md` or ticket files. The orchestrator does that.
- Don't touch other tickets' scope.

## Final reply (keep it short, under 300 words)
- the files you changed, as a list
- the test names you added
- the output of the typecheck and the full test run (pass/fail counts)
- any decision you made in the owner's absence, with its reason
- anything you could not verify.
