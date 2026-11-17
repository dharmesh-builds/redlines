# Redline

## Read first
- `research/summary.md`: user research. Read before deciding what the product should do.
- `PRD.md`: the brief, once it exists. Read before building.

## Settled decisions (do not reinterpret)
- Next.js, with Supabase for auth and database, deployed on Vercel.
- Uploaded files are parsed in the browser. Store only the extracted text. Never upload or store the original file.
- Every risk flag cites the exact sentence it came from. A flag whose source cannot be shown is a bug.
- All model calls go through OpenRouter, server-side only.
  - Read the model ID from the `OPENROUTER_MODEL` env var. Never hardcode a model.

## Scope: build these, then stop
1. Upload and in-browser parsing.
2. Plain-English summary.
3. Risky clauses ranked by severity, each showing its exact source sentence.
4. A drafted counter-offer for each flagged clause.
5. A question box that answers only from the document.
6. An editable list of the user's own red lines, which drives the analysis.
7. A saved library of the user's past documents.

Anything else, even the obvious next step, needs my approval first.

Excluded on purpose: payments and billing, OCR for scanned documents, and sharing a document between users.
- This version exists to prove the analysis can be trusted. None of those three makes it more trustworthy.
- OCR would undermine it: a citation is worthless if the text it points at was misread.
- A scanned or image-only file gets a clear "not supported" message. No OCR fallback.
- No sharing means every table is per-user. Turn on Supabase row-level security so a user can read only their own rows.

## Trust rules
- State only what the document says. If the text does not support a claim, the product does not make it.
- Before showing a citation, check that it appears verbatim in the stored text.
  - If it doesn't match, drop the flag rather than show it uncited.
- If the question box can't answer from the document, it says so. No general legal knowledge, no guessing.

## Secrets
- Credentials live only in `.env.local`, which is gitignored.
- Never commit a secret. A key is public the moment it is pushed and has to be rotated.
- The OpenRouter key and the Supabase service-role key must never reach the browser. Never prefix them with `NEXT_PUBLIC_`.

## Working unattended
- Ask before adding any dependency.
- When something needs my approval, don't stop the build:
  - write the question and its context to `QUESTIONS.md`
  - skip that piece and continue with other in-scope work.
- Commit locally after each working step. Never push; pushing waits for me.
- After every meaningful step, append a dense entry to `how-i-build-this.md`:
  - what I asked, what you did, the outputs, the decision and why.
  - Append only. Never rewrite past entries.

## Agent skills
- Grilling (`/grill-me`, `/grilling`): ask every question through the multiple-choice question tool. Put the recommended option first; free text only via its "Other" option.
- Issue tracker: local markdown under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`. Approval questions still go to `QUESTIONS.md`.
- Triage labels: the five default role names, recorded as a `Status:` line in each issue file. See `docs/agents/triage-labels.md`.
- Domain docs: single-context, with `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
