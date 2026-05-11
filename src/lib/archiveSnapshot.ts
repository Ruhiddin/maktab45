import type { Qualification, StudentDetail, StudentRank } from '../types';

export interface ArchiveSnapshot {
  year: number;
  created_at: string;
  students?: Array<Record<string, any>>;
  qualifications?: Array<Record<string, any>>;
  rankings?: Array<Record<string, any>>;
}

export function normalizeArchiveStudent(student: Record<string, any>): StudentDetail {
  return {
    id: String(student.id),
    full_name: student.full_name ?? student.name ?? 'Unknown Student',
    gender: student.gender,
    grade: Number(student.grade),
    section: student.section ?? null,
    avatar_url: student.avatar_url ?? null,
    is_active: student.is_active ?? true,
    created_at: student.created_at ?? new Date(0).toISOString(),
  };
}

export function normalizeArchiveQualification(qualification: Record<string, any>): Qualification {
  return {
    id: String(qualification.id),
    student_id: String(qualification.student_id),
    teacher_id: qualification.teacher_id ?? null,
    category: qualification.category,
    subject: qualification.subject ?? null,
    value: Number(qualification.value ?? 0),
    teacher_note: qualification.teacher_note ?? null,
    created_at: qualification.created_at ?? new Date(0).toISOString(),
  };
}

export function buildArchiveRankingData(archive: ArchiveSnapshot | null): StudentRank[] {
  if (!archive) {
    return [];
  }

  if (archive.rankings?.length) {
    return archive.rankings.map((ranking) => ({
      student_id: String(ranking.student_id ?? ranking.id),
      name: ranking.name ?? ranking.full_name ?? 'Unknown Student',
      gender: ranking.gender,
      grade: Number(ranking.grade),
      section: ranking.section ?? null,
      avatar_url: ranking.avatar_url ?? null,
      total_score: Number(ranking.total_score ?? 0),
      academic_score: Number(ranking.academic_score ?? 0),
      behavior_score: Number(ranking.behavior_score ?? 0),
      extracurricular_score: Number(ranking.extracurricular_score ?? 0),
      attendance_score: Number(ranking.attendance_score ?? 0),
      recent_activity_count: Number(ranking.recent_activity_count ?? 0),
      trend: ranking.trend ?? 'flat',
      rank_delta: Number(ranking.rank_delta ?? 0),
    }));
  }

  const students = (archive.students ?? []).map(normalizeArchiveStudent);
  const qualifications = (archive.qualifications ?? []).map(normalizeArchiveQualification);
  const scoreMap = new Map<
    string,
    { total: number; academic: number; behavior: number; extracurricular: number; attendance: number }
  >();

  for (const qualification of qualifications) {
    const current = scoreMap.get(qualification.student_id) || {
      total: 0,
      academic: 0,
      behavior: 0,
      extracurricular: 0,
      attendance: 0,
    };

    current.total += qualification.value;
    if (qualification.category === 'Academic') current.academic += qualification.value;
    if (qualification.category === 'Behavior') current.behavior += qualification.value;
    if (qualification.category === 'Extracurricular') current.extracurricular += qualification.value;
    if (qualification.category === 'Attendance') current.attendance += qualification.value;
    scoreMap.set(qualification.student_id, current);
  }

  return students
    .map((student) => {
      const scores = scoreMap.get(student.id) || {
        total: 0,
        academic: 0,
        behavior: 0,
        extracurricular: 0,
        attendance: 0,
      };

      return {
        student_id: student.id,
        name: student.full_name,
        gender: student.gender,
        grade: student.grade,
        section: student.section,
        avatar_url: student.avatar_url,
        total_score: scores.total,
        academic_score: scores.academic,
        behavior_score: scores.behavior,
        extracurricular_score: scores.extracurricular,
        attendance_score: scores.attendance,
        recent_activity_count: 0,
        trend: 'flat',
        rank_delta: 0,
      } satisfies StudentRank;
    })
    .sort((a, b) => (b.total_score - a.total_score) || a.name.localeCompare(b.name));
}
