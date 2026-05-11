# School Leaderboard V3 — Teacher Public Recognition Layer

> **Status:** Draft  
> **Builds on:** [V2-SPEC.md](./V2-SPEC.md)  
> **Goal:** Add a public teacher leaderboard and teacher detail experience that rewards meaningful teacher activity, especially broad student-support work such as attendance, behavior, and general student follow-up.

---

## 1. What V3 Adds

V2 made the platform production-ready for students, teachers, and admins.  
V3 adds a new public recognition layer for **teachers**.

### 1.1 New Public Features

| Area | V2 | V3 |
|------|----|----|
| Public teacher ranking | None | Dedicated public teacher leaderboard |
| Teacher public profile | None | Teacher detail page with charts and activity summary |
| Teacher scoring | Implicit only through student actions | Explicit activity-based ranking model |
| Archive support | Student-centered | Archive-aware teacher leaderboard and teacher detail |
| Motivation loop | Students are publicly ranked | Teachers are also encouraged to stay active |

### 1.2 Product Intention

The teacher leaderboard should:
- make teacher activity visible in a positive, motivating way
- reward broader support work, not only subject-specific grading
- encourage regular engagement across students and categories
- remain resistant to obvious gaming or spammy behavior

It should **not**:
- rank teachers by student score totals alone
- punish teachers for issuing corrective or negative qualifications
- expose sensitive teacher account data

---

## 2. Teacher Ranking Model

### 2.1 Core Principle

Teachers are ranked by their **activity impact score**, derived from the `qualifications` they issue.

This score is **not** the same as student score totals.  
Teacher ranking should measure:
- consistency
- breadth of student support
- cross-category involvement
- meaningful operational contribution

### 2.2 Inputs

The V3 teacher ranking is computed from:
- `qualifications.teacher_id`
- `qualifications.category`
- `qualifications.subject`
- `qualifications.value`
- `qualifications.created_at`
- `students.grade`
- `students.section`
- `teachers.full_name`
- `teachers.subjects`
- `teachers.is_active`

### 2.3 Activity Score Formula

Each qualification event contributes **teacher activity credit**.

The formula is frozen for V3 as:

```text
activity_score
  = weighted_event_credit
  + unique_student_bonus
  + category_coverage_bonus
  + active_day_bonus
```

Where:

```text
weighted_event_credit
  = Σ counted_event_weight

counted_event_weight
  = 1.0 × category_weight
```

#### Base Event Credit

Every qualification counts as:

- `1.0` base activity credit

#### Category Weights

Broader student-support categories carry slightly more weight:

| Category | Weight |
|----------|--------|
| `Academic` | `1.00` |
| `Extracurricular` | `1.05` |
| `Attendance` | `1.20` |
| `Behavior` | `1.25` |

#### Sign Neutrality

Teacher score must be **sign-neutral**:
- a `+3` and a `-3` both count as activity
- corrective work should still count as teacher effort
- `qualification.value` sign and magnitude do **not** change teacher leaderboard score

#### Counted Event Definition

For teacher ranking purposes, a qualification event is counted only when it survives the anti-spam cap.

Counted event key:

- `teacher_id`
- `student_id`
- calendar day derived from `created_at`

Within each `teacher_id + student_id + day` group:
- the earliest `3` qualifications count toward leaderboard score
- any additional qualifications still exist in the database, but add `0` leaderboard credit

This means:
- a teacher can still work with the same student many times
- but leaderboard score favors breadth and consistency over repetitive same-day bursts

#### Breadth Bonuses

To reward broader work:

- `unique_student_bonus = unique_students_count × 0.20`
- `category_coverage_bonus = max(category_coverage_count - 1, 0) × 0.35`
- `active_day_bonus = active_days_count × 0.15`

Definitions:

- `unique_students_count` = distinct students touched by at least one counted event
- `category_coverage_count` = distinct categories used by counted events
- `active_days_count` = distinct calendar days with at least one counted event

#### Anti-Spam Guardrails

To prevent spamming the same student:

- only the first `3` qualifications per `teacher_id + student_id + day` count toward full activity credit
- additional same-day entries for the same student still persist normally, but add no extra leaderboard score

#### Worked Example

If a teacher has:
- `40` counted `Academic` entries
- `10` counted `Behavior` entries
- `8` counted `Attendance` entries
- `12` counted `Extracurricular` entries
- `44` unique students
- `4` categories covered
- `19` active days

Then:

```text
weighted_event_credit
  = (40 × 1.00)
  + (10 × 1.25)
  + (8 × 1.20)
  + (12 × 1.05)
  = 74.70

unique_student_bonus
  = 44 × 0.20
  = 8.80

category_coverage_bonus
  = (4 - 1) × 0.35
  = 1.05

active_day_bonus
  = 19 × 0.15
  = 2.85

activity_score
  = 74.70 + 8.80 + 1.05 + 2.85
  = 87.40
```

#### Deterministic Rounding

For storage and display:
- compute with full precision internally
- persist `activity_score` rounded to `2` decimal places
- use that same rounded value in public UI

#### Ranking Tie-Break Order

If two teachers have the same `activity_score`, order by:

1. higher `unique_students_count`
2. higher `category_coverage_count`
3. higher `recent_activity_count`
4. alphabetical `full_name`

This tie-break order is part of the frozen V3 ranking contract.

### 2.4 Display Metrics

The public teacher leaderboard should show:
- `activity_score`
- `qualification_count`
- `unique_students_count`
- `active_days_count`
- `category_coverage_count`
- `recent_activity_count` (last 7 days)

### 2.5 Ranking Window

Live teacher ranking is based on the **current active school year**.

Archive teacher ranking is based on the selected archived year snapshot.

The scoring window is:
- live mode: all counted qualification events in the current active school year
- archive mode: all counted qualification events present in the selected archived school-year snapshot

### 2.6 Canonical V3 Decisions

The following ranking decisions are frozen for V3:

- teacher ranking is **activity-based**, not student-score-based
- `Behavior` and `Attendance` carry broader-support weighting
- score is sign-neutral with respect to `qualification.value`
- repeated same-day same-student activity is capped after the first `3` counted events
- breadth and consistency bonuses are additive and independent
- public ranking order uses the tie-break sequence defined above

### 2.7 Maintainer Implementation Notes

The current repo implementation of the V3 ranking contract lives in:

- `src/lib/teacherRanking.ts`

Maintainers should keep the following verification hooks aligned with this section whenever the logic changes:

- `scripts/test-teacher-ranking.ts` for deterministic ranking behavior checks
- `scripts/verify-v3-teacher-ui.mjs` for static-safe public route and link wiring checks

If the product intentionally changes ranking weights, bonus constants, tie-break order, or anti-spam rules, update:

1. this V3 spec section
2. the implementation in `src/lib/teacherRanking.ts`
3. the test expectations in `scripts/test-teacher-ranking.ts`

---

## 3. Data Model Changes

### 3.1 `live_teacher_ranking` (NEW VIEW)

Create a public read-friendly view:

| Column | Type | Description |
|--------|------|-------------|
| `teacher_id` | UUID | FK → `teachers.id` |
| `full_name` | TEXT | Public teacher name |
| `subjects` | TEXT[] | Admin-assigned subject list |
| `qualification_count` | INTEGER | Total qualifications issued in current year |
| `unique_students_count` | INTEGER | Distinct students reached |
| `active_days_count` | INTEGER | Distinct days with activity |
| `category_coverage_count` | INTEGER | Distinct categories used |
| `recent_activity_count` | INTEGER | Last 7 days qualifications |
| `activity_score` | NUMERIC | Weighted public ranking score |

Rules:
- include only `teachers.is_active = true`
- include teachers with zero activity only when explicitly desired in list mode; podium should show active contributors first

### 3.2 Teacher Archive Snapshot Support

Current archives are student-centered.  
V3 archive snapshots must also preserve enough teacher information for public historical ranking.

Archive payload should include:
- `teachers`
- `teacher_ranking`
- `qualifications`

Minimum archived teacher object:

```json
{
  "id": "uuid",
  "full_name": "Gulnora Karimova",
  "subjects": ["Math", "Algebra"],
  "is_active": true
}
```

### 3.3 Public Teacher DTO

Public teacher-facing responses and browser reads must never expose:
- `password_hash`
- `is_password_changed`
- any auth token data
- private admin-only metadata

Only public performance/profile data should be exposed.

Current repo-safe public teacher read contract for V3 planning:
- direct browser reads may select only public teacher identity fields such as `id`, `full_name`, and `subjects`
- `live_teacher_ranking` must expose only:
  - `teacher_id`
  - `full_name`
  - `subjects`
  - public ranking metrics
- password and account-state fields must remain available only in protected auth/admin workflows

---

## 4. Public Routes & URL Strategy

Because the site is deployed on **GitHub Pages**, dynamic path segments are fragile for newly imported data.  
V3 should avoid dynamic public teacher URLs that require rebuilds for every new teacher.

### 4.1 Teacher Leaderboard Route

New public page:

- `/teachers`

Purpose:
- public teacher leaderboard
- filterable and archive-aware

### 4.2 Teacher Detail Route

New public static-safe page:

- `/teacher-profile?id=<teacher_id>`

This mirrors the V3-safe student/class query-param pattern and avoids hard 404s on GitHub Pages.

### 4.3 Main Page Integration

The main page should expose a clear way to switch between:
- `Student Leaderboard`
- `Teacher Leaderboard`

Preferred UX:
- compact mode switch near the main public leaderboard controls
- keep students as the default landing view

---

## 5. Public Teacher Leaderboard UX

### 5.1 Leaderboard Structure

The teacher leaderboard should visually match the student leaderboard quality bar:
- podium for top 3
- list/cards toggle
- search and filters
- badges
- trend/change indicators where meaningful

### 5.2 Teacher Card / Row Content

Each teacher row/card should show:
- full name
- subjects
- activity score
- qualifications count
- unique students reached
- recent activity marker
- badge(s)

### 5.3 Teacher Filters

Teacher leaderboard filters:
- subject
- activity band / score band
- recent activity only
- archive year

Optional later:
- category emphasis filter

### 5.4 Teacher Badges

Suggested public teacher badges:

| Badge | Rule |
|------|------|
| `all_round_mentor` | used all 4 categories |
| `attendance_anchor` | high attendance activity share |
| `behavior_guide` | high behavior activity share |
| `student_reach` | high unique student count |
| `steady_presence` | activity on many distinct days |
| `hot_week` | high recent activity in last 7 days |

Badges should remain explainable and deterministic.

---

## 6. Public Teacher Detail Page UX

### 6.1 Header Summary

Teacher detail should show:
- name
- subjects
- current rank
- activity score
- qualifications count
- unique students reached
- active days count

### 6.2 Charts

Teacher detail should include public analytics similar in depth to student detail:

#### A. Category Breakdown
- qualifications by category
- highlights broader operational involvement

#### B. Subject Activity Mix
- per-subject qualification totals
- useful for multi-subject teachers

#### C. Monthly Activity Trend
- activity over time

#### D. Student Reach by Class
- how many students the teacher has touched per grade-section

#### E. Value Balance
- positive vs corrective actions
- displayed for transparency, but **not** used as the ranking score

### 6.3 Public Lists

Teacher detail may also include:
- top supported classes
- recent public activity summary
- most-used category

Do not expose:
- private notes that should remain internal if product direction changes
- auth/account state

### 6.4 Empty States

Handle:
- teacher has no activity yet
- archive year has no teacher data
- teacher ID is invalid or missing

All should have explicit UI states, not blank charts.

---

## 7. Teacher Portal Tie-In

The teacher portal remains private and operational.

V3 may optionally add:
- a “View My Public Profile” link for the logged-in teacher
- a “View Teacher Leaderboard” link alongside the student leaderboard link

This public profile must be read-only.

---

## 8. Admin Implications

### 8.1 No Manual Teacher Scoring

Admins should not manually edit teacher leaderboard scores.  
Teacher ranking must remain derived from qualification activity.

This is a product and implementation rule:

- no admin UI should expose editable `activity_score` fields
- no archive or import flow should accept hand-authored teacher ranking values from operators
- changes in public teacher ranking should happen only through teacher/activity data and the frozen ranking formula

### 8.2 Imports

Teacher import remains unchanged structurally:
- `full_name`
- `subjects`
- `default_password`

But V3 makes teacher naming/subject quality more visible publicly, so data cleanliness matters more.

### 8.3 Archive Flow

The archive process must snapshot teacher leaderboard data at the same time as student data.

For current repo behavior, the archive payload should persist:

- `students`
- `teachers`
- `qualifications`
- `rankings`
- `teacher_ranking`

Archive consumers should prefer the persisted `teacher_ranking` payload when present. Recomputing teacher ranking from archived teachers plus qualifications is a backward-compatibility fallback for older snapshots, not the primary V3 contract.

---

## 9. API / Query Responsibilities

### 9.1 Public Reads

As with the current public leaderboard strategy, public teacher pages should prefer:
- direct browser Supabase reads for safe public views, or
- one normalized public helper layer

Avoid reintroducing protected server routes just for public ranking display.

### 9.2 Protected Writes

Teacher activity continues to originate only from protected teacher/admin workflows.

The public teacher leaderboard is a read-only projection of backend truth.

---

## 10. SEO & Social Sharing

Teacher leaderboard pages should have distinct titles:
- `Teachers Leaderboard — School #45, Fergana`
- `Teacher Profile — <Teacher Name> — School #45, Fergana`

Archive pages should append year context.

---

## 11. Non-Goals

V3 does **not** include:
- teacher comments/reviews
- admin overrides for public teacher ranking
- public teacher chat/contact
- per-teacher moderation tools
- exposing raw audit logs publicly

---

## 12. Acceptance Criteria

V3 is complete when:

1. The public site has a teacher leaderboard page accessible to everyone.
2. Teacher ranking is computed from qualification activity, not student score totals.
3. Attendance and behavior contributions are weighted more than pure subject-only activity.
4. Teachers can be opened via a static-safe public detail route on GitHub Pages.
5. Archive year switching works for teacher leaderboard and teacher detail.
6. The UI is fully localized and matches the visual quality bar of the student pages.
7. No private teacher auth/account fields leak into public reads.
