import type { StudentDetail, StudentRank, Qualification, Teacher, AdminSettings, AuditLogEntry } from '../types';
import { normalizeTeacherSubjects } from './teacherSubjects';

export const MOCK_ADMIN_SETTINGS: AdminSettings = {
  school_name: 'School #45, Fergana',
  available_sections: ['A', 'B', 'C', 'D'],
  current_academic_year: '2025-2026',
};

export const MOCK_TEACHERS: Teacher[] = [
  { id: 't1', full_name: 'Gulnora Karimova', subjects: ['Math', 'Algebra'], is_password_changed: false, is_active: true, created_at: '2025-09-01T00:00:00Z', updated_at: '2025-09-01T00:00:00Z' },
  { id: 't2', full_name: 'Bobur Mirzaev', subjects: ['Physics', 'Chemistry'], is_password_changed: true, is_active: true, created_at: '2025-09-01T00:00:00Z', updated_at: '2025-09-01T00:00:00Z' },
  { id: 't3', full_name: 'Dilbar Alieva', subjects: ['Literature', 'Language'], is_password_changed: true, is_active: true, created_at: '2025-09-01T00:00:00Z', updated_at: '2025-09-01T00:00:00Z' },
];

export const MOCK_TEACHER_PASSWORDS = new Map<string, string>([
  ['t1', 'teacher123'],
  ['t2', 'teacher234'],
  ['t3', 'teacher345'],
]);

export const MOCK_AUDIT_LOG: AuditLogEntry[] = [
  { id: 'a1', actor_type: 'admin', actor_id: null, action: 'student.import', target_type: 'student', target_id: null, details: { count: 8 }, created_at: '2025-09-01T00:00:00Z', actor_name: 'Admin' },
  { id: 'a2', actor_type: 'teacher', actor_id: 't1', action: 'qualification.create', target_type: 'qualification', target_id: '1', details: { value: 5, category: 'Academic', student_name: 'Alisher Navoiy' }, created_at: '2025-09-02T10:00:00Z', actor_name: 'Gulnora Karimova' },
];

export const MOCK_STUDENTS: StudentDetail[] = [
  { id: '1', full_name: 'Alisher Navoiy', gender: 'male', grade: 10, section: 'A', avatar_url: null, is_active: true, created_at: '2025-09-01T00:00:00Z' },
  { id: '2', full_name: 'Zulfiya Isroilova', gender: 'female', grade: 11, section: 'B', avatar_url: null, is_active: true, created_at: '2025-09-01T00:00:00Z' },
  { id: '3', full_name: 'Abdulla Qodiriy', gender: 'male', grade: 9, section: 'A', avatar_url: null, is_active: true, created_at: '2025-09-01T00:00:00Z' },
  { id: '4', full_name: 'Nodira Begim', gender: 'female', grade: 10, section: 'B', avatar_url: null, is_active: true, created_at: '2025-09-01T00:00:00Z' },
  { id: '5', full_name: "Cho'lpon", gender: 'male', grade: 8, section: 'C', avatar_url: null, is_active: true, created_at: '2025-09-01T00:00:00Z' },
  { id: '6', full_name: 'Bobur Mirzo', gender: 'male', grade: 10, section: 'A', avatar_url: null, is_active: true, created_at: '2025-09-01T00:00:00Z' },
  { id: '7', full_name: 'Gulnora Karimova', gender: 'female', grade: 9, section: 'B', avatar_url: null, is_active: true, created_at: '2025-09-01T00:00:00Z' },
  { id: '8', full_name: 'Temur Malik', gender: 'male', grade: 11, section: 'C', avatar_url: null, is_active: true, created_at: '2025-09-01T00:00:00Z' },
];

export const MOCK_RANKINGS: StudentRank[] = [
  { student_id: '1', name: 'Alisher Navoiy', gender: 'male', grade: 10, section: 'A', avatar_url: null, total_score: 15, academic_score: 10, behavior_score: 5, extracurricular_score: 0, attendance_score: 0, recent_activity_count: 3, trend: 'up' },
  { student_id: '2', name: 'Zulfiya Isroilova', gender: 'female', grade: 11, section: 'B', avatar_url: null, total_score: 12, academic_score: 8, behavior_score: 2, extracurricular_score: 2, attendance_score: 0, recent_activity_count: 2, trend: 'flat' },
  { student_id: '3', name: 'Abdulla Qodiriy', gender: 'male', grade: 9, section: 'A', avatar_url: null, total_score: 10, academic_score: 5, behavior_score: 5, extracurricular_score: 0, attendance_score: 0, recent_activity_count: 1, trend: 'up' },
  { student_id: '4', name: 'Nodira Begim', gender: 'female', grade: 10, section: 'B', avatar_url: null, total_score: 7, academic_score: 7, behavior_score: 0, extracurricular_score: 0, attendance_score: 0, recent_activity_count: 0, trend: 'down' },
  { student_id: '5', name: "Cho'lpon", gender: 'male', grade: 8, section: 'C', avatar_url: null, total_score: 5, academic_score: 3, behavior_score: 1, extracurricular_score: 1, attendance_score: 0, recent_activity_count: 1, trend: 'up' },
  { student_id: '6', name: 'Bobur Mirzo', gender: 'male', grade: 10, section: 'A', avatar_url: null, total_score: 4, academic_score: 2, behavior_score: 1, extracurricular_score: 0, attendance_score: 1, recent_activity_count: 0, trend: 'flat' },
  { student_id: '7', name: 'Gulnora Karimova', gender: 'female', grade: 9, section: 'B', avatar_url: null, total_score: 3, academic_score: 1, behavior_score: 1, extracurricular_score: 1, attendance_score: 0, recent_activity_count: 0, trend: 'up' },
  { student_id: '8', name: 'Temur Malik', gender: 'male', grade: 11, section: 'C', avatar_url: null, total_score: 2, academic_score: 2, behavior_score: 0, extracurricular_score: 0, attendance_score: 0, recent_activity_count: 0, trend: 'down' },
];

// Generate mock qualifications with time series data for progress charts
function generateMockQualifications(): Qualification[] {
  const categories: Qualification['category'][] = ['Academic', 'Behavior', 'Extracurricular', 'Attendance'];
  const subjects = ['Math', 'Physics', 'Chemistry', 'Biology', 'Literature', 'History', 'General'];
  const qualifications: Qualification[] = [];
  let idCounter = 1;

  for (const student of MOCK_STUDENTS) {
    // Generate ~15-25 qualification entries spread over 60 days
    const count = 15 + Math.floor(Math.random() * 11);
    for (let i = 0; i < count; i++) {
      const daysAgo = Math.floor(Math.random() * 60);
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      date.setHours(Math.floor(Math.random() * 12) + 7);

      const category = categories[Math.floor(Math.random() * categories.length)];
      const values = [-5, -3, -1, 1, 3, 5];
      // Bias toward positive for higher-ranked students
      const studentIndex = MOCK_STUDENTS.indexOf(student);
      const positiveWeight = 1 - (studentIndex / MOCK_STUDENTS.length) * 0.5;
      const value = Math.random() < positiveWeight
        ? values[3 + Math.floor(Math.random() * 3)]
        : values[Math.floor(Math.random() * 3)];
        
      const teacher = MOCK_TEACHERS[Math.floor(Math.random() * MOCK_TEACHERS.length)];

      const teacherSubjects = normalizeTeacherSubjects(teacher.subjects);

      qualifications.push({
        id: String(idCounter++),
        student_id: student.id,
        teacher_id: teacher.id,
        category,
        subject: category === 'Academic'
          ? (teacherSubjects[Math.floor(Math.random() * teacherSubjects.length)] || subjects[Math.floor(Math.random() * (subjects.length - 1))])
          : (teacherSubjects[0] || 'General'),
        value,
        teacher_note: value >= 3 ? 'Excellent work!' : value <= -3 ? 'Needs improvement' : null,
        created_at: date.toISOString(),
      });
    }
  }

  return qualifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export const MOCK_QUALIFICATIONS = generateMockQualifications();

export function recalculateMockRankings() {
  const now = Date.now();
  const last7DaysMs = 7 * 24 * 60 * 60 * 1000;
  const rankings = MOCK_STUDENTS
    .filter(student => student.is_active)
    .map(student => {
      const qualifications = MOCK_QUALIFICATIONS.filter(q => q.student_id === student.id);
      const scores = {
        Academic: 0,
        Behavior: 0,
        Extracurricular: 0,
        Attendance: 0,
      };
      let recent_activity_count = 0;
      let last7DayDelta = 0;

      for (const qualification of qualifications) {
        scores[qualification.category] += qualification.value;
        if (now - new Date(qualification.created_at).getTime() <= last7DaysMs) {
          recent_activity_count += 1;
          last7DayDelta += qualification.value;
        }
      }

      return {
        student_id: student.id,
        name: student.full_name,
        gender: student.gender,
        grade: student.grade,
        section: student.section,
        avatar_url: student.avatar_url,
        total_score: scores.Academic + scores.Behavior + scores.Extracurricular + scores.Attendance,
        academic_score: scores.Academic,
        behavior_score: scores.Behavior,
        extracurricular_score: scores.Extracurricular,
        attendance_score: scores.Attendance,
        recent_activity_count,
        trend: last7DayDelta > 0 ? 'up' : last7DayDelta < 0 ? 'down' : 'flat',
      } satisfies StudentRank;
    })
    .sort((a, b) => (b.total_score - a.total_score) || a.name.localeCompare(b.name));

  MOCK_RANKINGS.splice(0, MOCK_RANKINGS.length, ...rankings);
  return MOCK_RANKINGS;
}

export function isPlaceholderMode(): boolean {
  const url = import.meta.env?.PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  return url === 'https://placeholder.supabase.co';
}

/**
 * Archives mock data: snapshots current state, wipes qualifications, promotes grades.
 * Returns the archive object ready to be written to JSON.
 */
export function archiveMockData(year: number) {
  // Snapshot current state
  const archive = {
    year,
    created_at: new Date().toISOString(),
    students: MOCK_STUDENTS.map(s => ({ ...s })),
    qualifications: MOCK_QUALIFICATIONS.map(q => ({ ...q })),
    rankings: MOCK_RANKINGS.map(r => ({ ...r })),
  };

  // Wipe qualifications
  MOCK_QUALIFICATIONS.length = 0;

  // Promote grades (max 11)
  for (const student of MOCK_STUDENTS) {
    if (student.grade < 11) {
      student.grade += 1;
    }
  }

  // Reset ranking scores to 0 since qualifications are wiped
  for (const rank of MOCK_RANKINGS) {
    rank.total_score = 0;
    rank.academic_score = 0;
    rank.behavior_score = 0;
    rank.extracurricular_score = 0;
    rank.attendance_score = 0;
    rank.recent_activity_count = 0;
    rank.trend = 'flat';
    // Also promote grade on rankings
    const student = MOCK_STUDENTS.find(s => s.id === rank.student_id);
    if (student) rank.grade = student.grade;
  }

  return archive;
}
