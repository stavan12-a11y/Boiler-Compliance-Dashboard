# Boiler Inspection Management System

A tool for maintenance teams to keep track of industrial boilers and their
regular safety inspections. The whole app runs in the browser and persists all
data to `localStorage`, so your fleet survives between sessions.

## Features

- **Fleet grid** — every boiler is a card showing name, type, capacity,
  location, a colour-coded status accent, and a five-segment **stage stepper**
  that highlights exactly which workflow stage the boiler is at:
  - 🔴 **Red** — failed its last inspection, needs repairs
  - 🟠 **Amber** — an inspection is underway (current stage pulses)
  - 🟢 **Green** — passed and everything is complete
  - ⚪ **Gray** — no inspection started yet
  Cards also surface **overdue** and **due-soon** warnings.
- **Detail view** with two tabs:
  - **Overview** — all technical specs, editable in place, plus the active
    inspection workflow right below them.
  - **History** — every archived inspection, expandable to show the full
    timeline, per-step notes, timestamps, and repair logs.
- **Inspection workflow** — record date, notes, and pass/fail. A pass kicks off
  a five-step workflow (Inspection Done → Invoice Received → PO Issued →
  Certificate Received → Certificate Installed), each step timestamped on
  completion. Completing the final step automatically archives the inspection to
  history. A fail opens a repair flow where you log repairs and trigger a
  re-inspection.
- **Right sidebar** — an inspection schedule (overdue / due soon) and a list of
  boilers that currently need repairs.
- **Summary cards** — total boilers, active inspections, failed boilers, and the
  average inspection duration across completed inspections.
- **Change history** — every edit (specs, inspection date/result/notes, workflow
  steps and their timestamps, and repair logs) is recorded with its before →
  after values, viewable and searchable from the **History** button in the
  header.
- **CSV export** — per-boiler reports (specs, history, steps, timestamps, notes,
  repairs) and a one-click bulk export of the whole fleet.
- **Reset** — restore the demo data set at any time.

## Tech stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Supabase (optional) — authentication + shared real-time data

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check and build for production
npm run preview  # preview the production build
```

## Login & cloud sync (Supabase)

The app supports two modes, selected automatically from environment variables:

### Cloud mode (shared, live data for a team)

Set both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (see `.env.example`).
In this mode:

- The login page authenticates against **Supabase Auth** (email + password).
- All boilers, inspections, and the change history live in one shared row and
  **sync in real time** — everyone who signs in sees the same, always-current
  data, and edits broadcast live to other open sessions.
- A "Synced / Saving…" indicator appears in the header.

One-time setup:

1. Create a Supabase project.
2. In the SQL Editor, run [`supabase/schema.sql`](supabase/schema.sql) (creates
   the `app_state` table, row-level security, and realtime).
3. In **Authentication → Users → Add user**, create the email/password each
   teammate will use (tick "Auto Confirm User").
4. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Project Settings → API)
   in your hosting provider, then redeploy. The demo fleet seeds the shared
   table on first run.

### Local mode (default, no backend)

Without Supabase env vars the app runs entirely in the browser:

- A single static login gates the app — defaults `admin` / `boiler-2026`
  (override with `VITE_APP_USERNAME` / `VITE_APP_PASSWORD`).
- Data persists per-browser to `localStorage`. Use the **Reset** button in the
  header to reload the bundled demo fleet.
