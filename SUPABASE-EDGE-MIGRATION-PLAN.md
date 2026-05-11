# Supabase Edge Migration Plan

This document defines the migration path from the current Astro hybrid/Node deployment to a split deployment:

- frontend: static Astro site hosted on GitHub Pages
- backend: Supabase Edge Functions
- database: Supabase Postgres

The goal is to remove the current Node runtime dependency while preserving the existing V2 behavior.

## Current State

The repo currently depends on Astro server behavior:

- [astro.config.mjs](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/astro.config.mjs:1) uses `output: 'hybrid'`
- [astro.config.mjs](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/astro.config.mjs:1) uses `@astrojs/node`
- server routes live under [src/pages/api](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api)
- some public pages read data at request time rather than behaving as pure static pages

GitHub Pages cannot run the current server routes, so those routes must be replaced before switching deployment.

## Architecture Decision

Use Supabase Edge Functions as the only serverless backend layer.

Why this is the chosen target:

- it keeps database, secrets, and backend logic on one platform
- this app mostly needs short-lived request/response endpoints, which fits Edge Functions well
- it avoids adding Netlify as a second backend platform
- public leaderboard reads can still go directly from browser to Supabase using the anon key

## Scope Split

### Keep as direct browser-to-Supabase reads

These are public, read-only, and should not require an Edge Function unless later business rules change:

- leaderboard data
- class detail data
- student detail data
- archive snapshots in Supabase Storage for the Edge target, with legacy `public/archives` files only as a migration-era local fallback
- public school settings if they remain safe for anon exposure

### Move to Supabase Edge Functions

All privileged, authenticated, rate-limited, or write-oriented endpoints:

- admin auth
- teacher auth
- qualification create/delete
- teacher activity
- admin student CRUD/import
- admin teacher CRUD/import/reset-password
- settings update
- audit log read
- archive creation
- import file parsing
- any endpoint using `SUPABASE_SERVICE_ROLE_KEY`

## Route Inventory And Target Mapping

Current Astro API routes and proposed target shape:

| Current route | Target | Notes |
| --- | --- | --- |
| `src/pages/api/_auth.ts` | shared function utility | move into `supabase/functions/_shared/auth.ts` |
| `src/pages/api/auth/admin/login.ts` | `functions/v1/auth-admin-login` | keeps admin password check and token issuance |
| `src/pages/api/auth/teacher/login.ts` | `functions/v1/auth-teacher-login` | keeps teacher credential and active-status rules |
| `src/pages/api/auth/teacher/change-password.ts` | `functions/v1/auth-teacher-change-password` | protected teacher-only write |
| `src/pages/api/auth/teachers/list.ts` | `functions/v1/auth-teachers-list` | keep as a curated function-backed list of active teachers rather than exposing raw teacher reads directly |
| `src/pages/api/qualifications.ts` | `functions/v1/qualifications` | POST create |
| `src/pages/api/qualifications/[id].ts` | `functions/v1/qualifications` | DELETE by path or query |
| `src/pages/api/teacher/activity.ts` | `functions/v1/teacher-activity` | protected teacher read |
| `src/pages/api/admin/students/index.ts` | `functions/v1/admin-students` | GET/POST or GET only if create stays import-only |
| `src/pages/api/admin/students/[id].ts` | `functions/v1/admin-students` | PATCH/DELETE by path |
| `src/pages/api/admin/students/import.ts` | `functions/v1/admin-students-import` | protected write with rate limiting |
| `src/pages/api/admin/teachers/index.ts` | `functions/v1/admin-teachers` | GET/POST or GET only |
| `src/pages/api/admin/teachers/[id].ts` | `functions/v1/admin-teachers` | PATCH/DELETE by path |
| `src/pages/api/admin/teachers/import.ts` | `functions/v1/admin-teachers-import` | protected write with rate limiting |
| `src/pages/api/admin/teachers/[id]/reset-password.ts` | `functions/v1/admin-teacher-reset-password` | protected write |
| `src/pages/api/admin/settings.ts` | `functions/v1/admin-settings` | protected read/write |
| `src/pages/api/admin/audit-log.ts` | `functions/v1/admin-audit-log` | protected paginated read |
| `src/pages/api/admin/archive.ts` | `functions/v1/admin-archive` | protected archive trigger |
| `src/pages/api/archive.ts` | remove | legacy route already deprecated |
| `src/pages/api/admin/import/parse.ts` | `functions/v1/admin-import-parse` | parse CSV in Edge runtime; reject `.xlsx/.xls` in hosted Edge mode |
| `src/pages/api/public/settings.ts` | remove | replaced by direct browser reads from `admin_settings` |
| `src/pages/api/public/student-hover.ts` | remove | replaced by direct browser reads from `qualifications` |
| `src/pages/api/public/teachers/[id].ts` | remove | replaced by direct browser reads from `teachers` |
| `src/pages/api/public/class/[grade]/most-active-teacher.ts` | remove | replaced by direct browser reads from `students`, `qualifications`, and `teachers` |

Decision recorded:

- all remaining public micro-endpoints move to direct browser Supabase reads
- no Supabase Edge Functions are used for these public reads
- the Astro public routes are removed to avoid maintaining parallel public data paths

## Recommended Function Layout

Create a Supabase functions workspace:

```text
supabase/
  functions/
    _shared/
      auth.ts
      cors.ts
      env.ts
      response.ts
      rateLimit.ts
      teacherSubjects.ts
      publicSettings.ts
      importParsers.ts
    auth-admin-login/
      index.ts
    auth-teacher-login/
      index.ts
    auth-teacher-change-password/
      index.ts
    auth-teachers-list/
      index.ts
    qualifications/
      index.ts
    teacher-activity/
      index.ts
    admin-students/
      index.ts
    admin-students-import/
      index.ts
    admin-teachers/
      index.ts
    admin-teachers-import/
      index.ts
    admin-teacher-reset-password/
      index.ts
    admin-settings/
      index.ts
    admin-audit-log/
      index.ts
    admin-archive/
      index.ts
    admin-import-parse/
      index.ts
```

Use one function per business area rather than one function per verb. That keeps deployment manageable without creating one oversized function.

Decision note:

- `auth-teachers-list` stays a function, not a direct browser-to-Supabase read
- reason: it is a curated active-teacher list used by login/admin filter UX, and keeping it server-backed avoids coupling clients to raw teacher-table exposure rules

## Frontend Changes Required

### 1. Replace Astro API-relative calls

Current client code and pages assume same-origin `/api/...`.

Introduce one shared API base helper, for example:

- `PUBLIC_API_BASE_URL`
- local dev: Astro or local function gateway URL
- production: `https://<project-ref>.supabase.co/functions/v1`

Then update all admin and teacher flows to call that base explicitly.

### 2. Stop depending on Astro server rendering for live public data

These pages need to become static-safe:

- [src/pages/index.astro](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/index.astro:1)
- [src/pages/class/[grade].astro](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/class/[grade].astro:1)
- [src/pages/student/[id].astro](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/student/[id].astro:1)

Preferred approach:

- keep the Astro pages static shells
- move live data fetching into client islands or browser-side helpers
- keep archive JSON reading static where possible

### 3. Remove Node adapter dependency

After all route migration is complete:

- remove `@astrojs/node` from `package.json`
- switch [astro.config.mjs](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/astro.config.mjs:1) from hybrid to static output

Target:

```js
export default defineConfig({
  output: 'static',
  integrations: [react(), tailwind()]
});
```

## Authentication Strategy

Do not change auth behavior during migration.

Preserve current behavior:

- admin login uses `ADMIN_PASSWORD`
- teacher login uses teacher credentials from database
- signed admin and teacher session tokens remain the frontend session mechanism unless explicitly redesigned later

Implementation note:

- token signing and verification logic from [src/lib/auth.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/lib/auth.ts:1) and [src/pages/api/_auth.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/_auth.ts:1) should move into shared Edge function utilities
- browser storage behavior can stay the same initially

## Environment Variable Plan

### Frontend

Keep or add:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`
- `PUBLIC_API_BASE_URL`
- `PUBLIC_SCHOOL_NAME`

### Supabase secrets

Move server-only values to Supabase function secrets:

- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_PASSWORD`
- `JWT_SECRET`

Do not expose any of those through GitHub Pages.

## File Import Strategy

Current state:

- imports are now parsed server-side through [src/pages/api/admin/import/parse.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/pages/api/admin/import/parse.ts:1)

Target:

- move that parsing endpoint into an Edge Function
- keep browser upload flow unchanged at the UI level

Constraint:

- verify `xlsx` usage is Edge-runtime compatible in the Supabase function environment
- decision: do not rely on `xlsx` in Supabase Edge Functions for production uploads
- fallback adopted now:
  - CSV-only uploads for production
  - no ambiguous dual-mode contract for hosted Edge deployment

This is the highest-risk migration area and should be validated early.

## Public Data Strategy

Recommended data access split:

### Direct browser reads

Use the public Supabase client from [src/lib/supabase.ts](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/src/lib/supabase.ts:1) for:

- students leaderboard queries
- student detail reads
- class detail reads
- hover previews if safe

### Edge Functions

Use functions where any of these apply:

- elevated privileges
- response shaping that should not be reimplemented in many clients
- rate limiting
- sensitive filtering logic
- server-owned archive/write workflows

## Migration Phases

## Phase 1: Prepare shared abstractions

Deliverables:

- add `PUBLIC_API_BASE_URL`
- add a shared frontend API client helper
- isolate browser code from hardcoded `/api/...` assumptions
- identify page-level SSR reads that must move client-side

Acceptance:

- admin and teacher code can switch backend base URL without changing business logic

## Phase 2: Stand up Supabase functions workspace

Deliverables:

- initialize `supabase/functions`
- create `_shared` utilities
- migrate auth helpers, response helpers, rate limiter helpers

Acceptance:

- local function dev is runnable through Supabase CLI

## Phase 3: Migrate auth and protected teacher flows

Move first:

- admin login
- teacher login
- teacher password change
- teacher activity
- qualification create/delete

Why first:

- these are critical workflows
- they touch the current auth model
- they validate token handling early

Acceptance:

- `/admin` and `/teacher` fully work against Supabase functions

## Phase 4: Migrate admin CRUD and settings

Move:

- students CRUD
- teachers CRUD
- reset password
- settings
- audit log

Acceptance:

- admin dashboard works end to end without Astro API routes

## Phase 5: Migrate imports and archive flows

Move:

- import parse
- student import
- teacher import
- archive creation

Acceptance:

- sample import files still work
- archive creation still produces the same public archive behavior

## Phase 6: Convert public pages to static-safe data flow

Change:

- move runtime data fetching out of Astro request-time execution
- keep pages static and hydrate data on the client where needed
- preserve archive-year routing and locale support

Acceptance:

- `npm run build` produces a static site without Node adapter dependence

## Phase 7: Remove Astro server backend

Change:

- remove `src/pages/api/*`
- remove `@astrojs/node`
- switch to static Astro output
- update deployment docs

Acceptance:

- repo builds as static frontend
- backend behavior is entirely provided by Supabase functions

## Risks

### 1. Edge runtime compatibility

Potential trouble spots:

- `xlsx` in Supabase Edge runtime

Current decision:

- treat SheetJS/Deno compatibility as insufficient for production confidence
- keep Edge import parsing CSV-first
- allow future reconsideration only after a real Supabase Edge runtime validation passes with the sample import files
- Node-specific packages or APIs
- JWT libraries if they assume Node-only primitives

Mitigation:

- test those dependencies inside Supabase functions before broad migration
- replace incompatible packages only where needed

### 2. Public page SSR assumptions

Current public pages may still rely on request-time server logic.

Mitigation:

- migrate those pages one by one
- prefer client-side hooks/selectors instead of Astro server reads

### 3. CORS and origin configuration

GitHub Pages frontend will call Supabase functions cross-origin.

Mitigation:

- add explicit CORS handling in Edge Functions
- centralize allowed origin config

### 4. Placeholder mode drift

The repo supports placeholder mode today.

Decision:

- do not migrate placeholder mode first
- keep it working locally if cheap
- treat live Supabase mode as the primary deployment target

## Testing Plan

Before cutover, verify:

1. admin login after page refresh
2. teacher login after page refresh
3. qualification add and undo/delete flows
4. settings save
5. teacher reset password
6. student import sample
7. teacher import sample
8. audit log pagination and filters
9. archive year browsing
10. public leaderboard filters and student hover
11. locale preservation with `?lang=`

## Deployment Cutover Checklist

Frontend:

- switch Astro to static output
- build and publish `dist` to GitHub Pages
- set `PUBLIC_SUPABASE_URL`
- set `PUBLIC_SUPABASE_ANON_KEY`
- set `PUBLIC_API_BASE_URL`

Supabase:

- deploy all Edge Functions
- set secrets:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `ADMIN_PASSWORD`
  - `JWT_SECRET`
- verify CORS for GitHub Pages origin

Cleanup:

- remove legacy Astro API code
- remove Node adapter dependency
- update [README.md](/home/ruhiddin/Documents/Projects/school-leaderboard-fergana-45/README.md:1) deployment section

## Recommended Execution Order

If this migration is implemented in code, the most efficient order is:

1. introduce shared API base URL in frontend
2. migrate auth and qualification flows to Supabase functions
3. migrate admin CRUD/settings/audit
4. migrate imports and archive
5. convert public pages to static-safe data loading
6. switch Astro to static output
7. remove old Astro API routes

This order reduces risk because the protected operational flows stop depending on Astro first, while public pages can remain on the current architecture a bit longer during the transition.
