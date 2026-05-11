# School Leaderboard V2

School Leaderboard V2 is the current production-oriented version of the project. It adds role-based admin and teacher workflows, bulk imports, audit logging, yearly archiving, richer leaderboard visuals, and a public placeholder mode for demos without Supabase.

The active product spec is [V2-SPEC.md](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/V2-SPEC.md:1). [PROJECT-SPEC.md](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/PROJECT-SPEC.md:1) is now a V1 historical reference only.

## Stack

- Astro 4 with React islands
- Tailwind CSS
- Supabase for the live V2 database, Edge Functions, and archive storage
- Recharts for charts
- Framer Motion for UI motion
- CSV import pipeline for the hosted Edge deployment

## V2 Features

- Public leaderboard with podium, badges, rank delta, filters, archive browsing, class detail pages, and student detail pages
- Admin flow at `/admin` for student import, teacher import, audit log review, settings, and yearly archive
- Teacher flow at `/teacher` for named-teacher login, qualification entry, recent activity, undo, and password change
- Public placeholder mode that runs without Supabase using in-memory mock data
- End-to-end V2 smoke coverage via `npm run test:e2e`

## Setup

### Prerequisites

- Node.js 20+
- `npm`
- Supabase CLI for local Edge Function work and deploys
- Supabase project for live mode, or placeholder mode for local/demo use

### Install

```bash
npm install
cp .env.example .env
```

### Choose a mode

Placeholder mode:
- Leave `PUBLIC_SUPABASE_URL` as `https://placeholder.supabase.co`
- Keep `PUBLIC_SUPABASE_ANON_KEY=placeholder-key`
- Set a real `ADMIN_PASSWORD`
- `SUPABASE_SERVICE_ROLE_KEY` is not required
- public leaderboard, class detail, student detail, and archive browsing stay available
- admin and teacher actions still require a real `PUBLIC_API_BASE_URL`

Live Supabase mode:
- Set `PUBLIC_SUPABASE_URL`
- Set `PUBLIC_SUPABASE_ANON_KEY`
- Set `SUPABASE_SERVICE_ROLE_KEY`
- Set `ADMIN_PASSWORD`
- Set `JWT_SECRET`
- Run [schema-v2.sql](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/schema-v2.sql:1) in Supabase

### Start

```bash
npm run dev
```

Default local URL: `http://localhost:4321`

This starts the static frontend locally. Protected admin and teacher actions require Supabase Edge Functions through:

- `PUBLIC_API_BASE_URL=https://<project-ref>.supabase.co/functions/v1`

## Supabase Functions Workflow

The repo includes a local Supabase functions workspace under [supabase](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/supabase/config.toml:1). The target deployment architecture is:

- static Astro frontend
- GitHub Pages for frontend hosting
- Supabase Edge Functions for protected/admin/teacher backend routes
- Supabase Postgres and Storage for data and archives

Import decision for the Supabase Edge migration:

- production Edge uploads are `CSV-first`
- `.xlsx` / `.xls` are not accepted for the Edge target
- reason: Supabase Edge Functions run on Deno, and SheetJS documents Deno support as experimental
- the hosted contract is CSV

### Local Supabase startup

Start the local Supabase stack from the repo root:

```bash
supabase start
```

This uses [supabase/config.toml](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/supabase/config.toml:1) and gives you:

- local API gateway
- local Postgres
- local auth/storage services
- local Edge Functions runtime

Stop the stack with:

```bash
supabase stop
```

### Serve Edge Functions locally

To run a function during migration work:

```bash
supabase functions serve <function-name> --env-file .env
```

Examples:

```bash
supabase functions serve auth-admin-login --env-file .env
supabase functions serve qualifications --env-file .env
```

The shared helpers for future functions live under [supabase/functions/_shared](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/supabase/functions/_shared/auth.ts:1).

### Deploy Edge Functions

Deploy one function:

```bash
supabase functions deploy <function-name>
```

Examples:

```bash
supabase functions deploy auth-admin-login
supabase functions deploy admin-students
```

Once the migration reaches live function entrypoints, the production frontend `PUBLIC_API_BASE_URL` should point at:

```text
https://<project-ref>.supabase.co/functions/v1
```

### Set function secrets

The server-only values must be configured as Supabase secrets before deployed functions can replace the Astro backend:

```bash
supabase secrets set PUBLIC_SUPABASE_URL=...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
supabase secrets set ADMIN_PASSWORD=...
supabase secrets set JWT_SECRET=...
supabase secrets set PUBLIC_SCHOOL_NAME="School #45, Fergana"
supabase secrets set ALLOWED_ORIGINS=https://<your-github-pages-domain>
```

For local function serving, copy [supabase/functions/.env.example](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/supabase/functions/.env.example:1) to `supabase/functions/.env` and fill in the real values.

At minimum, the shared function layer currently expects:

- `PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_PASSWORD`
- `JWT_SECRET`

For archive cutover, also provision:

- a Supabase Storage bucket named `archives`
- the `admin-archive` function writes yearly archive snapshots there as JSON objects
- this replaces the old Node filesystem write into `public/archives` for the hosted Edge target

Optional but recommended:

- `PUBLIC_SCHOOL_NAME`
- `ALLOWED_ORIGINS`

Production CORS behavior:

- deployed functions only allow origins listed in `ALLOWED_ORIGINS`
- if `ALLOWED_ORIGINS` is omitted, the shared helper falls back to local-only origins:
  - `http://localhost:4321`
  - `http://127.0.0.1:4321`
- set `ALLOWED_ORIGINS` explicitly before exposing the frontend from GitHub Pages

### Current migration status

- the frontend now builds as a static Astro site
- shared Edge helpers exist under `supabase/functions/_shared`
- migrated Supabase function entrypoints exist for auth, teacher operations, admin CRUD, imports, and archiving
- legacy Astro API compatibility code has been removed from the frontend repo

Track progress in:

- [SUPABASE-EDGE-MIGRATION-PLAN.md](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/SUPABASE-EDGE-MIGRATION-PLAN.md:1)
- [SUPABASE-EDGE-MIGRATION-TODO.md](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/SUPABASE-EDGE-MIGRATION-TODO.md:1)

## First Boot

For a fresh live V2 deployment:

1. Run [schema-v2.sql](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/schema-v2.sql:1) in Supabase.
2. Create the Supabase Storage bucket `archives`.
3. Set frontend env values:
   - `PUBLIC_SUPABASE_URL`
   - `PUBLIC_SUPABASE_ANON_KEY`
   - `PUBLIC_API_BASE_URL=https://<project-ref>.supabase.co/functions/v1`
4. Set Supabase function secrets:
   - `PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_PASSWORD`
   - `JWT_SECRET`
   - `PUBLIC_SCHOOL_NAME`
   - `ALLOWED_ORIGINS=https://<your-github-pages-domain>`
5. Deploy the required Edge Functions.
6. Build and publish the static frontend.
7. Open `/admin`.
8. Log in with `ADMIN_PASSWORD`.
9. Import teachers first, then students.
10. Ask teachers to sign in at `/teacher` and change their default passwords.
11. Review school name, sections, and academic year in the admin settings tab.

In placeholder mode, public pages remain available for demos and UI development. `/admin` and `/teacher` require a configured Supabase Edge backend.

## Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `PUBLIC_SUPABASE_URL` | Live mode | Public Supabase URL. Leave as placeholder value for demo mode. |
| `PUBLIC_SUPABASE_ANON_KEY` | Live mode | Public Supabase anon key. |
| `PUBLIC_API_BASE_URL` | Live deploy | Base URL for protected/admin/teacher API calls. Set this to `https://<project-ref>.supabase.co/functions/v1` for GitHub Pages + Supabase Functions deployment. |
| `SUPABASE_SERVICE_ROLE_KEY` | Live mode | Server-side write access for Supabase Edge Functions. |
| `ADMIN_PASSWORD` | Yes | Admin login password used by the Edge backend on first boot. |
| `JWT_SECRET` | Recommended | Secret for signed admin/teacher session tokens. |
| `PUBLIC_SCHOOL_NAME` | Optional | Fallback school name if `admin_settings.school_name` is not yet set. |

## Import Templates

### Students import

Required headers:

| Header | Required | Example |
| --- | --- | --- |
| `full_name` | Yes | `Ali Valiev` |
| `gender` | Yes | `male` |
| `grade` | Yes | `5` |
| `section` | No | `A` |

Notes:
- `gender` must be `male` or `female`
- `grade` must be an integer from `1` to `11`
- duplicate students are skipped by `full_name + grade + section`
- the hosted migration target accepts `.csv`
- convert existing Excel sheets to CSV before upload when using the Supabase Edge deployment

### Teachers import

Required headers:

| Header | Required | Example |
| --- | --- | --- |
| `full_name` | Yes | `Gulnora Karimova` |
| `subjects` | Yes | `Math, Algebra` |
| `default_password` | Yes | `teacher123` |

Notes:
- `subjects` can be comma-separated text
- re-importing an existing teacher updates subjects and resets the password
- imported teacher passwords must meet the backend minimum length rule
- the hosted migration target accepts `.csv`

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build |
| `npm run perf:leaderboard` | Run the leaderboard performance benchmark |
| `npm run test:e2e` | Run the V2 smoke suite |

`npm run test:e2e` boots Astro locally, exercises the public V2 flows in placeholder mode, and runs a browser render matrix for available local browsers. Firefox and Safari checks are conditional on the host having a usable browser installation.

## Key Paths

- [V2-SPEC.md](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/V2-SPEC.md:1)
- [V2-TODO.md](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/V2-TODO.md:1)
- [SUPABASE-EDGE-BASELINE.md](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/SUPABASE-EDGE-BASELINE.md:1)
- [SUPABASE-EDGE-MIGRATION-PLAN.md](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/SUPABASE-EDGE-MIGRATION-PLAN.md:1)
- [SUPABASE-EDGE-MIGRATION-TODO.md](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/SUPABASE-EDGE-MIGRATION-TODO.md:1)
- [schema-v2.sql](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/schema-v2.sql:1)
- [src/pages/admin/index.astro](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/admin/index.astro:1)
- [src/pages/teacher/index.astro](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/teacher/index.astro:1)
- [scripts/e2e-v2.mjs](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/scripts/e2e-v2.mjs:1)

## Deployment Notes

### Production Architecture

- frontend host: GitHub Pages
- backend host: Supabase Edge Functions
- database: Supabase Postgres
- archive storage: Supabase Storage bucket `archives`

### Deploy Frontend

1. Set frontend env values before building:
   - `PUBLIC_SUPABASE_URL`
   - `PUBLIC_SUPABASE_ANON_KEY`
   - `PUBLIC_API_BASE_URL=https://<project-ref>.supabase.co/functions/v1`
   - optional `PUBLIC_SCHOOL_NAME`
2. Run:

```bash
npm install
npm run build
```

3. Publish the generated `dist/` directory to GitHub Pages.

### Deploy Functions

Deploy each required function from the repo root:

```bash
supabase functions deploy auth-admin-login
supabase functions deploy auth-teacher-login
supabase functions deploy auth-teacher-change-password
supabase functions deploy auth-teachers-list
supabase functions deploy qualifications
supabase functions deploy teacher-activity
supabase functions deploy admin-students
supabase functions deploy admin-teachers
supabase functions deploy admin-teacher-reset-password
supabase functions deploy admin-settings
supabase functions deploy admin-audit-log
supabase functions deploy admin-import-parse
supabase functions deploy admin-students-import
supabase functions deploy admin-teachers-import
supabase functions deploy admin-archive
```

### Env And Secrets Split

Frontend build-time/public values:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`
- `PUBLIC_API_BASE_URL`
- optional `PUBLIC_SCHOOL_NAME`

Supabase function secrets only:

- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_PASSWORD`
- `JWT_SECRET`
- `ALLOWED_ORIGINS`

Do not expose function secrets in GitHub Pages.

### Placeholder Mode

Placeholder mode is still useful for demos, screenshots, and local UI development, but it is public/demo-only, does not persist data, and is not the production deployment path. Admin and teacher workflows require `PUBLIC_API_BASE_URL` plus deployed Supabase Edge Functions.
