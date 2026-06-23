-- Tracks visits to public-facing pages (login, signup landing, etc.).
-- Anon key can insert; only authenticated users can read.

create table page_views (
  id         bigint generated always as identity primary key,
  page       text        not null,
  visited_at timestamptz default now()
);

alter table page_views enable row level security;

create policy "page_views_anon_insert" on page_views
  for insert to anon with check (true);

create policy "page_views_auth_select" on page_views
  for select to authenticated using (true);
