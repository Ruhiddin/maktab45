# Supabase Edge Migration TODO

This is the execution checklist for migrating this repo from:

- Astro hybrid + Node adapter

to:

- static Astro frontend on GitHub Pages
- Supabase Edge Functions for backend endpoints
- Supabase Postgres as the database

This TODO is intentionally precise. Each item is written as a concrete implementation task with dependencies and a clear done condition.

## Phase 0: Baseline And Guardrails

- [x] Freeze backend behavior before migration.
  - Capture the current route surface from [src/pages/api](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api).
  - Record the current behavior baseline in [SUPABASE-EDGE-BASELINE.md](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/SUPABASE-EDGE-BASELINE.md:1).
  - Done when the current behavior is documented as the migration baseline.

- [x] Add this migration doc to the main docs index.
  - Add links from [README.md](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/README.md:1) to:
    - [SUPABASE-EDGE-MIGRATION-PLAN.md](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/SUPABASE-EDGE-MIGRATION-PLAN.md:1)
    - [SUPABASE-EDGE-MIGRATION-TODO.md](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/SUPABASE-EDGE-MIGRATION-TODO.md:1)
    - [SUPABASE-EDGE-BASELINE.md](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/SUPABASE-EDGE-BASELINE.md:1)
  - Done when future work can find the migration docs from the README.

## Phase 1: Frontend Abstractions First

### 1.1 Add shared backend URL resolution

- [x] Create a shared frontend API URL helper.
  - Add a file such as `src/lib/apiBase.ts`.
  - Resolve:
    - local dev backend URL
    - production Supabase functions base URL
    - fallback behavior for placeholder mode
  - Include support for preserving locale-aware navigation where relevant.
  - Done when admin and teacher code no longer hardcode raw `/api/...` assumptions.

- [x] Add `PUBLIC_API_BASE_URL` to environment docs.
  - Update [.env.example](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/.env.example:1)
  - Update [README.md](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/README.md:1)
  - Done when the frontend env contract documents the future Edge Function base URL.

### 1.2 Centralize request helpers

- [x] Create shared fetch helpers for authenticated and unauthenticated requests.
  - Add a file such as `src/lib/apiClient.ts`.
  - Support:
    - JSON requests
    - bearer token injection
    - error normalization
    - timeout/cancellation ready structure if needed later
  - Done when UI components stop building fetch calls inline.

- [x] Move admin and teacher client calls onto the shared helper without changing backend behavior yet.
  - Target files include:
    - [src/components/TeacherPortal.tsx](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/components/TeacherPortal.tsx:1)
    - [src/components/TeacherLogin.tsx](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/components/TeacherLogin.tsx:1)
    - [src/components/TeacherDashboard.tsx](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/components/TeacherDashboard.tsx:1)
    - [src/components/MyActivity.tsx](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/components/MyActivity.tsx:1)
    - [src/components/ChangePasswordModal.tsx](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/components/ChangePasswordModal.tsx:1)
    - [src/components/admin/AdminLogin.tsx](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/components/admin/AdminLogin.tsx:1)
    - [src/components/admin/AdminDashboard.tsx](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/components/admin/AdminDashboard.tsx:1)
    - [src/components/admin/StudentsTable.tsx](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/components/admin/StudentsTable.tsx:1)
    - [src/components/admin/TeachersTable.tsx](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/components/admin/TeachersTable.tsx:1)
    - [src/components/admin/SettingsForm.tsx](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/components/admin/SettingsForm.tsx:1)
    - [src/components/admin/AuditLog.tsx](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/components/admin/AuditLog.tsx:1)
    - [src/components/admin/ExcelImporter.tsx](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/components/admin/ExcelImporter.tsx:1)
  - Done when the frontend can switch backend hosts centrally.

## Phase 2: Create Supabase Functions Workspace

### 2.1 Scaffold the functions project

- [x] Initialize a local Supabase project layout.
  - Add:
    - `supabase/config.toml`
    - `supabase/functions/`
  - Done when the repo has a real functions workspace committed.

- [x] Add shared Edge Function utilities.
  - Create:
    - `supabase/functions/_shared/auth.ts`
    - `supabase/functions/_shared/cors.ts`
    - `supabase/functions/_shared/env.ts`
    - `supabase/functions/_shared/response.ts`
    - `supabase/functions/_shared/rateLimit.ts`
    - `supabase/functions/_shared/teacherSubjects.ts`
    - `supabase/functions/_shared/publicSettings.ts`
  - Port logic from:
    - [src/pages/api/_auth.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/_auth.ts:1)
    - [src/lib/auth.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/lib/auth.ts:1)
    - [src/lib/rateLimit.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/lib/rateLimit.ts:1)
    - [src/lib/teacherSubjects.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/lib/teacherSubjects.ts:1)
    - [src/lib/publicSettings.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/lib/publicSettings.ts:1)
  - Done when auth and helper logic can be reused by multiple functions.

### 2.2 Add function dev and deploy docs

- [x] Document local function commands.
  - Update [README.md](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/README.md:1)
  - Include:
    - local Supabase startup
    - functions serve
    - function deploy
    - secrets setup
  - Done when a new maintainer can run the functions locally without guessing.

## Phase 3: Migrate Auth Endpoints

### 3.1 Admin login

- [x] Create `supabase/functions/auth-admin-login/index.ts`.
  - Preserve behavior from [src/pages/api/auth/admin/login.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/auth/admin/login.ts:1)
  - Preserve:
    - password validation
    - rate limiting
    - token payload shape
    - error codes/messages
  - Done when frontend admin login works against the Edge Function.

- [x] Point admin login UI to the new function.
  - Update [src/components/admin/AdminLogin.tsx](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/components/admin/AdminLogin.tsx:1)
  - Done when `/admin` no longer depends on Astro login route.

### 3.2 Teacher login and password change

- [x] Create `supabase/functions/auth-teacher-login/index.ts`.
  - Preserve behavior from [src/pages/api/auth/teacher/login.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/auth/teacher/login.ts:1)
  - Include active/deactivated account rules and assigned subject payload behavior.
  - Done when teacher login works against the function.

- [x] Create `supabase/functions/auth-teacher-change-password/index.ts`.
  - Preserve behavior from [src/pages/api/auth/teacher/change-password.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/auth/teacher/change-password.ts:1)
  - Done when password change works against the function.

- [x] Repoint teacher login and password change UI.
  - Update:
    - [src/components/TeacherLogin.tsx](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/components/TeacherLogin.tsx:1)
    - [src/components/ChangePasswordModal.tsx](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/components/ChangePasswordModal.tsx:1)
  - Done when teacher auth flow no longer depends on Astro auth routes.

### 3.3 Optional curated teacher list

- [x] Decide whether teacher list stays a function or becomes a direct public read.
  - Evaluate [src/pages/api/auth/teachers/list.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/auth/teachers/list.ts:1)
  - Preferred default: keep as a function unless data exposure is clearly harmless.
  - Done when the decision is recorded in the migration plan and implemented.

## Phase 4: Migrate Teacher Operational Functions

### 4.1 Qualifications

- [x] Create `supabase/functions/qualifications/index.ts`.
  - Preserve POST and DELETE behavior from:
    - [src/pages/api/qualifications.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/qualifications.ts:1)
    - [src/pages/api/qualifications/[id].ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/qualifications/[id].ts:1)
  - Preserve:
    - teacher token auth
    - subject eligibility restriction
    - write throttling
    - audit logging
    - undo semantics
  - Done when qualification add/remove flows work entirely against the function.

- [x] Repoint qualification UI.
  - Update:
    - [src/components/TeacherDashboard.tsx](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/components/TeacherDashboard.tsx:1)
    - [src/components/MyActivity.tsx](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/components/MyActivity.tsx:1)
  - Done when the teacher workspace no longer depends on Astro qualification routes.

### 4.2 Teacher activity

- [x] Create `supabase/functions/teacher-activity/index.ts`.
  - Preserve behavior from [src/pages/api/teacher/activity.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/teacher/activity.ts:1)
  - Done when recent teacher activity loads via the function.

## Phase 5: Migrate Admin CRUD

### 5.1 Students

- [x] Create `supabase/functions/admin-students/index.ts`.
  - Preserve behavior from:
    - [src/pages/api/admin/students/index.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/admin/students/index.ts:1)
    - [src/pages/api/admin/students/[id].ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/admin/students/[id].ts:1)
  - Done when list/update/delete works via the function.

- [x] Repoint student admin UI.
  - Update [src/components/admin/StudentsTable.tsx](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/components/admin/StudentsTable.tsx:1)
  - Done when student table operations no longer call Astro admin routes.

### 5.2 Teachers

- [x] Create `supabase/functions/admin-teachers/index.ts`.
  - Preserve behavior from:
    - [src/pages/api/admin/teachers/index.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/admin/teachers/index.ts:1)
    - [src/pages/api/admin/teachers/[id].ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/admin/teachers/[id].ts:1)
  - Preserve subject normalization and teacher activation rules.
  - Done when teacher list/update/delete works via the function.

- [x] Create `supabase/functions/admin-teacher-reset-password/index.ts`.
  - Preserve behavior from [src/pages/api/admin/teachers/[id]/reset-password.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/admin/teachers/[id]/reset-password.ts:1)
  - Done when password reset works via the function.

- [x] Repoint teacher admin UI.
  - Update [src/components/admin/TeachersTable.tsx](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/components/admin/TeachersTable.tsx:1)
  - Done when teacher admin actions no longer call Astro admin routes.

### 5.3 Settings and audit log

- [x] Create `supabase/functions/admin-settings/index.ts`.
  - Preserve behavior from [src/pages/api/admin/settings.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/admin/settings.ts:1)
  - Done when settings read/write works via the function.

- [x] Create `supabase/functions/admin-audit-log/index.ts`.
  - Preserve behavior from [src/pages/api/admin/audit-log.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/admin/audit-log.ts:1)
  - Preserve pagination, filtering, and read-only semantics.
  - Done when audit log loads and paginates via the function.

- [x] Repoint settings and audit UI.
  - Update:
    - [src/components/admin/SettingsForm.tsx](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/components/admin/SettingsForm.tsx:1)
    - [src/components/admin/AuditLog.tsx](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/components/admin/AuditLog.tsx:1)
  - Done when those screens no longer use Astro routes.

## Phase 6: Migrate Imports And Archive Flows

### 6.1 Validate Edge compatibility for imports

- [x] Prove whether `xlsx` works in Supabase Edge Functions.
  - Build a minimal parsing spike inside `supabase/functions/admin-import-parse/index.ts`.
  - Test with:
    - [samples/imports/sample-students.xlsx](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/samples/imports/sample-students.xlsx)
    - [samples/imports/sample-teachers.xlsx](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/samples/imports/sample-teachers.xlsx)
  - Done when there is a binary decision:
    - `xlsx` is acceptable in Edge runtime
    - or production uploads become CSV-first

- [x] If `xlsx` fails in Edge runtime, define the fallback without ambiguity.
  - Choose one:
    - CSV-only production uploads
    - alternate parser compatible with Deno/Edge
  - Update README and UI copy if the accepted file types change.
  - Done when import support is explicit and documented.

### 6.2 Import parse and import write endpoints

- [x] Create `supabase/functions/admin-import-parse/index.ts`.
  - Port behavior from [src/pages/api/admin/import/parse.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/admin/import/parse.ts:1)
  - Done when the admin import modal parses files through Supabase functions.

- [x] Create `supabase/functions/admin-students-import/index.ts`.
  - Port behavior from [src/pages/api/admin/students/import.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/admin/students/import.ts:1)
  - Preserve duplicate handling and rate limit behavior.
  - Done when student import works through the function.

- [x] Create `supabase/functions/admin-teachers-import/index.ts`.
  - Port behavior from [src/pages/api/admin/teachers/import.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/admin/teachers/import.ts:1)
  - Preserve subject parsing, password validation, and safe error reporting.
  - Done when teacher import works through the function.

- [x] Repoint import UI.
  - Update [src/components/admin/ExcelImporter.tsx](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/components/admin/ExcelImporter.tsx:1)
  - Done when imports no longer depend on Astro admin routes.

### 6.3 Archive trigger

- [x] Create `supabase/functions/admin-archive/index.ts`.
  - Port behavior from [src/pages/api/admin/archive.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/admin/archive.ts:1)
  - Decide how archive output is written for a GitHub Pages frontend.
  - Preferred decision:
    - archive snapshot is stored in Supabase Storage or database
    - frontend reads archive data from Supabase, not committed repo files
  - Done when archive creation no longer assumes Node-hosted app internals.

- [x] Remove reliance on the deprecated legacy archive route.
  - Delete or permanently retire [src/pages/api/archive.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/archive.ts:1)
  - Done when no UI or docs mention it.

## Phase 7: Public Data Strategy And Static Safety

### 7.1 Homepage

- [x] Convert [src/pages/index.astro](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/index.astro:1) into a static-safe shell.
  - It currently has `export const prerender = false;`
  - It currently fetches:
    - `live_ranking`
    - recent `qualifications`
    - public settings
  - Move live reads into browser-side code or client islands.
  - Keep archive JSON or archive storage loading explicit.
  - Done when homepage no longer relies on Astro request-time data reads.

### 7.2 Grade and student pages

- [x] Convert [src/pages/class/[grade].astro](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/class/[grade].astro:1) into a static-safe shell.
  - Remove runtime server dependency.
  - Preserve archive year and locale behavior.
  - Done when class detail works without Astro request-time Supabase reads.

- [x] Convert [src/pages/student/[id].astro](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/student/[id].astro:1) into a static-safe shell.
  - It currently has `export const prerender = false;`
  - Move student, qualification, ranking, and classmates live reads to client-side code.
  - Preserve localized student detail behavior.
  - Done when student detail works without Astro request-time Supabase reads.

### 7.3 Public micro-endpoints decision

- [x] Decide per public route whether it becomes:
  - direct browser read
  - Supabase function
  - or is removed entirely

- [x] Make and implement the decision for:
  - [src/pages/api/public/settings.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/public/settings.ts:1)
  - [src/pages/api/public/student-hover.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/public/student-hover.ts:1)
  - [src/pages/api/public/teachers/[id].ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/public/teachers/[id].ts:1)
  - [src/pages/api/public/class/[grade]/most-active-teacher.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/public/class/[grade]/most-active-teacher.ts:1)
  - Done when each route has an explicit target and no indecision remains.

## Phase 8: Deployment Switch

### 8.1 Static frontend

- [x] Remove the Node adapter dependency.
  - Update [package.json](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/package.json:1)
  - Remove `@astrojs/node`
  - Done when the project no longer depends on Node adapter packages.

- [x] Switch [astro.config.mjs](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/astro.config.mjs:1) to static output.
  - Change `output: 'hybrid'` to `output: 'static'`
  - Remove the node adapter import and configuration
  - Done when `astro build` emits a static site without server output expectations.

### 8.2 Backend secrets and CORS

- [ ] Configure Supabase secrets for functions.
  - Set:
    - `SUPABASE_SERVICE_ROLE_KEY`
    - `ADMIN_PASSWORD`
    - `JWT_SECRET`
  - Repo-side env and docs are complete; the remaining work is external provisioning in the live Supabase project.
  - Done when all privileged functions run without frontend secret leakage.

- [x] Add production CORS handling for GitHub Pages origin.
  - Implement in shared function CORS helper.
  - Done when browser calls from the GitHub Pages domain are accepted and others are constrained appropriately.

### 8.3 GitHub Pages deployment docs

- [x] Rewrite deployment section in [README.md](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/README.md:1)
  - Remove Node-server deployment assumptions
  - Document:
    - static frontend deploy
    - Supabase functions deploy
    - env/secrets split
  - Done when deployment docs match the new architecture.

## Phase 9: Cleanup

- [x] Remove Astro API routes after feature parity is confirmed.
  - Deleted the old runtime `src/pages/api` surface earlier in the static cutover and removed the remaining compatibility copies in `src/legacy-api`.
  - Done when no frontend code references the Astro API surface.

- [x] Remove dead compatibility code.
  - Cleaned dual-backend route branches, same-origin fallback assumptions, and outdated migration comments.
  - Done when the codebase reflects one architecture, not both.

- [x] Review placeholder mode.
  - Placeholder mode remains supported for public/demo use only.
  - Admin and teacher workflows now require `PUBLIC_API_BASE_URL` plus deployed Supabase Edge Functions.
  - Done when placeholder mode has an explicit product status.

## Verification Checklist

- [ ] Admin login works after full page refresh.
- [ ] Teacher login works after full page refresh.
- [ ] Teacher can only rate assigned subjects.
- [ ] Qualification add works.
- [ ] Qualification undo/delete works.
- [ ] Teacher activity loads correctly.
- [ ] Student table load, edit, delete work.
- [ ] Teacher table load, edit, reset-password, delete work.
- [ ] Settings save works.
- [ ] Audit log filters and pagination work.
- [ ] Student import sample works.
- [ ] Teacher import sample works.
- [ ] Archive creation works.
- [ ] Archive browsing works from public pages.
- [ ] Student detail still works in `uz`, `en`, and `ru`.
- [ ] Study year selection still works.
- [ ] Public leaderboard filters still work.
- [ ] Teacher portal still behaves correctly on mobile.
- [ ] Admin dashboard still restores correctly after refresh.
- [x] `npm run build` passes in static mode.

## Blockers To Resolve Early

- [x] Confirm `xlsx` viability in Supabase Edge runtime.
- [x] Decide final archive storage strategy for a static frontend.
- [x] Decide whether public helper endpoints become direct reads or stay as functions.
- [x] Decide the future of placeholder mode after the backend migration.

## Recommended Work Order

1. Phase 1
2. Phase 2
3. Phase 3
4. Phase 4
5. Phase 5
6. Phase 7
7. Phase 8
8. Phase 9

Do not switch Astro to static output before Phases 3 through 7 are complete, or the app will lose required runtime behavior before replacements exist.
