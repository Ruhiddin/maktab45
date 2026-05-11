# School Leaderboard V2 — Master Specification

> **Status:** Draft
> **Supersedes:** `PROJECT-SPEC.md` (V1)
> **Goal:** Transform the prototype into a production-grade, multi-teacher, admin-managed school platform with rich visual engagement and real data workflows.

---

## 1. What Changes from V1

| Area | V1 (current) | V2 (this spec) |
|------|-------------|----------------|
| Grades | Integer `1`–`11` | Composite `grade` + `section` → `"5-A"`, `"5-B"` |
| Teachers | Single shared password | Named teacher accounts with individual passwords |
| Admin | None | School administrator panel with Excel import |
| Students | Hard-seeded or mock | Imported via Excel by admin |
| Audit trail | None — fire-and-forget | Every teacher action logged, browsable |
| Leaderboard | Rank + score + trend arrow | Badges, streak pills, category mini-bars, rank-change delta |
| Auth | One token type | Role-based: `admin` or `teacher` (with profile selection) |

---

## 2. Data Schema (V2)

### 2.1 `teachers` (NEW)

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | `gen_random_uuid()` | Primary Key |
| `full_name` | TEXT | — | Display name (e.g. "Gulnora Karimova") |
| `subjects` | TEXT[] | `'{}'` | Array of subjects they teach: `{"Math","Physics"}` |
| `password_hash` | TEXT | — | bcrypt hash of current password |
| `is_password_changed` | BOOLEAN | `false` | `true` after teacher changes the default |
| `is_active` | BOOLEAN | `true` | Soft-delete flag |
| `created_at` | TIMESTAMPTZ | `now()` | — |
| `updated_at` | TIMESTAMPTZ | `now()` | Last profile edit |

> **Login flow:** Admin imports teachers with a default password (plaintext in Excel, hashed on import). Teacher logs in by **selecting their name** from a list and entering that password. After first login the UI nudges them to change it.

### 2.2 `students` (MODIFIED)

| Column | Type | Change | Description |
|--------|------|--------|-------------|
| `id` | UUID | — | Primary Key |
| `full_name` | TEXT | renamed from `name` | Full name |
| `gender` | ENUM | — | `male`, `female` |
| `grade` | INTEGER | — | Numeric part: 1–11 |
| `section` | TEXT | **NEW** | Letter part: `"A"`, `"B"`, `"C"`, … (nullable for schools without parallels) |
| `avatar_url` | TEXT | — | Profile image path |
| `is_active` | BOOLEAN | **NEW** | `false` for graduated / removed students |
| `created_at` | TIMESTAMPTZ | — | — |

Display convention: when `section` is non-null, show grade as **"5-A"**; when null, show **"5"**.

### 2.3 `qualifications` (MODIFIED)

| Column | Type | Change | Description |
|--------|------|--------|-------------|
| `id` | UUID | — | Primary Key |
| `student_id` | UUID | — | FK → `students` |
| `teacher_id` | UUID | **NEW** | FK → `teachers` — who issued this |
| `category` | ENUM | — | `Academic`, `Behavior`, `Extracurricular`, `Attendance` |
| `subject` | TEXT | — | e.g. "Math", "General" |
| `value` | INTEGER | — | −5 to +5 |
| `teacher_note` | TEXT | — | Optional reason |
| `created_at` | TIMESTAMPTZ | — | — |

### 2.4 `admin_settings` (NEW — single-row config)

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Always `1` |
| `school_name` | TEXT | Displayed in header and SEO |
| `admin_password_hash` | TEXT | bcrypt hash — set via env on first boot or in-panel |
| `available_sections` | TEXT[] | `{"A","B","C","D"}` — letters offered in grade filter |
| `current_academic_year` | TEXT | e.g. `"2025-2026"` |
| `updated_at` | TIMESTAMPTZ | — |

### 2.5 `audit_log` (NEW)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary Key |
| `actor_type` | ENUM | `admin`, `teacher` |
| `actor_id` | UUID | NULL for admin, FK → `teachers` for teacher |
| `action` | TEXT | Machine-readable: `qualification.create`, `qualification.delete`, `student.import`, `teacher.create`, `teacher.password_change`, `archive.create` |
| `target_type` | TEXT | `student`, `teacher`, `qualification`, `archive` |
| `target_id` | UUID | The affected row |
| `details` | JSONB | Arbitrary context: `{"value":3,"category":"Academic","student_name":"Ali"}` |
| `created_at` | TIMESTAMPTZ | — |

### 2.6 `live_ranking` (VIEW — MODIFIED)

```sql
CREATE OR REPLACE VIEW public.live_ranking AS
SELECT
    s.id        AS student_id,
    s.full_name AS name,
    s.gender,
    s.grade,
    s.section,
    s.avatar_url,
    COALESCE(SUM(q.value), 0)                                                    AS total_score,
    COALESCE(SUM(CASE WHEN q.category = 'Academic'        THEN q.value ELSE 0 END), 0) AS academic_score,
    COALESCE(SUM(CASE WHEN q.category = 'Behavior'        THEN q.value ELSE 0 END), 0) AS behavior_score,
    COALESCE(SUM(CASE WHEN q.category = 'Extracurricular'  THEN q.value ELSE 0 END), 0) AS extracurricular_score,
    COALESCE(SUM(CASE WHEN q.category = 'Attendance'       THEN q.value ELSE 0 END), 0) AS attendance_score,
    -- Streak: consecutive days with at least one positive qualification
    -- (computed in app layer, not SQL — placeholder column)
    0 AS current_streak,
    -- Count of qualifications in last 7 days for "hot" badge
    COALESCE(COUNT(q.id) FILTER (WHERE q.created_at >= NOW() - INTERVAL '7 days'), 0) AS recent_activity_count
FROM
    public.students s
LEFT JOIN
    public.qualifications q ON s.id = q.student_id
WHERE
    s.is_active = true
GROUP BY
    s.id, s.full_name, s.gender, s.grade, s.section, s.avatar_url;
```

---

## 3. Roles & Authentication

### 3.1 Admin

- **Login:** Navigate to `/admin` → enter the admin password.
- **Password source:** `ADMIN_PASSWORD` env variable (hashed and stored in `admin_settings` on first boot). Can be changed in-panel.
- **Session:** Server-issued token with `role: 'admin'`, stored in `localStorage`, 24h TTL.
- **Capabilities:**
  - Import / edit / deactivate **students** (Excel upload or in-site table editor)
  - Import / edit / deactivate **teachers** (Excel upload or in-site table editor)
  - Reset a teacher's password back to a new default
  - View full **audit log** (filterable by teacher, action type, date range)
  - Trigger **New Session** (archive + grade promotion)
  - Edit school settings (name, sections, academic year)

### 3.2 Teacher

- **Login:** Navigate to `/teacher` → **select name from a dropdown** → enter password.
- **First login:** Default password set by admin during import. After successful login, if `is_password_changed = false`, show a modal/banner prompting password change.
- **Password change:** Available in a "My Profile" section of the teacher dashboard.
- **Session:** Server-issued token with `role: 'teacher'` + `teacher_id`, stored in `localStorage`, 24h TTL.
- **Capabilities:**
  - Add / undo qualifications (scoped to their `subjects` or "General")
  - View their own recent activity log
  - Change their own password
  - View leaderboard (link from dashboard)

---

## 4. Excel Import Format

### 4.1 Students Import

Minimum viable spreadsheet — one sheet, one row per student:

| Column | Header | Required | Notes |
|--------|--------|----------|-------|
| A | `full_name` | ✅ | Student's full name |
| B | `gender` | ✅ | `male` or `female` (case-insensitive) |
| C | `grade` | ✅ | Integer 1–11 |
| D | `section` | ❌ | Letter: `A`, `B`, `C`, … Leave blank if no parallels |

**Behavior on import:**
- Trim whitespace, normalize case.
- Skip rows where `full_name` is empty.
- If a student with the same `full_name` + `grade` + `section` already exists, **skip** (no duplicates).
- New students get `is_active = true`, `avatar_url = null`.
- Show a preview table before confirming: "X new students will be added, Y skipped as duplicates."

### 4.2 Teachers Import

| Column | Header | Required | Notes |
|--------|--------|----------|-------|
| A | `full_name` | ✅ | Teacher's full name |
| B | `subjects` | ✅ | Comma-separated: `"Math, Physics"` |
| C | `default_password` | ✅ | Plaintext — will be bcrypt-hashed on import |

**Behavior on import:**
- If teacher with same `full_name` exists, **update** subjects and reset password.
- Parse `subjects` by splitting on `,` and trimming.
- Hash `default_password` server-side with bcrypt.
- Set `is_password_changed = false`.

---

## 5. The Admin Panel (`/admin`)

### 5.1 Admin Login

- Separate login page at `/admin`.
- Single password field (no username — there's one admin per school).
- After login, redirect to `/admin/dashboard`.

### 5.2 Admin Dashboard — Tabs/Sections

#### A. Students Tab

- **Data table:** Sortable, filterable list of all students (active & inactive).
  - Columns: Name, Grade-Section, Gender, Total Score, Status, Actions.
  - Inline edit for name, grade, section, gender.
  - "Deactivate" button (soft-delete: `is_active = false`).
- **Import button:** Opens a modal:
  1. File picker (`.xlsx`, `.xls`, `.csv`).
  2. Parse client-side (using SheetJS / `xlsx` library).
  3. Preview table: "These N students will be added."
  4. Confirm → POST to `/api/admin/students/import`.

#### B. Teachers Tab

- **Data table:** List of all teachers.
  - Columns: Name, Subjects, Password Changed?, Status, Actions.
  - Inline edit for name, subjects.
  - "Reset Password" action → generates a new default, sets `is_password_changed = false`.
  - "Deactivate" to revoke access.
- **Import button:** Same flow as students — upload Excel, preview, confirm.

#### C. Activity Log Tab

- **Full audit log:** All actions across all teachers and admin.
- **Filters:** By teacher, by action type (`qualification.create`, `qualification.delete`, etc.), by date range.
- **Columns:** Timestamp, Actor (admin / teacher name), Action, Target, Details.
- Clicking a row expands to show full `details` JSON in a readable format.

#### D. Settings Tab

- Edit school name (reflected in site header + SEO `<title>`).
- Edit available grade sections (`A`, `B`, `C`, …).
- Edit current academic year label.
- Change admin password.

#### E. New Session (Archive)

- Same archive flow as V1, but triggered from admin panel (not teacher dashboard).
- Only admin can archive — remove from teacher dashboard.

---

## 6. The Teacher Portal (`/teacher`) — V2

### 6.1 Login Flow (changed)

1. Teacher navigates to `/teacher`.
2. **Step 1:** Select their name from a searchable dropdown (populated from `teachers` table, `is_active = true`).
3. **Step 2:** Enter password.
4. **On success:** If `is_password_changed = false`, show a **"Change your default password"** modal. They can dismiss it, but it reappears every login until changed.
5. Redirect to `/teacher/dashboard`.

### 6.2 Teacher Dashboard

Same qualification workflow as V1 (search student → stepper → submit), with additions:

- **My Profile** section (collapsible sidebar or top-right menu):
  - View: name, subjects.
  - Action: Change password (old password + new password + confirm).
- **My Activity** section:
  - Recent qualifications they've issued (last 50).
  - Each entry: student name, value, category, subject, date, note.
  - Undo button (60s window, same as V1).
- **Subject filter:** When selecting a subject in the form, default to the teacher's own subjects (pre-populated dropdown), with "General" and "Other" always available.

### 6.3 Qualification Attribution

Every qualification now carries `teacher_id`. This enables:
- Audit trail per teacher.
- "Given by: [Teacher Name]" display on student detail pages.
- Admin can see which teacher issued what.

---

## 7. The Leaderboard — V2 (Richer UI)

### 7.1 Podium (Top 3 — Enhanced)

Current: Gold/Silver/Bronze gradient cards with name + score.

**V2 additions:**
- **Animated confetti / particle burst** on first load for the #1 student.
- **"Crown" icon** on #1 instead of trophy.
- **Score breakdown mini-bar** inside each podium card: 4 thin horizontal bars (Academic / Behavior / Extracurricular / Attendance) showing proportional contribution.
- **Streak flame 🔥** if the student has 3+ consecutive days of positive qualifications.

### 7.2 Student Row (Rank 4+) — Enhanced

Current: Rank # | Avatar + Name | Grade | Score | Trend arrow.

**V2 additions per row:**

| Element | Description |
|---------|-------------|
| **Rank delta chip** | Instead of just ↑/↓, show `↑3` or `↓2` — how many positions they moved in the last 7 days. Green chip for up, red for down, gray "—" for no change. |
| **Category mini-bars** | 4 tiny inline progress bars (or a single stacked bar) showing Academic / Behavior / Extracurricular / Attendance proportions. Color-coded. Gives at-a-glance "balance" without clicking into the profile. |
| **Badge pills** | Small colored pills next to the student name: |
| | 🔥 **Hot Streak** — 3+ consecutive days with points |
| | ⭐ **Top Performer** — Highest in their grade-section |
| | 🏆 **All-Rounder** — All 4 categories above 0 |
| | 📈 **Rising Star** — Moved up 5+ ranks in last 7 days |
| | 🆕 **New** — Added to leaderboard in the last 7 days |
| **Grade-Section pill** | Show `5-A` as a pill/badge instead of just "5". Clicking navigates to class page. |
| **Score with +/- coloring** | Positive scores in green, zero in gray, negative in red. Bold and large. |

### 7.3 Filter Bar — Enhanced

**V2 additions:**
- **Section filter:** When a grade is selected, show section sub-filter (`A`, `B`, `C`, …).
- **"My Class" quick filter** (if teacher is logged in): auto-filter to a specific grade-section.
- **Search box:** Quick name search that highlights matching rows in the list.
- **View toggle:** Switch between "Full List" and "Compact Cards" view.

### 7.4 Animations & Micro-interactions

- **Rank change animation:** When a student moves up, briefly flash the row green; when down, flash red.
- **Score counter:** When filtering changes, score numbers count up/down to their new value (number ticker animation).
- **Hover card preview:** On desktop, hovering a student row shows a small floating card with their radar chart thumbnail and recent activity.

---

## 8. Student Detail Page — V2

### Additions:

- **Grade-Section** shown in header: "Grade 5-A" (not just "Grade 5").
- **"Given by" attribution** on milestones: Show teacher name who gave the qualification.
- **Full activity feed** below milestones: Scrollable list of ALL qualifications (not just +3), sortable by date. Each shows: date, category, subject, value, teacher name, note.
- **Badges section:** Display the student's earned badges (same pills from the leaderboard row, but larger and with descriptions).
- **Class ranking:** "Ranked #3 in Grade 5-A" contextual position.

---

## 9. Class/Section Page — V2

- URL changes: `/class/5-A` or `/class/5` (without section).
- **Section tabs:** If the grade has multiple sections, show tabs: `All | A | B | C`.
- **Class vs School comparison** chart includes section breakdown.
- **Teacher attribution:** "Most active teacher for this class: [name]" based on qualification count.

---

## 10. API Routes (V2)

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/admin/login` | — | Admin login |
| POST | `/api/auth/teacher/login` | — | Teacher login (body: `teacher_id` + `password`) |
| POST | `/api/auth/teacher/change-password` | Teacher | Change own password |

### Admin
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/students` | Admin | List all students |
| POST | `/api/admin/students/import` | Admin | Import students from parsed Excel JSON |
| PUT | `/api/admin/students/:id` | Admin | Edit a student |
| DELETE | `/api/admin/students/:id` | Admin | Deactivate a student |
| GET | `/api/admin/teachers` | Admin | List all teachers |
| POST | `/api/admin/teachers/import` | Admin | Import teachers from parsed Excel JSON |
| PUT | `/api/admin/teachers/:id` | Admin | Edit a teacher |
| POST | `/api/admin/teachers/:id/reset-password` | Admin | Reset teacher password |
| DELETE | `/api/admin/teachers/:id` | Admin | Deactivate a teacher |
| GET | `/api/admin/audit-log` | Admin | Query audit log (with filters) |
| PUT | `/api/admin/settings` | Admin | Update school settings |
| POST | `/api/admin/archive` | Admin | Trigger new session (moved from teacher) |

### Teacher
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/qualifications` | Teacher | List students for search |
| POST | `/api/qualifications` | Teacher | Create qualification (auto-attaches `teacher_id`) |
| DELETE | `/api/qualifications/:id` | Teacher | Undo (60s window, only own qualifications) |
| GET | `/api/teacher/activity` | Teacher | Own recent activity |

### Public
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/archive` | — | List archives |

---

## 11. Environment Variables (V2)

```env
# Supabase
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Admin
ADMIN_PASSWORD=strong-admin-password-here

# Optional
GITHUB_TOKEN=ghp_...          # For archive commits
PUBLIC_SCHOOL_NAME="School #45, Fergana"  # Fallback if admin_settings not yet configured
```

> `TEACHER_PORTAL_PASSWORD` from V1 is **removed** — each teacher now has their own password in the database.

---

## 12. Excel Template Files

Provide downloadable `.xlsx` template files from the admin panel:

### `students_template.xlsx`

| full_name | gender | grade | section |
|-----------|--------|-------|---------|
| Ali Valiev | male | 5 | A |
| Nodira Begim | female | 5 | B |
| Temur Malik | male | 11 | |

### `teachers_template.xlsx`

| full_name | subjects | default_password |
|-----------|----------|------------------|
| Gulnora Karimova | Math, Algebra | teacher123 |
| Bobur Mirzaev | Physics, Chemistry | teacher456 |

---

## 13. Development Phases (V2)

### Phase 7: Schema Migration & Teacher Identity
- [ ] Add `teachers` table to schema
- [ ] Add `section` column to `students`
- [ ] Add `teacher_id` column to `qualifications`
- [ ] Add `audit_log` table
- [ ] Add `admin_settings` table
- [ ] Rename `students.name` → `students.full_name`
- [ ] Add `is_active` to `students` and `teachers`
- [ ] Update `live_ranking` view with `section` and `recent_activity_count`
- [ ] Update mock data to match new schema
- [ ] Update TypeScript types

### Phase 8: Admin Panel
- [ ] Build admin login page (`/admin`)
- [ ] Build admin dashboard layout with tab navigation
- [ ] Implement Students tab (data table with inline edit)
- [ ] Implement Excel import for students (SheetJS client-side parsing + API)
- [ ] Implement Teachers tab (data table with inline edit)
- [ ] Implement Excel import for teachers
- [ ] Implement password reset for teachers
- [ ] Implement Activity Log tab (filterable audit log viewer)
- [ ] Implement Settings tab (school name, sections, academic year, admin password)
- [ ] Move archive/new-session from teacher dashboard to admin panel
- [ ] Provide downloadable Excel template files

### Phase 9: Teacher Identity & Auth Refactor
- [ ] Refactor auth system to support `admin` and `teacher` roles
- [ ] Build teacher login flow (select name → enter password)
- [ ] Implement "change password" flow + first-login nudge
- [ ] Attach `teacher_id` to every qualification write
- [ ] Build "My Profile" section in teacher dashboard
- [ ] Build "My Activity" log in teacher dashboard
- [ ] Scope undo to only the teacher's own qualifications
- [ ] Pre-populate subject dropdown from teacher's `subjects` array
- [ ] Write audit log entries for all teacher and admin actions

### Phase 10: Richer Leaderboard UI
- [ ] Implement grade-section display (`"5-A"`) everywhere
- [ ] Add section filter to filter bar (sub-filter when grade selected)
- [ ] Add search box to filter bar
- [ ] Implement rank delta chip (↑3 / ↓2 / —)
- [ ] Implement category mini-bars on each row
- [ ] Implement badge pills (🔥 Hot Streak, ⭐ Top Performer, 🏆 All-Rounder, 📈 Rising Star, 🆕 New)
- [ ] Enhance podium cards (score breakdown bars, streak flame, crown icon)
- [ ] Add confetti animation for #1 student on page load
- [ ] Add hover card preview on desktop
- [ ] Add score number ticker animation
- [ ] Add rank change flash (green/red)
- [ ] Add "Compact Cards" view toggle

### Phase 11: Detail Pages & Class Pages V2
- [ ] Update student detail with grade-section, teacher attribution, full activity feed, badges
- [ ] Update class page routing to support `/class/5-A`
- [ ] Add section tabs to class page
- [ ] Add "Most active teacher" to class page
- [ ] Add class ranking context to student detail ("Ranked #3 in Grade 5-A")

### Phase 12: Polish & Production
- [ ] End-to-end testing of admin import flows
- [ ] End-to-end testing of teacher login + password change
- [ ] Test with 200+ students and 5+ teachers (load/performance)
- [ ] Responsive testing of admin panel on tablet
- [ ] Accessibility review (keyboard nav, ARIA labels, color contrast)
- [ ] Internationalization prep (extract strings, support Uzbek/Russian labels)
- [ ] Update README and PROJECT-SPEC with V2 changes

---

## 14. Security Considerations (V2)

- **Password hashing:** Use `bcrypt` (cost factor 10+) for all password storage. Never store plaintext.
- **Teacher passwords in Excel:** Plaintext in the uploaded file is acceptable (admin controls the file). Hashed immediately on import. The Excel file never touches the database as-is.
- **Token scoping:** Admin tokens cannot call teacher endpoints and vice versa. Middleware checks `role` on every protected route.
- **Audit immutability:** `audit_log` table has no UPDATE or DELETE policies — append-only.
- **Rate limiting:** Maintain V1 limits (1 qualification/sec per teacher, 5 login attempts/min per IP).
- **Teacher isolation:** Teachers can only undo their own qualifications (check `teacher_id` match).

---

## 15. Badge Computation Logic

Badges are computed at read time (in the ranking view query or app-side), not stored:

| Badge | Icon | Condition |
|-------|------|-----------|
| **Hot Streak** | 🔥 | 3+ consecutive calendar days with at least one positive (`value > 0`) qualification |
| **Top Performer** | ⭐ | Highest `total_score` in their `grade` + `section` |
| **All-Rounder** | 🏆 | All four category scores (`academic`, `behavior`, `extracurricular`, `attendance`) are `> 0` |
| **Rising Star** | 📈 | Rank improved by 5+ positions compared to 7 days ago |
| **New** | 🆕 | Student's `created_at` is within the last 7 days |

---

## 16. File Structure (V2 additions)

```
src/
├── pages/
│   ├── admin/
│   │   ├── index.astro             # Admin login
│   │   └── dashboard.astro         # Admin dashboard shell
│   ├── teacher/
│   │   ├── index.astro             # Teacher login (name select + password)
│   │   └── dashboard.astro         # Teacher dashboard
│   ├── class/
│   │   └── [gradeSection].astro    # e.g. /class/5-A or /class/5
│   └── api/
│       ├── auth/
│       │   ├── admin-login.ts
│       │   ├── teacher-login.ts
│       │   └── teacher-change-password.ts
│       ├── admin/
│       │   ├── students.ts         # GET + POST (import)
│       │   ├── students/[id].ts    # PUT + DELETE
│       │   ├── teachers.ts         # GET + POST (import)
│       │   ├── teachers/[id].ts    # PUT + DELETE + reset-password
│       │   ├── audit-log.ts        # GET with query filters
│       │   ├── settings.ts         # GET + PUT
│       │   └── archive.ts          # POST (new session)
│       └── qualifications.ts       # Existing, modified to attach teacher_id
├── components/
│   ├── admin/
│   │   ├── AdminDashboard.tsx
│   │   ├── StudentsTable.tsx
│   │   ├── TeachersTable.tsx
│   │   ├── AuditLog.tsx
│   │   ├── ExcelImporter.tsx       # Reusable: file picker → preview → confirm
│   │   └── SettingsForm.tsx
│   ├── teacher/
│   │   ├── TeacherLogin.tsx        # Name select + password
│   │   ├── TeacherDashboard.tsx    # Qualification form + activity
│   │   ├── ChangePasswordModal.tsx
│   │   └── MyActivity.tsx
│   ├── leaderboard/
│   │   ├── Leaderboard.tsx         # Main orchestrator
│   │   ├── Podium.tsx              # Top 3 cards
│   │   ├── StudentRow.tsx          # Single row with badges + mini-bars
│   │   ├── FilterBar.tsx           # Grade, section, gender, category, search
│   │   ├── BadgePill.tsx           # Reusable badge component
│   │   ├── CategoryMiniBar.tsx     # Stacked 4-category bar
│   │   └── RankDeltaChip.tsx       # ↑3 / ↓2 chip
│   └── ...existing...
├── lib/
│   ├── supabase.ts
│   ├── mockData.ts                 # Updated for V2 schema
│   ├── badges.ts                   # Badge computation functions
│   ├── excel.ts                    # SheetJS parse/validate helpers
│   └── auth.ts                     # Token creation, verification, role checking
└── types/
    └── index.ts                    # Updated with V2 interfaces
```

---

## 17. Migration Strategy

Since V1 data is seeded/mock, migration is clean:

1. Run V2 schema SQL (drops and recreates tables with new columns).
2. Admin imports real student data from Excel.
3. Admin imports real teacher data from Excel.
4. Teachers log in with their default passwords and start working.
5. V1 `TEACHER_PORTAL_PASSWORD` env var can be removed.

For schools already using V1 with real Supabase data:
1. Run `ALTER TABLE` migrations (add columns, rename, create new tables).
2. Create a single "System" teacher for historical qualifications that lack `teacher_id`.
3. Admin goes through the new panel to set up teacher accounts.

---

> **Design philosophy:** The leaderboard should feel like opening a sports standings page — vibrant, informative at a glance, and rewarding to check daily. Every row should tell a story through its badges, bars, and movement indicators without requiring a click.
