-- Red lines, one owner per row (ticket 07).
-- The user's own deal-breakers, in plain language. Every analysis a signed-in
-- user runs is checked against them; each report keeps a snapshot of the ones
-- it ran with (reports.red_lines), so editing this table never changes a
-- saved report.
-- Row-level security limits every operation to the signed-in owner.
-- Not applied automatically: the owner runs this by hand.

create table public.red_lines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Same limit the app enforces (lib/red-lines/red-lines.ts, MAX_RED_LINE_CHARS).
  text text not null check (char_length(btrim(text)) between 1 and 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index red_lines_user_id_created_at_idx on public.red_lines (user_id, created_at);

-- Matching is by trimmed, case-folded text, so two red lines that differ only
-- in case or surrounding spaces would be the same red line.
create unique index red_lines_user_id_text_key on public.red_lines (user_id, lower(btrim(text)));

create or replace function public.red_lines_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger red_lines_set_updated_at
  before update on public.red_lines
  for each row execute function public.red_lines_set_updated_at();

alter table public.red_lines enable row level security;

-- red_lines: owner only
create policy "red_lines_select_own" on public.red_lines
  for select to authenticated using (user_id = (select auth.uid()));
create policy "red_lines_insert_own" on public.red_lines
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "red_lines_update_own" on public.red_lines
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "red_lines_delete_own" on public.red_lines
  for delete to authenticated using (user_id = (select auth.uid()));
