# Redline

Production: https://redlines-seven.vercel.app

Redline reads an agreement you upload and shows what it says, which clauses are risky, and where each one comes from in the text. The brief is in `PRD.md`.

## Production settings

The live app needs these four settings. Each is set on Vercel (project `redlines`, Production) and in `.env.local` for local work. Values are never committed.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`
