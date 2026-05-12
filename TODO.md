# School Leaderboard Project - TODO List

This checklist is based on the Master Specification. Completing all these items will ensure the project is ready for production.

## Phase 1: Database Setup (Supabase)
- [x] Initialize Supabase project
- [x] Create `students` table (`id`, `name`, `gender`, `grade`, `avatar_url`, `created_at`)
- [x] Create `qualifications` table (`id`, `student_id`, `category`, `subject`, `value`, `teacher_note`, `created_at`)
- [x] Create SQL View for "Live" rank: `SUM(value)` grouped by `student_id`
- [x] Set up Row Level Security (RLS) policies (read-only for public, write for authenticated teachers via serverless functions)

## Phase 2: Frontend Foundation & The Table
- [x] Initialize Astro project with Tailwind CSS
- [x] Configure Shadcn/UI for basic components
- [x] Set up Supabase client in Astro
- [x] Build the Main Leaderboard page (`/`)
- [x] Implement data fetching from the Supabase SQL View
- [x] Create the Filter Bar (toggles for Grade 1-11, Gender, Qualification Type)
- [x] Implement Row-based ranking list UI
- [x] Display Trend Indicator (Green ↑ or Red ↓ based on last 7 days of movement)
- [x] Integrate Framer Motion for Row Animation (FLIP technique when filters change)
- [x] Implement "The Podium" on main page (Top 3 students in Hero Cards with gold, silver, bronze gradients)
- [x] Apply glassmorphism styling to The Filter Bar

## Phase 3: Detail Pages (Public)
- [x] Build Student Detail Page (`/student/[id]`)
- [x] Implement Radar Chart ("Skill Web" showing balance: Academic vs Behavior)
- [x] Implement Progress Line graph (selectable: 7d, 30d, All)
- [x] Implement Milestones list (recent updates of +3 or higher)
- [x] Build Class/Subject Page (`/class/[grade]` or `/subject/[name]`)
- [x] Implement Aggregated Stats (average score of class vs school average)
- [x] Implement Top 5 List for the specific class/subject slice

## Phase 4: Teacher Portal (Private)
- [x] Build Teacher Portal login page
- [x] Implement Password authentication (stored in env variables, check against serverless function, store JWT/Token in `localStorage`)
- [x] Build Teacher Dashboard
- [x] Implement Search-to-Select feature for quick student lookup
- [x] Implement The Stepper (dial/button group for `[-5, -3, -1, 0, +1, +3, +5]`)
- [x] Implement submission form (category, subject, note, value)
- [x] Implement "Undo" button (available for 60 seconds after update to fix mistakes)
- [x] Build Serverless Function (Netlify/Vercel) to handle qualification updates securely
- [x] Implement Rate Limiting on serverless function (1 update per second per teacher)

## Phase 5: The Archiving System (The "September" Rule)
- [x] Build "New Session" button in Teacher Portal
- [x] Implement Export Logic: Generate JSON of `qualifications` and `students`
- [x] Implement API/Action to commit JSON to GitHub Repo under `/public/archives/`
- [x] Implement Supabase wipe script (delete `qualifications`, keep `students` but promote grade)
- [x] Build Archive View routing (`/archive/[year]`)
- [x] Apply `.archive-view` CSS class (grayscale, sepia, pointer-events: none) to archive pages

## Phase 6: Production Readiness & Deployment
- [x] Set up GitHub Repository 
- [x] Configure environment variables in deployment platform (Netlify/GitHub Pages + Supabase/Vercel)
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `TEACHER_PORTAL_PASSWORD` / Secret key
  - GitHub API token (for archiving commit)
- [x] Set up CI/CD pipeline (e.g., continuous deployment via Netlify/Vercel)
- [x] Perform security review (Ensure RLS is strict, tokens are handled securely, no secrets exposed)
- [x] Setup SEO & Metadata (Title tags, meta descriptions for speed and SEO)
- [x] Test across Desktop, Tablet, and Mobile browsers
- [x] Final end-to-end testing of core flows (viewing, filtering, adding points, undoing, archiving)

## Phase 7: E-Board Responsive Optimization

Goal: make the site comfortable on large classroom e-boards where browser rendering is slower, scrolling is annoying, and the current desktop scale is visually too large.

Target baseline for design and QA:
- [x] Define the primary e-board viewport to optimize for first: `1366x768` landscape
- [x] Verify secondary landscape targets: `1600x900`, `1920x1080`, and `1280x720`
- [x] Decide whether e-board mode is purely viewport-based or also supports an explicit query/class toggle for forced testing
- [x] Document the chosen target in project docs so future UI work keeps this layout compact

### 7.1 Layout tokens and breakpoints
- [x] Add a dedicated responsive strategy for short landscape displays, not only width-based mobile breakpoints
- [x] Introduce height-aware breakpoints or utility classes for compact vertical layouts
- [x] Create reusable spacing and type scale rules for e-board mode instead of shrinking each component ad hoc
- [x] Define compact container widths, section gaps, panel paddings, input heights, and card radii
- [x] Standardize a compact heading scale so hero sections stop dominating the viewport

Primary files:
- `tailwind.config.mjs`
- `src/layouts/Layout.astro`
- shared component classNames across `src/components/*`

### 7.2 Global shell and persistent chrome
- [x] Reduce top spacing around the page shell and sticky locale switcher
- [x] Make locale pills shorter and less tall so they do not consume top-right space on landscape screens
- [x] Add a compact footer mode or collapse footer density on e-board resolutions
- [x] Ensure footer branding does not push important leaderboard content below the fold
- [x] Check sticky elements so they do not stack too much vertical padding while scrolling

Primary files:
- `src/layouts/Layout.astro`

### 7.3 Homepage hero and leaderboard switcher
- [x] Reduce homepage vertical padding so the title, subtitle, switcher, and filters fit earlier in the viewport
- [x] Shrink the school title scale on desktop/e-board widths with limited height
- [x] Tighten subtitle width and line-height to avoid multi-line expansion
- [x] Compress the leaderboard switcher pill heights and horizontal padding
- [x] Keep the first meaningful data visible without an immediate large scroll

Primary files:
- `src/components/HomepageView.tsx`

### 7.4 Filter bars and top controls
- [x] Redesign filter bars for dense landscape use with smaller controls and tighter wrapping
- [x] Reduce filter panel padding and internal gaps
- [x] Lower select/input/button heights across leaderboard controls
- [x] Rebalance filter widths so search, class, and grade filters fit into fewer lines on `1366x768`
- [x] Review sticky offset and sticky height so filters remain visible without covering too much content
- [x] Keep refresh info visible but more compact
- [x] Make list/cards toggle smaller and aligned with the rest of the control row

Primary files:
- `src/components/FilterBar.tsx`
- `src/components/TeacherLeaderboard.tsx`
- `src/components/ClientStudyYearPicker.tsx`

### 7.5 Student podium and leaderboard density
- [x] Introduce a compact podium variant for e-board resolutions
- [x] Reduce podium top padding, card heights, avatar sizes, and score text sizes
- [x] Keep top-3 prominence, but stop the podium from consuming most of the first screen
- [x] Shrink list row height, badges, grade pills, and mini bars
- [x] Tighten card-grid density so more students fit per screen in cards mode
- [ ] Re-evaluate hover preview behavior on slower boards if hover causes lag or obscures content

Primary files:
- `src/components/Podium.tsx`
- `src/components/Leaderboard.tsx`
- `src/components/StudentRow.tsx`
- `src/components/StudentCard.tsx`
- `src/components/HoverPreviewCard.tsx`

### 7.6 Teacher leaderboard density
- [x] Apply the same compact strategy to teacher controls, podium, list rows, and cards
- [x] Reduce hero block height and title size on the teacher leaderboard landing view
- [x] Compress teacher podium cards and internal stat boxes
- [x] Make teacher list rows shorter while preserving readability of subjects and activity metrics
- [x] Limit unnecessary wrapping in the segmented controls and year switchers

Primary files:
- `src/components/TeacherLeaderboardView.tsx`
- `src/components/TeacherLeaderboard.tsx`
- `src/components/TeacherPodium.tsx`
- `src/components/TeacherHoverPreviewCard.tsx`

### 7.7 Detail pages and secondary routes
- [x] Apply compact spacing to student detail, class detail, teacher detail, archive, access, and admin entry screens
- [x] Reduce oversized empty/loading/error states so they do not waste vertical space
- [x] Audit charts and stat sections for fixed heights that are too tall on short landscape displays
- [x] Ensure back links, year pickers, and summary cards remain above the fold where possible

Primary files:
- `src/components/StudentDetailView.tsx`
- `src/components/StudentDetail.tsx`
- `src/components/ClassDetailView.tsx`
- `src/components/ClassDetail.tsx`
- `src/components/TeacherDetailView.tsx`
- `src/components/TeacherDetail.tsx`
- `src/pages/archive/index.astro`
- `src/pages/access.astro`

### 7.8 Performance-oriented UI cleanup for e-boards
- [x] Reduce decorative motion or expensive visual effects in compact e-board mode where they hurt responsiveness
- [x] Review blur, shadow, and glow usage on large panels if repaint cost is noticeable on the board hardware
- [ ] Consider disabling one-time confetti on e-board mode if startup feels sluggish
- [ ] Check hover previews, animated counters, and heavy charts for perceived lag
- [x] Prefer smaller DOM blocks above the fold where a dense list can replace oversized cards

Primary files:
- `src/components/Podium.tsx`
- `src/components/TeacherPodium.tsx`
- `src/components/StudentRow.tsx`
- `src/components/TeacherLeaderboard.tsx`
- `src/layouts/Layout.astro`

### 7.9 QA and acceptance criteria
- [ ] Add a manual QA checklist for `1366x768`, `1600x900`, and `1920x1080`
- [ ] Confirm homepage first screen shows title, switcher, filters, podium start, and leaderboard start with less scrolling
- [ ] Confirm teacher leaderboard first screen shows controls plus visible ranked content
- [ ] Confirm no important control wraps into unusable multi-line stacks on e-board widths
- [ ] Confirm detail pages avoid giant empty hero spacing
- [ ] Confirm keyboard focus, hover states, and sticky controls still behave correctly
- [x] Confirm mobile and existing desktop layouts do not regress while introducing e-board compaction
- [ ] Capture before/after screenshots from actual board hardware or browser emulation
