# School Leaderboard V3 — Implementation Checklist

> **Reference:** [V3-SPEC.md](./V3-SPEC.md)  
> When every checkbox below is checked, the project fully meets the V3 teacher public recognition specification.

---

## Phase 1: Ranking Foundation

### 1.1 Teacher Ranking Design Lock
- [x] Freeze the teacher activity score formula from the V3 spec
- [x] Freeze category weights for `Academic`, `Extracurricular`, `Attendance`, `Behavior`
- [x] Freeze anti-spam rule for repeated same-day teacher-to-student entries
- [x] Document any final formula adjustments back into `V3-SPEC.md`

### 1.2 Types
- [x] Add `TeacherRank` interface
- [x] Add `TeacherPublicProfile` interface
- [x] Add `TeacherLeaderboardBadge` type
- [x] Add chart/summary types for public teacher detail analytics

---

## Phase 2: Database & Archive Support

### 2.1 Live Teacher Ranking View
- [x] Create `live_teacher_ranking` SQL view
- [x] Include `teacher_id`, `full_name`, `subjects`
- [x] Include `qualification_count`
- [x] Include `unique_students_count`
- [x] Include `active_days_count`
- [x] Include `category_coverage_count`
- [x] Include `recent_activity_count`
- [x] Include computed `activity_score`
- [x] Exclude inactive teachers from live ranking

### 2.2 Public Read Safety
- [x] Verify public reads cannot expose `password_hash`
- [x] Verify public reads cannot expose `is_password_changed`
- [x] Verify public reads cannot expose admin-only teacher metadata

### 2.3 Archive Schema Upgrade
- [x] Extend archive snapshot shape to include teacher records
- [x] Extend archive snapshot shape to include archived teacher ranking data
- [x] Update archive builder types/utilities to understand archived teacher ranking
- [x] Preserve compatibility with existing old archive files that do not yet contain teacher ranking

---

## Phase 3: Public Teacher Data Layer

### 3.1 Browser Read Helpers
- [x] Add public teacher ranking read helper in `src/lib/publicData.ts`
- [x] Add public teacher detail read helper in `src/lib/publicData.ts`
- [x] Add archive teacher ranking normalization helpers
- [x] Add archive teacher detail normalization helpers

### 3.2 Ranking Adapters
- [x] Build adapter to normalize live Supabase teacher ranking rows
- [x] Build adapter to normalize archived teacher ranking rows
- [x] Build shared badge computation helper for teachers
- [x] Build teacher chart data transformers

---

## Phase 4: Public Teacher Leaderboard Page

### 4.1 Route Shell
- [x] Create `src/pages/teachers.astro`
- [x] Ensure the page is static-safe for GitHub Pages
- [x] Pass locale and archive-year context into the client view

### 4.2 Teacher Leaderboard Client View
- [x] Create `src/components/TeacherLeaderboardView.tsx`
- [x] Load live teacher ranking in the browser
- [x] Load archived teacher ranking when `?year=` is selected
- [x] Show loading, empty, error, and archive states explicitly

### 4.3 Teacher Leaderboard UI
- [x] Create `TeacherLeaderboard.tsx`
- [x] Add top-3 podium for teachers
- [x] Add list/cards toggle
- [x] Add search by teacher name
- [x] Add subject filter
- [x] Add archive year switch support
- [x] Add visible activity score display
- [x] Add badges to teacher rows/cards
- [x] Add hover/preview behavior if it improves the page

### 4.4 Public Navigation
- [x] Add a clear entry from the main public page to the teacher leaderboard
- [x] Add a switch/toggle between student and teacher public leaderboards
- [x] Preserve locale and archive-year query params in teacher leaderboard navigation

---

## Phase 5: Public Teacher Detail Page

### 5.1 Route Shell
- [x] Create `src/pages/teacher-profile.astro`
- [x] Use static-safe query-param routing: `?id=<teacher_id>`
- [x] Handle missing teacher ID gracefully

### 5.2 Teacher Detail Client View
- [x] Create `src/components/TeacherDetailView.tsx`
- [x] Resolve live teacher detail by `teacher_id`
- [x] Resolve archived teacher detail by `teacher_id + year`
- [x] Handle teacher not found explicitly

### 5.3 Teacher Detail UI
- [x] Create `src/components/TeacherDetail.tsx`
- [x] Show teacher name and subject list
- [x] Show rank, activity score, qualification count
- [x] Show unique students reached
- [x] Show active days count
- [x] Show category breakdown chart
- [x] Show subject activity chart
- [x] Show monthly activity trend chart
- [x] Show student reach by class chart
- [x] Show positive vs corrective action balance
- [x] Add meaningful empty states for no activity

### 5.4 Public Links
- [x] Link every teacher row/card to the teacher detail page
- [x] Preserve locale in teacher detail links
- [x] Preserve archive year in teacher detail links

---

## Phase 6: Teacher Portal Tie-In

### 6.1 Teacher Public Profile Entry
- [x] Add “View My Public Profile” entry to the teacher portal/profile menu
- [x] Add “View Teacher Leaderboard” link in teacher portal
- [x] Preserve locale when navigating from portal to public teacher pages

---

## Phase 7: Archive Integration

### 7.1 Teacher Archive Loading
- [x] Extend archive loading utilities to support teacher leaderboard data
- [x] Extend archive year UI to work on teacher leaderboard page
- [x] Extend archive year UI to work on teacher detail page

### 7.2 Backward Compatibility
- [x] If an older archive lacks teacher data, show an explicit “teacher archive not available” state
- [x] Do not crash on V2-only archive files

---

## Phase 8: i18n, UX, and Design Quality

### 8.1 Localization
- [x] Add all teacher leaderboard strings to `src/lib/i18n.ts`
- [x] Add all teacher detail strings to `src/lib/i18n.ts`
- [x] Add all empty/error/archive state strings for `uz`, `en`, and `ru`

### 8.2 Visual Consistency
- [x] Match the design quality bar of the student leaderboard/detail pages
- [x] Ensure podium sizing and spacing work on desktop and mobile
- [x] Ensure charts remain readable in the dark visual theme

### 8.3 Responsive Behavior
- [x] Verify teacher leaderboard filters work on mobile
- [x] Verify teacher detail charts stack cleanly on mobile
- [x] Verify long teacher names and subject lists wrap safely

### 8.4 Accessibility
- [x] Ensure public teacher filters are keyboard-accessible
- [x] Ensure chart headings and summaries remain screen-reader friendly
- [x] Ensure badge/icon-only affordances expose text labels

---

## Phase 9: Testing & Validation

### 9.1 Logic Tests
- [x] Add tests for teacher activity score calculation
- [x] Add tests for category weighting
- [x] Add tests for anti-spam same-day cap
- [x] Add tests for archive teacher ranking normalization

### 9.2 UI Verification
- [ ] Verify teacher leaderboard loads with live Supabase data
- [x] Verify teacher detail opens correctly from a teacher card
- [x] Verify teacher leaderboard works on GitHub Pages without dynamic-route 404s
- [x] Verify teacher detail works on GitHub Pages without dynamic-route 404s
- [x] Verify locale switching works on teacher leaderboard
- [x] Verify locale switching works on teacher detail
- [x] Verify archive year switching works on both pages

### 9.3 Production Data Checks
- [x] Verify deactivated teachers do not appear in live teacher ranking
- [x] Verify teacher ranking updates after new qualifications are added
- [x] Verify attendance/behavior-heavy teachers receive appropriately broader recognition

---

## Phase 10: Docs & Rollout

### 10.1 Documentation
- [x] Update `README.md` with V3 teacher public leaderboard overview
- [x] Add sample screenshots or usage notes if needed
- [x] Document the teacher ranking logic in product docs for future maintainers

### 10.2 Archive / Admin Notes
- [x] Document that archives now snapshot teacher leaderboard data too
- [x] Document that teacher ranking is derived, not manually editable

### 10.3 Completion
- [x] Confirm all V3 spec acceptance criteria are met
