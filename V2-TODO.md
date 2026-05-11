# School Leaderboard V2 — Implementation Checklist

> **Reference:** [V2-SPEC.md](./V2-SPEC.md)
> When every checkbox below is checked, the project fully meets the V2 specification.

---

## Phase 7: Schema Migration & Foundation

### 7.1 Database Schema Changes
- [x] Write `schema-v2.sql` migration file
- [x] Create `teachers` table (id, full_name, subjects[], password_hash, is_password_changed, is_active, created_at, updated_at)
- [x] Create `admin_settings` table (id=1, school_name, admin_password_hash, available_sections[], current_academic_year, updated_at)
- [x] Create `audit_log` table (id, actor_type, actor_id, action, target_type, target_id, details JSONB, created_at)
- [x] Alter `students`: rename `name` → `full_name`
- [x] Alter `students`: add `section` TEXT column (nullable)
- [x] Alter `students`: add `is_active` BOOLEAN column (default true)
- [x] Alter `qualifications`: add `teacher_id` UUID column (FK → teachers, nullable for legacy data)
- [x] Update `live_ranking` view to include `section`, `recent_activity_count`, filter by `is_active = true`
- [x] Add RLS policies for new tables (audit_log: append-only, no update/delete for anon)
- [x] Add RLS policies for teachers table (read for auth, write via service_role)
- [x] Add RLS policies for admin_settings (read for auth, write via service_role)
- [x] Seed `admin_settings` row with id=1 and defaults from env vars

### 7.2 TypeScript Types
- [x] Add `Teacher` interface (id, full_name, subjects, is_password_changed, is_active, created_at, updated_at)
- [x] Add `AdminSettings` interface (school_name, available_sections, current_academic_year)
- [x] Add `AuditLogEntry` interface (id, actor_type, actor_id, action, target_type, target_id, details, created_at)
- [x] Update `StudentDetail` interface: `name` → `full_name`, add `section`, `is_active`
- [x] Update `StudentRank` interface: add `section`, `recent_activity_count`
- [x] Update `Qualification` interface: add `teacher_id`
- [x] Add `AuthToken` type with `role: 'admin' | 'teacher'` and optional `teacher_id`
- [x] Add `Badge` type enum: `hot_streak`, `top_performer`, `all_rounder`, `rising_star`, `new_student`

### 7.3 Mock Data Update
- [x] Update `mockData.ts` to match V2 schema (sections, teacher_id on qualifications, full_name)
- [x] Add mock teachers array
- [x] Add mock audit_log entries
- [x] Add mock admin_settings

### 7.4 Supabase Client Update
- [x] Update `supabase.ts` to handle V2 tables
- [x] Ensure mock/placeholder mode works with V2 schema

### 7.5 Install New Dependencies
- [x] Install `xlsx` (SheetJS) for Excel parsing
- [x] Install `bcryptjs` for password hashing (server-side)

---

## Phase 8: Auth System Refactor

### 8.1 Auth Library (`src/lib/auth.ts`)
- [x] Create `createToken(payload: { role, teacher_id? })` → signed JWT with 24h TTL
- [x] Create `verifyToken(token)` → decoded payload or null
- [x] Create `requireRole(request, role: 'admin' | 'teacher')` → middleware helper that validates token and role
- [x] Create `hashPassword(plain)` → bcrypt hash (cost 10)
- [x] Create `verifyPassword(plain, hash)` → boolean (timing-safe)

### 8.2 Admin Auth API
- [x] Create `POST /api/auth/admin/login` endpoint
  - [x] Accept `{ password }` body
  - [x] Compare against `admin_settings.admin_password_hash` (or `ADMIN_PASSWORD` env fallback on first boot)
  - [x] On first boot: hash `ADMIN_PASSWORD` env and store in `admin_settings`
  - [x] Return `{ token }` with `role: 'admin'`
  - [x] Rate limit: 5 attempts/min per IP
  - [x] Write `audit_log` entry for login

### 8.3 Teacher Auth API
- [x] Create `POST /api/auth/teacher/login` endpoint
  - [x] Accept `{ teacher_id, password }` body
  - [x] Look up teacher by id, verify `is_active = true`
  - [x] Compare password against `password_hash` with bcrypt
  - [x] Return `{ token, teacher: { id, full_name, subjects, is_password_changed } }`
  - [x] Rate limit: 5 attempts/min per IP
  - [x] Write `audit_log` entry for login

### 8.4 Teacher Password Change API
- [x] Create `POST /api/auth/teacher/change-password` endpoint
  - [x] Require teacher auth token
  - [x] Accept `{ old_password, new_password }` body
  - [x] Verify old_password against current hash
  - [x] Validate new_password (min 6 chars)
  - [x] Update `password_hash`, set `is_password_changed = true`, update `updated_at`
  - [x] Write `audit_log` entry for `teacher.password_change`

### 8.5 Public Teacher List API
- [x] Create `GET /api/auth/teachers/list` endpoint (public, no auth)
  - [x] Return `[{ id, full_name }]` for all active teachers (no password data)
  - [x] Used by teacher login dropdown

### 8.6 Remove V1 Auth
- [x] Remove old `POST /api/auth/login` single-password endpoint
- [x] Remove `TEACHER_PORTAL_PASSWORD` env var references
- [x] Update `.env.example` with `ADMIN_PASSWORD` instead

---

## Phase 9: Admin Panel

### 9.1 Admin Login Page
- [x] Create `/admin/index.astro` (SSR, prerender=false)
- [x] Build `AdminLogin.tsx` component
  - [x] Single password field + "Sign In" button
  - [x] Error handling (wrong password, rate limited)
  - [x] On success: store admin token in localStorage, redirect to `/admin/dashboard`
  - [x] "← Back to Leaderboard" link

### 9.2 Admin Dashboard Shell
- [x] Create `/admin/dashboard.astro` (SSR, prerender=false)
- [x] Build `AdminDashboard.tsx` component
  - [x] Auth guard: check admin token on mount, redirect to `/admin` if invalid
  - [x] Tab navigation: Students | Teachers | Activity Log | Settings
  - [x] Header with school name, "Logout" button, "View Leaderboard" link
  - [x] Tab state management (URL hash or React state)

### 9.3 Excel Importer (Reusable Component)
- [x] Build `ExcelImporter.tsx` — generic, reusable for both students and teachers
  - [x] File picker accepting `.xlsx`, `.xls`, `.csv`
  - [x] Client-side parsing with SheetJS (`xlsx` library)
  - [x] Column mapping / validation (required columns check)
  - [x] Preview table showing parsed rows with validation status
  - [x] Summary: "X new, Y duplicates skipped, Z errors"
  - [x] "Confirm Import" button → calls parent callback with parsed data
  - [x] "Download Template" button → generates and downloads template `.xlsx`

### 9.4 Students Tab
- [x] Build `StudentsTable.tsx` component
  - [x] Fetch all students from `GET /api/admin/students`
  - [x] Sortable columns: Name, Grade-Section, Gender, Total Score, Status
  - [x] Filter: by grade, section, active/inactive status
  - [x] Search box for name filtering
  - [x] Inline edit mode for name, grade, section, gender → `PUT /api/admin/students/:id`
  - [x] "Deactivate" / "Activate" toggle → `DELETE /api/admin/students/:id` (soft-delete)
  - [x] "Import Students" button → opens ExcelImporter modal
  - [x] Import confirmation → `POST /api/admin/students/import`
  - [x] "Download Template" link in import modal

### 9.5 Students Admin API
- [x] Create `GET /api/admin/students` — list all students (active & inactive), require admin auth
- [x] Create `POST /api/admin/students/import` — bulk insert students from parsed Excel JSON
  - [x] Validate each row (full_name required, gender enum, grade 1-11, section optional)
  - [x] Skip duplicates (same full_name + grade + section)
  - [x] Return `{ created: N, skipped: N, errors: [...] }`
  - [x] Write `audit_log` entry for `student.import` with count
- [x] Create `PUT /api/admin/students/[id]` — edit single student fields
  - [x] Write `audit_log` entry for `student.update`
- [x] Create `DELETE /api/admin/students/[id]` — set `is_active = false`
  - [x] Write `audit_log` entry for `student.deactivate`

### 9.6 Teachers Tab
- [x] Build `TeachersTable.tsx` component
  - [x] Fetch all teachers from `GET /api/admin/teachers`
  - [x] Columns: Name, Subjects, Password Changed?, Status, Actions
  - [x] Inline edit for name, subjects
  - [x] "Reset Password" action → prompt for new default password → `POST /api/admin/teachers/:id/reset-password`
  - [x] "Deactivate" / "Activate" toggle
  - [x] "Import Teachers" button → opens ExcelImporter modal
  - [x] Import confirmation → `POST /api/admin/teachers/import`

### 9.7 Teachers Admin API
- [x] Create `GET /api/admin/teachers` — list all teachers, require admin auth
- [x] Create `POST /api/admin/teachers/import` — bulk insert/update teachers
  - [x] Parse subjects from comma-separated string into array
  - [x] Hash each default_password with bcrypt server-side
  - [x] If teacher with same full_name exists: update subjects + reset password
  - [x] New teachers: create with `is_password_changed = false`
  - [x] Return `{ created: N, updated: N, errors: [...] }`
  - [x] Write `audit_log` entries
- [x] Create `PUT /api/admin/teachers/[id]` — edit teacher name/subjects
  - [x] Write `audit_log` entry
- [x] Create `POST /api/admin/teachers/[id]/reset-password` — reset password to new default
  - [x] Accept `{ new_password }`, hash with bcrypt
  - [x] Set `is_password_changed = false`
  - [x] Write `audit_log` entry
- [x] Create `DELETE /api/admin/teachers/[id]` — set `is_active = false`
  - [x] Write `audit_log` entry

### 9.8 Activity Log Tab
- [x] Build `AuditLog.tsx` component
  - [x] Fetch from `GET /api/admin/audit-log`
  - [x] Filters: by teacher (dropdown), by action type (dropdown), by date range (date pickers)
  - [x] Paginated table: Timestamp, Actor, Action, Target, Details summary
  - [x] Click row to expand and see full `details` JSON formatted
  - [x] Auto-refresh or manual refresh button

### 9.9 Audit Log API
- [x] Create `GET /api/admin/audit-log` — require admin auth
  - [x] Query params: `teacher_id`, `action`, `from_date`, `to_date`, `page`, `per_page`
  - [x] Join with teachers table to return `actor_name`
  - [x] Return paginated results with total count

### 9.10 Settings Tab
- [x] Build `SettingsForm.tsx` component
  - [x] Fetch current settings from `GET /api/admin/settings`
  - [x] Editable fields: school_name, available_sections, current_academic_year
  - [x] "Change Admin Password" section (new password + confirm)
  - [x] Save button → `PUT /api/admin/settings`
  - [x] Success/error toast notifications

### 9.11 Settings API
- [x] Create `GET /api/admin/settings` — require admin auth, return admin_settings row
- [x] Create `PUT /api/admin/settings` — update settings
  - [x] If `new_password` provided: hash and update `admin_password_hash`
  - [x] Write `audit_log` entry for `settings.update`

### 9.12 Archive (Moved from Teacher)
- [x] Move "New Session" UI from TeacherDashboard to admin Settings or dedicated section
- [x] Create `POST /api/admin/archive` — require admin auth
  - [x] Same archive logic as V1 (snapshot JSON, wipe qualifications, promote grades)
  - [x] Write `audit_log` entry for `archive.create`
- [x] Remove archive controls from teacher dashboard

### 9.13 Excel Templates
- [x] Generate `students_template.xlsx` with headers: full_name, gender, grade, section
- [x] Generate `teachers_template.xlsx` with headers: full_name, subjects, default_password
- [x] Serve templates as downloadable files from admin panel (or generate on the fly)

---

## Phase 10: Teacher Portal V2

### 10.1 Teacher Login Page
- [x] Redesign `/teacher/index.astro` for V2 login flow
- [x] Build `TeacherLogin.tsx` component
  - [x] Step 1: Searchable dropdown to select teacher name (fetch from `/api/auth/teachers/list`)
  - [x] Step 2: Password input (shown after teacher selected)
  - [x] "Sign In" button → `POST /api/auth/teacher/login`
  - [x] Error states: wrong password, account deactivated, rate limited
  - [x] On success: store token + teacher profile in localStorage
  - [x] If `is_password_changed = false`: show "Change Password" modal before dashboard

### 10.2 Change Password Modal
- [x] Build `ChangePasswordModal.tsx`
  - [x] Fields: old password, new password, confirm new password
  - [x] Client-side validation: passwords match, min 6 chars
  - [x] Submit → `POST /api/auth/teacher/change-password`
  - [x] On success: update localStorage token, dismiss modal, show success toast
  - [x] "Skip for now" / dismiss button (modal reappears next login)

### 10.3 Teacher Dashboard Refactor
- [x] Refactor `TeacherDashboard.tsx` for V2
  - [x] Auth guard: check teacher token on mount, redirect to `/teacher` if invalid
  - [x] Display logged-in teacher name in header
  - [x] "My Profile" menu (top-right): show name, subjects, "Change Password" action
  - [x] "Logout" button → clear token, redirect to `/teacher`
  - [x] "View Leaderboard" link

### 10.4 Qualification Form Updates
- [x] Attach `teacher_id` from token to every qualification POST
- [x] Pre-populate subject dropdown with teacher's `subjects[]` array
  - [x] Teacher's subjects shown first, then separator, then "General" and "Other"
- [x] Update `POST /api/qualifications` to require teacher auth (not admin)
- [x] Update `POST /api/qualifications` to extract `teacher_id` from token and attach to row
- [x] Write `audit_log` entry for `qualification.create`

### 10.5 My Activity Section
- [x] Build `MyActivity.tsx` component
  - [x] Fetch from `GET /api/teacher/activity` (teacher auth, returns own qualifications)
  - [x] Display last 50 entries: student name, value (+/-), category, subject, date, note
  - [x] Color-code: positive green, negative red
  - [x] Undo button on recent entries (60s window, same as V1)
  - [x] Undo scoped to `teacher_id` match only

### 10.6 Teacher Activity API
- [x] Create `GET /api/teacher/activity` — require teacher auth
  - [x] Return last 50 qualifications where `teacher_id` = token's teacher_id
  - [x] Join with students to include student name
  - [x] Order by `created_at DESC`

### 10.7 Undo Scoping
- [x] Update `DELETE /api/qualifications/[id]` to verify `teacher_id` matches token
- [x] Update `DELETE /api/qualifications/[id]` to require teacher auth (not admin)
- [x] Write `audit_log` entry for `qualification.delete`

### 10.8 Remove V1 Teacher Auth
- [x] Remove old single-password `TeacherPortal.tsx` login component
- [x] Remove old `POST /api/auth/login` route (replaced in Phase 8)

---

## Phase 11: Leaderboard V2 — Richer UI

### 11.1 Grade-Section Display
- [x] Create `formatGradeSection(grade: number, section?: string)` utility → `"5-A"` or `"5"`
- [x] Update all grade displays across leaderboard, student detail, class page, teacher dashboard
- [x] Render grade-section as a colored pill/badge in leaderboard rows

### 11.2 Badge System
- [x] Create `src/lib/badges.ts` with badge computation functions
  - [x] `isHotStreak(qualifications)` → 3+ consecutive days with positive value
  - [x] `isTopPerformer(student, allStudentsInClass)` → highest total_score in grade+section
  - [x] `isAllRounder(student)` → all 4 category scores > 0
  - [x] `isRisingStar(currentRank, rankSevenDaysAgo)` → improved 5+ positions
  - [x] `isNewStudent(createdAt)` → within last 7 days
  - [x] `computeBadges(student, context)` → returns array of badge types
- [x] Build `BadgePill.tsx` component
  - [x] Accepts badge type, renders emoji + label in a small colored pill
  - [x] Tooltip on hover with badge description
  - [x] Compact mode (emoji only) for leaderboard rows
  - [x] Full mode (emoji + text + description) for student detail page

### 11.3 Category Mini-Bars
- [x] Build `CategoryMiniBar.tsx` component
  - [x] Accepts 4 category scores
  - [x] Renders a thin stacked horizontal bar with 4 color-coded segments
  - [x] Colors: Academic=blue, Behavior=green, Extracurricular=purple, Attendance=amber
  - [x] Tooltip showing individual values on hover
  - [x] Graceful handling of zero/negative scores

### 11.4 Rank Delta Chip
- [x] Build `RankDeltaChip.tsx` component
  - [x] Accepts `delta` number (positive = moved up, negative = moved down, 0 = no change)
  - [x] Renders: `↑3` green pill, `↓2` red pill, or `—` gray pill
  - [x] Compute rank delta: compare current rank to rank 7 days ago
- [x] Add rank delta computation to leaderboard data fetching
  - [x] Store or compute "rank 7 days ago" by querying qualifications with date filter

### 11.5 Filter Bar Enhancements
- [x] Extract `FilterBar.tsx` as a separate component from Leaderboard
- [x] Add section sub-filter (appears when a grade is selected)
  - [x] Populate sections from `admin_settings.available_sections` or unique sections in data
- [x] Add search box for quick name filtering
  - [x] Debounced input, filters student list client-side
  - [x] Highlight matching text in student names
- [x] Add "My Class" quick filter button (visible only if teacher is logged in)
- [x] Add view toggle: "List" (default) / "Cards" (compact card grid)

### 11.6 Podium Enhancements
- [x] Extract `Podium.tsx` as a separate component
- [x] Add score breakdown mini-bar inside each podium card
- [x] Add streak flame 🔥 icon on podium cards for students with hot streak
- [x] Replace trophy icon with crown 👑 on #1 card
- [x] Add confetti animation on first page load for #1 student
  - [x] Use `canvas-confetti` or similar lightweight library
  - [x] Only fires once per page visit (sessionStorage flag)

### 11.7 Student Row Enhancements
- [x] Extract `StudentRow.tsx` as a separate component
- [x] Add badge pills after student name (compact mode — emoji only)
- [x] Add category mini-bar after score
- [x] Replace trend arrow with rank delta chip (↑3 / ↓2)
- [x] Color-code score: positive=green, zero=gray, negative=red
- [x] Add score number ticker animation on filter change (count up/down)

### 11.8 Compact Cards View
- [x] Build `StudentCard.tsx` — card version of a student row
  - [x] Avatar, name, grade-section pill, score, badges, mini-bar
  - [x] Grid layout: 2 cols on mobile, 3 on tablet, 4 on desktop
- [x] Wire view toggle in FilterBar to switch between List and Cards view

### 11.9 Animations & Micro-interactions
- [x] Add rank change flash: briefly highlight row green (moved up) or red (moved down) on data refresh
- [x] Add hover card preview on desktop: floating card with radar chart + recent activity on row hover
  - [x] Delay 500ms before showing, dismiss on mouse leave
  - [x] Lazy-load radar chart data on hover

---

## Phase 12: Detail Pages V2

### 12.1 Student Detail Page Updates
- [x] Display grade-section in header: "Grade 5-A"
- [x] Add "Ranked #X in Grade Y-Z" contextual ranking
- [x] Add badges section with full badge pills (emoji + name + description)
- [x] Add "Given by: [Teacher Name]" on each milestone entry
- [x] Add full activity feed section below milestones
  - [x] Show ALL qualifications (not just +3), paginated or scrollable
  - [x] Each row: date, category, subject, value (+/-), teacher name, note
  - [x] Sortable by date (default: newest first)
  - [x] Color-coded value chips

### 12.2 Class/Section Page Updates
- [x] Update routing: `/class/[gradeSection]` to handle `5-A` and `5` formats
  - [x] Parse URL param: split on `-` to get grade and optional section
- [x] Add section tabs when grade has multiple sections: `All | A | B | C`
  - [x] Tab switching filters the student list
- [x] Update class stats to include section breakdown in comparison charts
- [x] Add "Most active teacher" for this class (teacher with most qualifications issued)
  - [x] Join qualifications with teachers, count per teacher, display top one

---

## Phase 13: Environment & Configuration

### 13.1 Environment Variables
- [x] Add `ADMIN_PASSWORD` to `.env` and `.env.example`
- [x] Add `PUBLIC_SCHOOL_NAME` to `.env.example` (fallback for school name)
- [x] Remove `TEACHER_PORTAL_PASSWORD` from `.env` and `.env.example`
- [x] Update CI workflow env vars (replace TEACHER_PORTAL_PASSWORD with ADMIN_PASSWORD)

### 13.2 School Name in UI
- [x] Update `Layout.astro` to use school name from `admin_settings` (or env fallback) in `<title>` and header
- [x] Pass school name as a prop or fetch it client-side from a public endpoint
- [x] Create `GET /api/public/settings` — unauthenticated, returns `{ school_name, current_academic_year }`

---

## Phase 14: Security Hardening

### 14.1 Token Scoping
- [x] Admin tokens can only access `/api/admin/*` and `/api/auth/admin/*` routes
- [x] Teacher tokens can only access `/api/qualifications`, `/api/teacher/*`, `/api/auth/teacher/*` routes
- [x] Create shared `authMiddleware(request, allowedRoles[])` used by all protected endpoints
- [x] Return 401 for missing token, 403 for wrong role

### 14.2 Audit Log Immutability
- [x] Ensure `audit_log` has NO update or delete RLS policies
- [x] Only `INSERT` allowed via service_role
- [x] No API endpoint exposes delete/update for audit_log

### 14.3 Rate Limiting
- [x] Login endpoints: 5 attempts/min per IP (admin + teacher)
- [x] Qualification endpoints: 1 write/sec per teacher (maintained from V1)
- [x] Import endpoints: 1 import/min per admin session

### 14.4 Password Validation
- [x] Minimum 6 characters for all passwords
- [x] bcrypt cost factor ≥ 10
- [x] Never return password hashes in any API response
- [x] Never log passwords in audit_log details

---

## Phase 15: Polish & Production Readiness

### 15.1 Responsive Design
- [x] Admin panel responsive on tablet (768px+) — usable but not necessarily optimized for phone
- [x] Teacher dashboard responsive on tablet and phone
- [x] Leaderboard responsive on all viewports (verified in V1, re-verify with V2 additions)
- [x] Excel import modal usable on tablet

### 15.2 Error & Empty States
- [x] Admin: empty states for "No students yet", "No teachers yet", "No activity yet"
- [x] Teacher: empty state for "No recent activity"
- [x] Leaderboard: empty state when no active students exist
- [x] Import: clear error messages for malformed Excel files
- [x] Auth: clear error messages for wrong password, deactivated account, expired token

### 15.3 Loading States
- [x] Skeleton loaders for admin data tables while fetching
- [x] Loading spinner for Excel import processing
- [x] Loading state for leaderboard badge computation

### 15.4 Toast Notifications
- [x] Success toasts: import complete, settings saved, password changed, qualification added
- [x] Error toasts: import failed, save failed, undo expired
- [x] Use a lightweight toast library or build a simple toast component

### 15.5 Performance
- [x] Test with 200+ students and 5+ teachers — verify leaderboard loads < 2s
- [x] Test badge computation performance with large datasets
- [x] Lazy-load hover card preview data (don't fetch radar chart until hover)
- [x] Paginate audit log (50 per page)

### 15.6 Accessibility
- [x] Keyboard navigation for admin tables, filter bar, tabs
- [x] ARIA labels on interactive elements (buttons, dropdowns, modals)
- [x] Color contrast compliance (WCAG AA) for badge pills and score colors
- [x] Screen reader text for emoji badges

### 15.7 Testing
- [x] End-to-end: Admin login → import students Excel → verify students appear in table
- [x] End-to-end: Admin import teachers → teacher login → add qualification → verify on leaderboard
- [x] End-to-end: Teacher change password → logout → login with new password
- [x] End-to-end: Teacher undo → verify scoped to own qualifications only
- [x] End-to-end: Admin audit log → verify all actions appear with correct details
- [x] End-to-end: Archive flow from admin panel → verify data archived, grades promoted
- [x] Cross-browser: Chrome, Firefox, Safari (leaderboard + admin + teacher)
- [x] Mobile responsive: test on 375px, 768px, 1280px

### 15.8 Documentation
- [x] Update `README.md` with V2 setup instructions
- [x] Update `PROJECT-SPEC.md` to reference V2-SPEC
- [x] Update `.env.example` with all V2 variables
- [x] Document Excel template formats in README
- [x] Add "First Boot" guide: set ADMIN_PASSWORD → login → import data

---

## Summary Counts

| Phase | Items | Description |
|-------|-------|-------------|
| 7 | 22 | Schema, types, mock data, dependencies |
| 8 | 18 | Auth system (admin login, teacher login, password change) |
| 9 | 38 | Admin panel (dashboard, students, teachers, audit, settings, archive) |
| 10 | 22 | Teacher portal V2 (login, dashboard, activity, undo scoping) |
| 11 | 30 | Leaderboard V2 (badges, mini-bars, rank delta, filters, podium, cards) |
| 12 | 10 | Detail pages (student, class/section) |
| 13 | 5 | Environment & config |
| 14 | 10 | Security hardening |
| 15 | 25 | Polish, testing, docs |
| **Total** | **~180** | — |
