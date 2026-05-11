-- =============================================================
-- School Leaderboard V2 — Schema Migration
-- =============================================================
-- Run this AFTER the V1 schema (schema.sql) is already in place.
-- For fresh installations, run schema.sql first, then this file.
--
-- This migration:
--   1. Creates new tables: teachers, admin_settings, audit_log
--   2. Alters students: rename `name` → `full_name`, add `section`, `is_active`
--   3. Alters qualifications: add `teacher_id` FK → teachers
--   4. Replaces the `live_ranking` view with the V2 version
--   5. Adds the `live_teacher_ranking` view for V3 teacher public recognition
--   6. Sets up RLS policies for all new tables
--   7. Seeds `admin_settings` with defaults (id=1)
-- =============================================================

-- Create enum for audit actor type
DO $$ BEGIN
  CREATE TYPE actor_type_enum AS ENUM ('admin', 'teacher');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================
-- 1. NEW TABLE: teachers
-- =============================================================
CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name TEXT NOT NULL,
    subjects TEXT[] NOT NULL DEFAULT '{}',
    password_hash TEXT NOT NULL,
    is_password_changed BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for active teacher lookups (login dropdown)
CREATE INDEX IF NOT EXISTS idx_teachers_active ON public.teachers (is_active) WHERE is_active = true;

-- =============================================================
-- 2. NEW TABLE: admin_settings (single-row config)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.admin_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    school_name TEXT NOT NULL DEFAULT 'School #45, Fergana',
    admin_password_hash TEXT,
    available_sections TEXT[] NOT NULL DEFAULT '{A,B,C,D}',
    current_academic_year TEXT NOT NULL DEFAULT '2025-2026',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =============================================================
-- 3. NEW TABLE: audit_log (append-only)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    actor_type actor_type_enum NOT NULL,
    actor_id UUID,  -- NULL for admin, FK → teachers for teacher actions
    action TEXT NOT NULL,
    target_type TEXT,
    target_id UUID,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for common audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.audit_log (actor_type, actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log (action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log (created_at DESC);

-- =============================================================
-- 4. ALTER students: rename `name` → `full_name`
-- =============================================================
DO $$ BEGIN
  ALTER TABLE public.students RENAME COLUMN name TO full_name;
EXCEPTION
  WHEN undefined_column THEN NULL;  -- Already renamed
END $$;

-- =============================================================
-- 5. ALTER students: add `section` column (nullable)
-- =============================================================
DO $$ BEGIN
  ALTER TABLE public.students ADD COLUMN section TEXT;
EXCEPTION
  WHEN duplicate_column THEN NULL;  -- Already exists
END $$;

-- =============================================================
-- 6. ALTER students: add `is_active` column (default true)
-- =============================================================
DO $$ BEGIN
  ALTER TABLE public.students ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
EXCEPTION
  WHEN duplicate_column THEN NULL;  -- Already exists
END $$;

-- =============================================================
-- 7. ALTER qualifications: add `teacher_id` FK (nullable for legacy data)
-- =============================================================
DO $$ BEGIN
  ALTER TABLE public.qualifications ADD COLUMN teacher_id UUID REFERENCES public.teachers(id);
EXCEPTION
  WHEN duplicate_column THEN NULL;  -- Already exists
END $$;

-- Index for teacher activity lookups
CREATE INDEX IF NOT EXISTS idx_qualifications_teacher ON public.qualifications (teacher_id);

-- =============================================================
-- 8. UPDATE live_ranking VIEW (V2: includes section, recent_activity_count, filters by is_active)
-- =============================================================
-- Drop first because V1 and V2 do not share the same column layout.
DROP VIEW IF EXISTS public.live_ranking;

CREATE VIEW public.live_ranking AS
SELECT
    s.id        AS student_id,
    s.full_name AS name,
    s.gender,
    s.grade,
    s.section,
    s.avatar_url,
    COALESCE(SUM(q.value), 0)                                                              AS total_score,
    COALESCE(SUM(CASE WHEN q.category = 'Academic'        THEN q.value ELSE 0 END), 0)     AS academic_score,
    COALESCE(SUM(CASE WHEN q.category = 'Behavior'        THEN q.value ELSE 0 END), 0)     AS behavior_score,
    COALESCE(SUM(CASE WHEN q.category = 'Extracurricular'  THEN q.value ELSE 0 END), 0)    AS extracurricular_score,
    COALESCE(SUM(CASE WHEN q.category = 'Attendance'       THEN q.value ELSE 0 END), 0)    AS attendance_score,
    -- Streak: computed in app layer, placeholder column for API compatibility
    0 AS current_streak,
    -- Count of qualifications in last 7 days for "hot" / activity badges
    COALESCE(COUNT(q.id) FILTER (WHERE q.created_at >= NOW() - INTERVAL '7 days'), 0)      AS recent_activity_count
FROM
    public.students s
LEFT JOIN
    public.qualifications q ON s.id = q.student_id
WHERE
    s.is_active = true
GROUP BY
    s.id, s.full_name, s.gender, s.grade, s.section, s.avatar_url;

-- =============================================================
-- 9. CREATE live_teacher_ranking VIEW (V3: teacher public recognition)
-- =============================================================
DROP VIEW IF EXISTS public.live_teacher_ranking;

CREATE VIEW public.live_teacher_ranking AS
WITH qualification_events AS (
    SELECT
        q.id,
        q.teacher_id,
        q.student_id,
        q.category,
        q.subject,
        q.value,
        q.created_at,
        s.grade,
        s.section,
        ROW_NUMBER() OVER (
            PARTITION BY
                q.teacher_id,
                q.student_id,
                ((q.created_at AT TIME ZONE 'UTC')::date)
            ORDER BY q.created_at ASC, q.id ASC
        ) AS same_day_student_seq
    FROM
        public.qualifications q
    INNER JOIN
        public.students s ON s.id = q.student_id
    WHERE
        q.teacher_id IS NOT NULL
), counted_events AS (
    SELECT
        teacher_id,
        student_id,
        category,
        subject,
        value,
        created_at,
        grade,
        section,
        CASE
            WHEN category = 'Academic' THEN 1.00
            WHEN category = 'Extracurricular' THEN 1.05
            WHEN category = 'Attendance' THEN 1.20
            WHEN category = 'Behavior' THEN 1.25
            ELSE 1.00
        END AS category_weight
    FROM
        qualification_events
    WHERE
        same_day_student_seq <= 3
), teacher_aggregates AS (
    SELECT
        teacher_id,
        COUNT(*)::INTEGER AS qualification_count,
        COUNT(DISTINCT student_id)::INTEGER AS unique_students_count,
        COUNT(DISTINCT ((created_at AT TIME ZONE 'UTC')::date))::INTEGER AS active_days_count,
        COUNT(DISTINCT category)::INTEGER AS category_coverage_count,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::INTEGER AS recent_activity_count,
        COALESCE(SUM(category_weight), 0)::NUMERIC AS weighted_event_credit
    FROM
        counted_events
    GROUP BY
        teacher_id
)
SELECT
    t.id AS teacher_id,
    t.full_name,
    t.subjects,
    COALESCE(a.qualification_count, 0) AS qualification_count,
    COALESCE(a.unique_students_count, 0) AS unique_students_count,
    COALESCE(a.active_days_count, 0) AS active_days_count,
    COALESCE(a.category_coverage_count, 0) AS category_coverage_count,
    COALESCE(a.recent_activity_count, 0) AS recent_activity_count,
    ROUND(
        COALESCE(a.weighted_event_credit, 0)
        + (COALESCE(a.unique_students_count, 0) * 0.20)
        + (GREATEST(COALESCE(a.category_coverage_count, 0) - 1, 0) * 0.35)
        + (COALESCE(a.active_days_count, 0) * 0.15),
        2
    ) AS activity_score
FROM
    public.teachers t
LEFT JOIN
    teacher_aggregates a ON a.teacher_id = t.id
WHERE
    t.is_active = true;

-- =============================================================
-- 10. RLS POLICIES — teachers table
-- =============================================================
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

-- Public read access (needed for login dropdown: id + full_name)
CREATE POLICY "Allow public read access on teachers"
    ON public.teachers FOR SELECT
    USING (true);

-- Block anon writes — all mutations go through service_role
CREATE POLICY "Deny anon insert to teachers"
    ON public.teachers FOR INSERT
    WITH CHECK (false);

CREATE POLICY "Deny anon update to teachers"
    ON public.teachers FOR UPDATE
    USING (false);

CREATE POLICY "Deny anon delete to teachers"
    ON public.teachers FOR DELETE
    USING (false);

-- =============================================================
-- 11. RLS POLICIES — admin_settings table
-- =============================================================
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Public read access (school name, academic year needed by frontend)
CREATE POLICY "Allow public read access on admin_settings"
    ON public.admin_settings FOR SELECT
    USING (true);

-- Block anon writes — all mutations go through service_role
CREATE POLICY "Deny anon insert to admin_settings"
    ON public.admin_settings FOR INSERT
    WITH CHECK (false);

CREATE POLICY "Deny anon update to admin_settings"
    ON public.admin_settings FOR UPDATE
    USING (false);

CREATE POLICY "Deny anon delete to admin_settings"
    ON public.admin_settings FOR DELETE
    USING (false);

-- =============================================================
-- 12. RLS POLICIES — audit_log table (APPEND-ONLY)
-- =============================================================
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Clean up any legacy policies so the table has no UPDATE/DELETE policies at all.
DROP POLICY IF EXISTS "Allow public read access on audit_log" ON public.audit_log;
DROP POLICY IF EXISTS "Deny anon insert to audit_log" ON public.audit_log;
DROP POLICY IF EXISTS "Deny anon update to audit_log" ON public.audit_log;
DROP POLICY IF EXISTS "Deny anon delete to audit_log" ON public.audit_log;

-- Public read access (admin panel reads via service_role anyway, but anon can read too)
CREATE POLICY "Allow public read access on audit_log"
    ON public.audit_log FOR SELECT
    USING (true);

-- No client-side write access. The server writes audit entries with service_role only.
CREATE POLICY "Deny anon insert to audit_log"
    ON public.audit_log FOR INSERT
    WITH CHECK (false);

-- =============================================================
-- 13. SEED admin_settings with default row (id=1)
-- =============================================================
-- Uses ON CONFLICT to be idempotent — safe to run multiple times
INSERT INTO public.admin_settings (id, school_name, available_sections, current_academic_year)
VALUES (
    1,
    COALESCE(current_setting('app.school_name', true), 'School #45, Fergana'),
    '{A,B,C,D}',
    '2025-2026'
)
ON CONFLICT (id) DO NOTHING;
