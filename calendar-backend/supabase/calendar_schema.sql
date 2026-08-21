-- Schema for the Staff Advance (Sept 2026) live calendar page (/calendar).
-- Additive only: does not touch the existing `leaderboard` table or its
-- edge function. Run this once against this project's SQL editor (or via
-- `supabase db push` once linked), then run calendar_seed.sql.

create table editors (
  email text primary key
);

alter table editors enable row level security;

create policy "Public read editors" on editors for select using (true);
-- Deliberately no insert/update/delete policy on `editors`: nobody can grant
-- themselves (or anyone else) edit access through the client, signed in or
-- not. Adding/removing an editor is a manual SQL step against this table.

create table events (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  start_time time not null,
  end_time time not null,
  title text not null,
  description text,
  category text not null default 'session', -- meal | break | worship | session | freetime | breakout | executive | meeting | afterhours | depart
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

alter table events enable row level security;

create policy "Public read events" on events for select using (true);

create policy "Editors can write events" on events for all
  using (auth.jwt() ->> 'email' in (select email from editors))
  with check (auth.jwt() ->> 'email' in (select email from editors));

alter publication supabase_realtime add table events;
