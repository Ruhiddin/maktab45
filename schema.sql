-- Create Enum Types
CREATE TYPE gender_enum AS ENUM ('male', 'female');
CREATE TYPE qualification_category_enum AS ENUM ('Academic', 'Behavior', 'Extracurricular', 'Attendance');

-- 1. Create students table
CREATE TABLE public.students (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    gender gender_enum NOT NULL,
    grade INTEGER NOT NULL CHECK (grade >= 1 AND grade <= 11),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create qualifications table
CREATE TABLE public.qualifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    category qualification_category_enum NOT NULL,
    subject TEXT,
    value INTEGER NOT NULL CHECK (value >= -5 AND value <= 5),
    teacher_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create SQL View for "Live" rank
-- Groups by student_id and sums the value. Joins student data for easy frontend fetching.
CREATE OR REPLACE VIEW public.live_ranking AS
SELECT 
    s.id AS student_id,
    s.name,
    s.gender,
    s.grade,
    s.avatar_url,
    COALESCE(SUM(q.value), 0) AS total_score,
    COALESCE(SUM(CASE WHEN q.category = 'Academic' THEN q.value ELSE 0 END), 0) AS academic_score,
    COALESCE(SUM(CASE WHEN q.category = 'Behavior' THEN q.value ELSE 0 END), 0) AS behavior_score,
    COALESCE(SUM(CASE WHEN q.category = 'Extracurricular' THEN q.value ELSE 0 END), 0) AS extracurricular_score,
    COALESCE(SUM(CASE WHEN q.category = 'Attendance' THEN q.value ELSE 0 END), 0) AS attendance_score
FROM 
    public.students s
LEFT JOIN 
    public.qualifications q ON s.id = q.student_id
GROUP BY 
    s.id, s.name, s.gender, s.grade, s.avatar_url;

-- 4. Set up Row Level Security (RLS) policies

-- Enable RLS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualifications ENABLE ROW LEVEL SECURITY;

-- Students: Read-only for everyone (public)
CREATE POLICY "Allow public read access on students"
    ON public.students FOR SELECT
    USING (true);

-- Qualifications: Read-only for everyone (public)
CREATE POLICY "Allow public read access on qualifications"
    ON public.qualifications FOR SELECT
    USING (true);

-- Write policies for Serverless Functions / Teachers.
-- We will use the 'service_role' key in the serverless functions (which bypasses RLS by default).
-- We'll explicitly block 'anon' (public) from inserting/updating/deleting.
CREATE POLICY "Deny anon insert to qualifications"
    ON public.qualifications FOR INSERT
    WITH CHECK (false);

CREATE POLICY "Deny anon update to qualifications"
    ON public.qualifications FOR UPDATE
    USING (false);

CREATE POLICY "Deny anon delete to qualifications"
    ON public.qualifications FOR DELETE
    USING (false);

CREATE POLICY "Deny anon insert to students"
    ON public.students FOR INSERT
    WITH CHECK (false);

CREATE POLICY "Deny anon update to students"
    ON public.students FOR UPDATE
    USING (false);

CREATE POLICY "Deny anon delete to students"
    ON public.students FOR DELETE
    USING (false);
