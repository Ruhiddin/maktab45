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
