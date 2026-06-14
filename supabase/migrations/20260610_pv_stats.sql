-- ParentVantage HUB: stores published team/player stat snapshots.
-- Token is a UUID generated locally by the coach's device — no auth required.
-- Public RLS: anyone can read; writes are gated only by knowing the token.

create table pv_stats (
  token       text primary key,
  team_name   text,
  payload     jsonb not null,
  updated_at  timestamptz default now()
);

alter table pv_stats enable row level security;

create policy "pv_stats_public_select" on pv_stats
  for select using (true);

create policy "pv_stats_public_insert" on pv_stats
  for insert with check (true);

create policy "pv_stats_public_update" on pv_stats
  for update using (true);
