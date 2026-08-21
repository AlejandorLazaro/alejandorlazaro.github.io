# Staff Advance calendar — going live

> **Received this as a `.patch` file instead of a PR?** Apply it from the
> repo root with:
> ```
> git checkout -b feature/live-retreat-calendar
> git am 0001-Replace-calendar-iframe-with-a-custom-live-editable-*.patch
> ```
> then push that branch and open a PR (or push straight to `main`) yourself.

This branch replaces the `/calendar` page's old Google Calendar `<iframe>` with
a custom visual schedule (color-coded grid on desktop, day-by-day agenda on
mobile, with a manual toggle between the two) that anyone with the link can
view, plus live editing for a small allow-listed group.

**Right now the page works with zero setup** — it ships a hardcoded copy of
the schedule (`FALLBACK_EVENTS` in `_layouts/calendar.html`) so it renders
correctly even before any backend is wired up. That's what you're reviewing:
the visual/UX, not the live-data plumbing yet. The steps below turn on the
live, editable version.

## What's already built

- `_layouts/calendar.html` — the full page (view toggle, day tabs, week grid,
  sign-in panel, edit modal). No build step — plain HTML/CSS/JS, loads
  `@supabase/supabase-js` from `esm.sh` as an ES module.
- `snake-game-backend/supabase/calendar_schema.sql` — adds two new tables
  (`events`, `editors`) to the **existing** snake-game-backend Supabase
  project. Nothing about the leaderboard table/function is touched.
- `snake-game-backend/supabase/calendar_seed.sql` — seeds the three editor
  emails and the full Mon–Fri schedule, transcribed from the reference sheet.

## Steps to go live

1. **Run the SQL.** In that Supabase project's SQL editor, run
   `calendar_schema.sql` then `calendar_seed.sql` (in that order).
2. **Grab the client credentials.** Project Settings → API → copy the
   Project URL and the `anon` `public` key.
3. **Fill in the placeholders.** In `_layouts/calendar.html`, find:
   ```js
   const SUPABASE_URL = "PLACEHOLDER_SUPABASE_URL";
   const SUPABASE_ANON_KEY = "PLACEHOLDER_SUPABASE_ANON_KEY";
   ```
   and replace both with the real values. This is the anon/publishable key —
   safe to ship client-side, same as the pattern already used in
   `react-src/src/app/App.tsx`. Row-level security on `events`/`editors` is
   the actual access control, not this key.
4. **Confirm email auth is on** (Authentication → Providers → Email) — it
   should already be, per the project's existing `config.toml`.
5. **Push to `main`** (or merge the PR) and let the existing GitHub Actions
   workflow redeploy the site, then visit `/calendar/`.
6. **Test editing.** Sign in with each of the three editor emails via the "Sign in to edit" panel (bottom
   right) — it sends a magic link. Once signed in, an "Edit" toggle appears;
   turning it on lets you click any block to edit/delete it, or add a new
   one. Open the page in a second tab/device to confirm edits show up there
   within a couple seconds with no refresh (Supabase Realtime).
7. **Spot-check the schedule.** The seed data was transcribed from a
   flattened image/description of the sheet, not pulled programmatically —
   read through it once against the live Google Sheet before sharing the QR
   code widely.

## Managing editors later

Adding or removing someone who can edit live is a one-line SQL change against
the `editors` table (there's no UI for this on purpose — it's not something
the page itself can grant):

```sql
insert into editors (email) values ('newperson@example.com');
delete from editors where email = 'someone@example.com';
```

## Retuning colors

Each event has a `category` (`meal`, `break`, `worship`, `session`,
`freetime`, `breakout`, `executive`, `meeting`, `afterhours`, `depart`). The
color for each lives in one place — the `--cat-*` CSS variables near the top
of `_layouts/calendar.html` — so nudging a color doesn't require touching any
event data.
