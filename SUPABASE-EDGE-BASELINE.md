# Supabase Edge Migration Baseline

This document freezes the current backend and deployment behavior before the Supabase Edge migration starts.

Date captured: 2026-05-11

Source of truth for this baseline:

- code inspection of the current Astro API and page runtime behavior
- current repo configuration
- previously verified project behavior from the implemented V2 feature set

This is a migration reference, not a product spec rewrite. If the migrated system behaves differently from this document without an intentional decision, treat it as a regression.

## Current Deployment Model

The app currently assumes a server-capable Astro deployment:

- [astro.config.mjs](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/astro.config.mjs:1) uses `output: 'hybrid'`
- [astro.config.mjs](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/astro.config.mjs:1) uses `@astrojs/node`
- Astro server routes live under [src/pages/api](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api)

This means the current app is not deployable as GitHub Pages static hosting only.

## Current Runtime Modes

The app supports two active modes:

- live Supabase mode
- placeholder mode backed by in-memory mock data

Key implications:

- public and protected flows are expected to work in placeholder mode for demos
- privileged live writes use `SUPABASE_SERVICE_ROLE_KEY` on the server
- the frontend currently relies on same-origin `/api/*` for protected operations

## Route Surface Snapshot

Current Astro API routes:

- [src/pages/api/_auth.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/_auth.ts:1)
- [src/pages/api/admin/archive.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/admin/archive.ts:1)
- [src/pages/api/admin/audit-log.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/admin/audit-log.ts:1)
- [src/pages/api/admin/import/parse.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/admin/import/parse.ts:1)
- [src/pages/api/admin/settings.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/admin/settings.ts:1)
- [src/pages/api/admin/students/[id].ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/admin/students/[id].ts:1)
- [src/pages/api/admin/students/import.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/admin/students/import.ts:1)
- [src/pages/api/admin/students/index.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/admin/students/index.ts:1)
- [src/pages/api/admin/teachers/[id].ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/admin/teachers/[id].ts:1)
- [src/pages/api/admin/teachers/[id]/reset-password.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/admin/teachers/[id]/reset-password.ts:1)
- [src/pages/api/admin/teachers/import.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/admin/teachers/import.ts:1)
- [src/pages/api/admin/teachers/index.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/admin/teachers/index.ts:1)
- [src/pages/api/archive.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/archive.ts:1)
- [src/pages/api/auth/admin/login.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/auth/admin/login.ts:1)
- [src/pages/api/auth/teacher/change-password.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/auth/teacher/change-password.ts:1)
- [src/pages/api/auth/teacher/login.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/auth/teacher/login.ts:1)
- [src/pages/api/auth/teachers/list.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/auth/teachers/list.ts:1)
- [src/pages/api/public/class/[grade]/most-active-teacher.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/public/class/[grade]/most-active-teacher.ts:1)
- [src/pages/api/public/settings.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/public/settings.ts:1)
- [src/pages/api/public/student-hover.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/public/student-hover.ts:1)
- [src/pages/api/public/teachers/[id].ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/public/teachers/[id].ts:1)
- [src/pages/api/qualifications/[id].ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/qualifications/[id].ts:1)
- [src/pages/api/qualifications.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/qualifications.ts:1)
- [src/pages/api/teacher/activity.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/teacher/activity.ts:1)

## Authentication Baseline

### Admin login

Current behavior from [src/pages/api/auth/admin/login.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/auth/admin/login.ts:1):

- endpoint: `POST /api/auth/admin/login`
- rate limit: `5 attempts / minute / IP`
- placeholder mode accepts `ADMIN_PASSWORD` directly
- live mode reads `admin_settings.admin_password_hash`
- first boot behavior:
  - if no stored admin hash exists, `ADMIN_PASSWORD` is required
  - successful first login stores the hash in `admin_settings`
- invalid password returns `401`
- successful login writes an `admin.login` audit log entry
- successful login returns a signed admin token

### Teacher login

Current behavior from [src/pages/api/auth/teacher/login.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/auth/teacher/login.ts:1):

- endpoint: `POST /api/auth/teacher/login`
- rate limit: `5 attempts / minute / IP`
- required payload: `teacher_id`, `password`
- inactive teachers are blocked with `403`
- invalid credentials return `401`
- successful login writes a `teacher.login` audit log entry
- successful login returns:
  - signed teacher token
  - teacher payload with `id`, `full_name`, `subjects`, `is_password_changed`

### Route scope restrictions

Current behavior from [src/pages/api/_auth.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/_auth.ts:1):

- missing or invalid bearer token returns `401`
- valid token with wrong role returns `403`
- admin tokens are only accepted on admin route scopes
- teacher tokens are only accepted on teacher/qualification route scopes

## Teacher Operational Baseline

### Qualification create

Current behavior from [src/pages/api/qualifications.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/qualifications.ts:1):

- teacher-authenticated endpoint
- `GET` lists students for teacher search
- `POST` creates a qualification
- write rate limit: `1 write / second / teacher bearer token`
- required payload:
  - `student_id`
  - `category`
  - `subject`
  - `value`
- allowed categories:
  - `Academic`
  - `Behavior`
  - `Extracurricular`
  - `Attendance`
- allowed values:
  - `-5`
  - `-3`
  - `-1`
  - `0`
  - `1`
  - `3`
  - `5`
- teacher can only submit qualifications for admin-assigned subjects
- teacher with no assigned subjects is blocked with `403`
- successful live writes create `qualification.create` audit log entries

### Qualification delete / undo

Current behavior from [src/pages/api/qualifications/[id].ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/qualifications/[id].ts:1):

- teacher-authenticated delete
- used by the teacher recent activity undo flow
- preserves teacher ownership restrictions and audit behavior

### Teacher activity

Current behavior from [src/pages/api/teacher/activity.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/teacher/activity.ts:1):

- teacher-authenticated read
- powers the recent activity panel and undo history

## Admin Operational Baseline

### Student admin

Current behavior from:

- [src/pages/api/admin/students/index.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/admin/students/index.ts:1)
- [src/pages/api/admin/students/[id].ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/admin/students/[id].ts:1)
- [src/pages/api/admin/students/import.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/admin/students/import.ts:1)

Current guarantees:

- student list/edit/delete flows are admin-only
- student import is admin-only
- student import is rate limited as an import action
- import duplicate handling is preserved by current backend rules

### Teacher admin

Current behavior from:

- [src/pages/api/admin/teachers/index.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/admin/teachers/index.ts:1)
- [src/pages/api/admin/teachers/[id].ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/admin/teachers/[id].ts:1)
- [src/pages/api/admin/teachers/import.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/admin/teachers/import.ts:1)
- [src/pages/api/admin/teachers/[id]/reset-password.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/admin/teachers/[id]/reset-password.ts:1)

Current guarantees:

- teacher list/edit/delete flows are admin-only
- teacher import is admin-only
- teacher import updates subjects and resets password according to current rules
- passwords are length-validated
- default password values are not echoed in import validation errors
- teacher reset-password is admin-only

### Settings

Current behavior from [src/pages/api/admin/settings.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/admin/settings.ts:1):

- admin-only read/write endpoint
- controls public-facing settings such as school name and academic year

### Audit log

Current behavior from [src/pages/api/admin/audit-log.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/admin/audit-log.ts:1):

- admin-only read endpoint
- paginated
- default page size behavior currently supports `50/page`
- supports teacher/action/date filters
- API surface is intentionally read-only
- audit log is append-only by schema policy

### Archive

Current behavior from [src/pages/api/admin/archive.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/admin/archive.ts:1):

- admin-only archive trigger endpoint
- legacy [src/pages/api/archive.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/archive.ts:1) is deprecated and should not be used

## Import Parsing Baseline

Current behavior from [src/pages/api/admin/import/parse.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/admin/import/parse.ts:1):

- import parsing is server-side, not browser-side
- frontend upload modal delegates parsing to backend
- sample files currently exist at:
  - [samples/imports/sample-students.xlsx](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/samples/imports/sample-students.xlsx)
  - [samples/imports/sample-teachers.xlsx](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/samples/imports/sample-teachers.xlsx)

## Public Data Baseline

Current public data behavior is split between Astro pages and helper endpoints.

### Current SSR-like page behavior

These pages currently depend on runtime data access and are not yet static-safe:

- [src/pages/index.astro](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/index.astro:1)
- [src/pages/class/[grade].astro](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/class/[grade].astro:1)
- [src/pages/student/[id].astro](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/student/[id].astro:1)

Current indicators:

- at least `index.astro` and `student/[id].astro` explicitly export `prerender = false`
- those pages currently perform request-time live Supabase queries when not in archive mode or placeholder mode

### Current public helper endpoints

Current helper endpoints:

- [src/pages/api/public/settings.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/public/settings.ts:1)
- [src/pages/api/public/student-hover.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/public/student-hover.ts:1)
- [src/pages/api/public/teachers/[id].ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/public/teachers/[id].ts:1)
- [src/pages/api/public/class/[grade]/most-active-teacher.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/public/class/[grade]/most-active-teacher.ts:1)

These need an explicit decision during migration:

- become direct browser-to-Supabase reads
- become Supabase Edge Functions
- or be removed

## UI Behaviors That Must Not Regress

These existing user-visible behaviors must survive the backend migration:

- admin dashboard must recover cleanly after page refresh
- teacher dashboard must recover cleanly after page refresh
- teacher subject restriction must remain enforced by backend truth
- multilingual support for `uz`, `en`, and `ru` must remain intact
- archive year browsing must continue to work
- teacher mobile layering fixes must remain intact
- admin import modal must continue using backend parsing rather than browser spreadsheet parsing

## Config And Secrets Baseline

Current environment assumptions from [README.md](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/README.md:1):

Frontend-visible values:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`
- `PUBLIC_SCHOOL_NAME`

Server-only values in current Astro backend:

- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_PASSWORD`
- `JWT_SECRET`

Migration rule:

- frontend-visible values may stay public
- server-only values must move to Supabase function secrets

## Verification Status

This baseline is documented from source inspection and the current repository state.

It is sufficient as the migration reference for phase 0 because the goal is to freeze current behavior and route expectations before implementation changes begin.
