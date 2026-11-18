# Supabase

Redline stores three per-user tables: `documents`, `reports` and `red_lines`. Every one has row-level security (RLS) on, with owner-only policies, so a user can read and change only their own rows.

## Files

| Path | What it is |
| --- | --- |
| `migrations/20261118000100_documents_reports.sql` | `documents` and `reports` tables, RLS, policies |
| `migrations/20261118000200_red_lines.sql` | `red_lines` table, RLS, policies |
| `seed.sql` | **Test-only.** A read-only function the isolation suite uses to check RLS flags. Never apply it to production. |
| `config.toml` | Settings for the local stack (`npx supabase start`). Not used by a hosted project. |

## Applying the migrations by hand

Run them in filename order. Each one runs once.

**Option A, dashboard.** Open the project, go to SQL Editor, paste the contents of `migrations/20261118000100_documents_reports.sql` and run it. Then do the same with `migrations/20261118000200_red_lines.sql`. Don't paste `seed.sql`.

**Option B, CLI.**

```sh
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

`db push` applies only `migrations/`. It skips `seed.sql` unless you pass `--include-seed`, so don't.

Then, in Authentication > URL Configuration, set the Site URL to the app's address and add `<app address>/auth/callback` to the redirect URLs (sign-in uses email magic links).

## Running the isolation suite

`npm run test:isolation` signs in two real users, A and B, against a real Supabase instance. A creates a document, a report and a red line. The suite checks that B can't select, update, delete or plant rows in A's data, that A's rows are unchanged afterwards, and that RLS is switched on for all three tables. Nothing is mocked. It's separate from `npm test`, which runs without Supabase.

It reads three variables, from the shell or `.env.local`:

| Variable | Value |
| --- | --- |
| `SUPABASE_TEST_URL` | API URL of the test instance |
| `SUPABASE_TEST_ANON_KEY` | its anon (publishable) key |
| `SUPABASE_TEST_SERVICE_ROLE_KEY` | its service-role (secret) key. Only the test process reads it, to create and delete the two test users and read the RLS flags |

Never prefix these with `NEXT_PUBLIC_`. If any is missing, the command stops with an error that names it. It does not pass or skip.

### Locally, with Docker

1. Install and start Docker Desktop.
2. From the repo root:

   ```sh
   npx supabase start
   ```

   This starts the local stack, applies `migrations/` and then `seed.sql`. It prints an API URL (`http://127.0.0.1:54321`), an anon key and a service_role key. `npx supabase status` prints them again.
3. Put them in `.env.local`:

   ```sh
   SUPABASE_TEST_URL=http://127.0.0.1:54321
   SUPABASE_TEST_ANON_KEY=<anon key>
   SUPABASE_TEST_SERVICE_ROLE_KEY=<service_role key>
   ```

4. Run `npm run test:isolation`.
5. `npx supabase stop` when done. After changing a migration, `npx supabase db reset` rebuilds the local database from `migrations/` and `seed.sql`.

### Against a dedicated test project

Use a separate, throwaway project, never the production one. The suite creates and deletes users, and it refuses to run if `SUPABASE_TEST_URL` matches `NEXT_PUBLIC_SUPABASE_URL` (unless both are the local stack). Run both migrations and then `seed.sql` in that project's SQL editor, set the three variables, then run `npm run test:isolation`.

## The static check in `npm test`

`tests/migrations/rls-static.test.ts` reads the SQL files and fails if a public table has no `enable row level security`, or if `documents`, `reports` or `red_lines` lacks a select, insert, update or delete policy that checks `auth.uid()`. It only reads text. It catches a migration that forgets RLS, but it can't prove isolation. Only the real-instance suite does that.
