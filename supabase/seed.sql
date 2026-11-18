-- TEST-ONLY. Never apply this file to the production database.
--
-- Used by the per-user isolation suite (`npm run test:isolation`) so it can
-- fail when row-level security is switched off on any per-user table. That
-- check needs `pg_class.relrowsecurity`, which the REST API can't reach, and
-- the project has no Postgres client library. A tiny read-only function is
-- the least invasive path: it changes no data, reads only catalog flags, and
-- only the service role may call it.
--
-- Why a seed and not a migration: `supabase start` and `supabase db reset`
-- load this file on the LOCAL stack only. `supabase db push` never applies it,
-- and the owner's hand-run migrations don't include it. On a dedicated test
-- project, paste it into the SQL editor after the migrations.

create or replace function public.test_only_rls_status()
returns table (table_name text, rls_enabled boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select c.relname::text, c.relrowsecurity
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p')
    and c.relname in ('documents', 'reports', 'red_lines');
$$;

revoke all on function public.test_only_rls_status() from public, anon, authenticated;
grant execute on function public.test_only_rls_status() to service_role;
