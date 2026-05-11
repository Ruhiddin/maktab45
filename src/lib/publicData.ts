import { isPlaceholderMode, MOCK_ADMIN_SETTINGS, MOCK_QUALIFICATIONS, MOCK_TEACHERS, MOCK_RANKINGS } from './mockData';
import { supabase } from './supabase';
import type { Qualification, TeacherPublicProfile, TeacherRank } from '../types';
import { buildArchiveTeacherPublicProfile, buildArchiveTeacherRankingData, type ArchiveSnapshot } from './archiveSnapshot';
import {
  adaptLiveTeacherRankingRow,
  buildTeacherPublicProfile,
  buildTeacherRankingFromQualifications,
} from './teacherRanking';

type HoverQualification = Pick<
  Qualification,
  'category' | 'subject' | 'value' | 'created_at' | 'teacher_note'
>;

export async function fetchPublicSettingsDirect() {
  if (isPlaceholderMode()) {
    return {
      school_name: MOCK_ADMIN_SETTINGS.school_name,
      current_academic_year: MOCK_ADMIN_SETTINGS.current_academic_year,
    };
  }

  const { data } = await supabase
    .from('admin_settings')
    .select('school_name, current_academic_year')
    .eq('id', 1)
    .single();

  return data || null;
}

export async function fetchStudentHoverData(studentId: string) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const initTotals = () => ({
    Academic: 0,
    Behavior: 0,
    Extracurricular: 0,
    Attendance: 0,
  });

  if (isPlaceholderMode()) {
    const recent = MOCK_QUALIFICATIONS
      .filter((qualification) => qualification.student_id === studentId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8)
      .map((qualification) => ({
        category: qualification.category,
        subject: qualification.subject,
        value: qualification.value,
        created_at: qualification.created_at,
        teacher_note: qualification.teacher_note,
      })) as HoverQualification[];

    const totals = initTotals();
    for (const qualification of MOCK_QUALIFICATIONS) {
      if (qualification.student_id !== studentId) continue;
      if (new Date(qualification.created_at) < cutoff) continue;
      totals[qualification.category] += qualification.value;
    }

    return { totals, recent };
  }

  const { data } = await supabase
    .from('qualifications')
    .select('category,subject,value,created_at,teacher_note')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(60);

  const rows = ((data || []) as HoverQualification[]);
  const recent = rows.slice(0, 8);
  const totals = initTotals();

  for (const qualification of rows) {
    if (new Date(qualification.created_at) < cutoff) continue;
    totals[qualification.category] += qualification.value;
  }

  return { totals, recent };
}

export async function fetchPublicTeacherName(teacherId: string) {
  if (isPlaceholderMode()) {
    const teacher = MOCK_TEACHERS.find((entry) => entry.id === teacherId && entry.is_active);
    return teacher ? { id: teacher.id, full_name: teacher.full_name } : null;
  }

  const { data } = await supabase
    .from('teachers')
    .select('id, full_name')
    .eq('id', teacherId)
    .eq('is_active', true)
    .single();

  return data || null;
}

export async function fetchMostActiveTeacherForClass(grade: number, section?: string | null) {
  if (isPlaceholderMode()) {
    const students = MOCK_RANKINGS.filter(
      (student) => student.grade === grade && (!section || student.section === section)
    );
    const studentIds = students.map((student) => student.student_id);
    const teacherCounts = new Map<string, number>();

    for (const qualification of MOCK_QUALIFICATIONS) {
      if (studentIds.includes(qualification.student_id) && qualification.teacher_id) {
        teacherCounts.set(
          qualification.teacher_id,
          (teacherCounts.get(qualification.teacher_id) || 0) + 1
        );
      }
    }

    let mostActiveTeacherId: string | null = null;
    let maxCount = 0;
    for (const [teacherId, count] of teacherCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        mostActiveTeacherId = teacherId;
      }
    }

    if (!mostActiveTeacherId) {
      return { teacher: null, qualification_count: 0 };
    }

    const teacher = MOCK_TEACHERS.find((entry) => entry.id === mostActiveTeacherId);
    return {
      teacher: teacher ? { id: teacher.id, full_name: teacher.full_name } : null,
      qualification_count: maxCount,
    };
  }

  let studentQuery = supabase.from('students').select('id').eq('grade', grade).eq('is_active', true);
  if (section) {
    studentQuery = studentQuery.eq('section', section);
  }

  const { data: studentsData } = await studentQuery;
  const studentIds = (studentsData || []).map((student: { id: string }) => student.id);
  if (studentIds.length === 0) {
    return { teacher: null, qualification_count: 0 };
  }

  const { data: qualifications } = await supabase
    .from('qualifications')
    .select('teacher_id')
    .in('student_id', studentIds);

  const teacherCounts = new Map<string, number>();
  for (const qualification of qualifications || []) {
    if (!qualification.teacher_id) continue;
    teacherCounts.set(
      qualification.teacher_id,
      (teacherCounts.get(qualification.teacher_id) || 0) + 1
    );
  }

  let mostActiveTeacherId: string | null = null;
  let maxCount = 0;
  for (const [teacherId, count] of teacherCounts.entries()) {
    if (count > maxCount) {
      mostActiveTeacherId = teacherId;
      maxCount = count;
    }
  }

  if (!mostActiveTeacherId) {
    return { teacher: null, qualification_count: 0 };
  }

  const teacher = await fetchPublicTeacherName(mostActiveTeacherId);
  return {
    teacher,
    qualification_count: maxCount,
  };
}

export function normalizeArchiveTeacherRanking(archive: ArchiveSnapshot | null): TeacherRank[] {
  return buildArchiveTeacherRankingData(archive);
}

export function normalizeArchiveTeacherProfile(
  archive: ArchiveSnapshot | null,
  teacherId: string
): TeacherPublicProfile | null {
  return buildArchiveTeacherPublicProfile(archive, teacherId);
}

export async function fetchPublicTeacherRankingDirect(): Promise<TeacherRank[]> {
  if (isPlaceholderMode()) {
    return buildTeacherRankingFromQualifications(MOCK_TEACHERS, MOCK_QUALIFICATIONS);
  }

  const { data } = await supabase
    .from('live_teacher_ranking')
    .select('*')
    .order('activity_score', { ascending: false })
    .order('unique_students_count', { ascending: false })
      .order('category_coverage_count', { ascending: false })
      .order('recent_activity_count', { ascending: false })
      .order('full_name', { ascending: true });

  return ((data || []) as any[]).map(adaptLiveTeacherRankingRow);
}

export async function fetchPublicTeacherProfileDirect(teacherId: string): Promise<TeacherPublicProfile | null> {
  if (isPlaceholderMode()) {
    const teacher = MOCK_TEACHERS.find((entry) => entry.id === teacherId && entry.is_active);
    if (!teacher) return null;
    const rankings = buildTeacherRankingFromQualifications(MOCK_TEACHERS, MOCK_QUALIFICATIONS);
    return buildTeacherPublicProfile(teacher, rankings, MOCK_QUALIFICATIONS, MOCK_RANKINGS.map((student) => ({
      id: student.student_id,
      grade: student.grade,
      section: student.section,
    })));
  }

  const [rankingResult, teacherResult, qualificationsResult, studentsResult] = await Promise.all([
    supabase
      .from('live_teacher_ranking')
      .select('*')
      .eq('teacher_id', teacherId)
      .single(),
    supabase
      .from('teachers')
      .select('id, full_name, subjects, is_active')
      .eq('id', teacherId)
      .eq('is_active', true)
      .single(),
    supabase
      .from('qualifications')
      .select('id, student_id, teacher_id, category, subject, value, teacher_note, created_at')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('students')
      .select('id, grade, section')
      .eq('is_active', true),
  ]);

  if (rankingResult.error || !rankingResult.data || teacherResult.error || !teacherResult.data) {
    return null;
  }

  return buildTeacherPublicProfile(
    {
      id: String(teacherResult.data.id),
      full_name: teacherResult.data.full_name ?? 'Unknown Teacher',
      subjects: Array.isArray(teacherResult.data.subjects) ? teacherResult.data.subjects.map(String) : [],
      is_active: teacherResult.data.is_active ?? true,
    },
    [adaptLiveTeacherRankingRow(rankingResult.data)],
    ((qualificationsResult.data || []) as Qualification[]),
    ((studentsResult.data || []) as Array<{ id: string; grade: number; section: string | null }>)
  );
}
