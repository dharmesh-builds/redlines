# ADR 0008: Checking an agreement needs an account

Status: Accepted, 2026-11-18. Replaces the earlier rule that `/analyze` checks agreements without an account.

## Decision
Only a signed-in reader can run a check. `POST /api/analyze` and `POST /api/ask` refuse a signed-out request with 401, before any model call.

`/analyze` stays open, so anyone can paste or pick a file. When a signed-out reader presses Check:
- the extracted text (never the file) is kept in this browser's `localStorage` (`lib/pending-check.ts`) for one hour, the life of a Supabase sign-in link
- the email sign-in form appears under the agreement, and the text stays on screen
- when the link brings them back signed in, `/analyze` takes the text once, deletes it, and runs the check

## Why
The owner asked for analysis to be signed-in only (2026-11-18). Every check now lands in the reader's library under their red lines. A reader who pasted a long agreement doesn't lose it to the sign-in step.

## Alternatives
- **Lock `/analyze` behind sign-in in the proxy.** Simpler, but the reader can't paste first, and the request was to keep their content.
- **`sessionStorage`.** It's scoped to one tab, and the email link usually opens a new one, so the text would be lost.
- **Store the pending text in Supabase.** The reader has no account yet, so there's no owner to put it under for row-level security.

## Consequences
- The text sits unencrypted in the browser for up to an hour, on that device only. It's deleted when it's used, when it expires, or as soon as the reader changes the text, so an older copy can't replace what's on screen.
- A link opened in a different browser or on another device signs the reader in, but the text isn't there. The prompt says to open the link in the same browser.
- Without Supabase configured (local work only, where nobody can sign in), checks still run without an account and nothing is stored.
