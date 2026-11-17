# 01: Walking skeleton: one verified flag, end to end

**What to build:** A signed-in **target user** uploads a plain-text agreement. Its text is extracted in the browser and only the text is stored. The user runs an analysis and sees a list of **flags**, each with its **source sentence**. A flag whose quote doesn't appear verbatim in the stored text is never shown (ADR 0001). This sets up the Analysis module (`analyze`) behind an injected model port, the OpenRouter adapter, per-user storage and the first tests at the Analysis seam.

**Blocked by:** None (can start immediately). Needs approval first, so log it in `QUESTIONS.md` and continue with anything not gated: a test runner, plus Supabase project credentials in `.env.local`.

**Status:** ready-for-agent

- [ ] User can sign in with Supabase auth and sign out
- [ ] Uploading a .txt file extracts its text in the browser; the file itself is never sent to the server or stored
- [ ] Pasting text is accepted as an alternative to upload (approved 2026-11-18); empty or very short pastes get a clear message
- [ ] Documents and reports tables exist with row-level security limiting every operation to the owner
- [ ] `analyze(documentText, redLines)` calls the model through a port; the production adapter calls OpenRouter server-side, reads the model from `OPENROUTER_MODEL`, and fails loudly if it is unset
- [ ] The model returns structured candidate flags (clause type, source sentences, explanation); code, not the model, decides what is shown
- [ ] Verbatim check with normalization only (whitespace, curly/straight quotes, dash variants, hyphenated line breaks); a single changed word fails
- [ ] Report is saved with the model ID that produced it, and rendered with each flag's source sentence
- [ ] T1: with a scripted model, every flag in the report passes the verbatim check
- [ ] T2: a scripted flag quoting text not in the document is absent from the report
- [ ] The OpenRouter key and Supabase service-role key never reach the browser and are never prefixed `NEXT_PUBLIC_`
