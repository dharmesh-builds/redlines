-- Documents and reports, one owner per row (ticket 01).
-- Only the extracted text of an agreement is stored, never the file.
-- Row-level security limits every operation to the signed-in owner:
-- there is no sharing between users in v1.
-- Not applied automatically: the owner runs this by hand.

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null default 'Untitled agreement',
  text text not null check (length(text) > 0),
  created_at timestamptz not null default now()
);

create index documents_user_id_created_at_idx on public.documents (user_id, created_at desc);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  payload jsonb not null,
  model_id text not null,
  -- The red lines this report ran with, so a later edit can't silently change it.
  red_lines jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index reports_document_id_created_at_idx on public.reports (document_id, created_at desc);
create index reports_user_id_idx on public.reports (user_id);

alter table public.documents enable row level security;
alter table public.reports enable row level security;

-- documents: owner only
create policy "documents_select_own" on public.documents
  for select to authenticated using (user_id = (select auth.uid()));
create policy "documents_insert_own" on public.documents
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "documents_update_own" on public.documents
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "documents_delete_own" on public.documents
  for delete to authenticated using (user_id = (select auth.uid()));

-- reports: owner only, and a report may only point at the owner's own document
create policy "reports_select_own" on public.reports
  for select to authenticated using (user_id = (select auth.uid()));
create policy "reports_insert_own" on public.reports
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.documents d
      where d.id = document_id and d.user_id = (select auth.uid())
    )
  );
create policy "reports_update_own" on public.reports
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.documents d
      where d.id = document_id and d.user_id = (select auth.uid())
    )
  );
create policy "reports_delete_own" on public.reports
  for delete to authenticated using (user_id = (select auth.uid()));
