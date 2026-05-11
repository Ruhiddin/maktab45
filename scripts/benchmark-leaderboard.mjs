import { performance } from 'node:perf_hooks';

const STUDENT_COUNT = 240;
const TEACHER_COUNT = 6;
const THRESHOLD_MS = 2000;
const GRADES = [5, 6, 7, 8, 9, 10];
const SECTIONS = ['A', 'B', 'C', 'D'];
const CATEGORIES = ['Academic', 'Behavior', 'Extracurricular', 'Attendance'];

function buildDataset() {
  const teachers = Array.from({ length: TEACHER_COUNT }, (_, index) => ({
    id: `teacher-${index + 1}`,
    full_name: `Teacher ${index + 1}`,
    subjects: ['Math'],
  }));

  const students = Array.from({ length: STUDENT_COUNT }, (_, index) => {
    const grade = GRADES[index % GRADES.length];
    const section = SECTIONS[index % SECTIONS.length];
    const academic = (index * 7) % 31;
    const behavior = (index * 5) % 19;
    const extracurricular = (index * 3) % 17;
    const attendance = (index * 11) % 13;

    return {
      student_id: `student-${index + 1}`,
      name: `Student ${index + 1}`,
      gender: index % 2 === 0 ? 'male' : 'female',
      grade,
      section,
      avatar_url: null,
      total_score: academic + behavior + extracurricular + attendance,
      academic_score: academic,
      behavior_score: behavior,
      extracurricular_score: extracurricular,
      attendance_score: attendance,
      recent_activity_count: (index % 5) + 1,
      created_at: new Date(Date.now() - (index % 10) * 24 * 60 * 60 * 1000).toISOString(),
    };
  });

  return { students, teachers };
}

function computeBadgeMap(students) {
  const byClass = new Map();
  for (const student of students) {
    const key = `${student.grade}::${student.section ?? ''}`;
    const existing = byClass.get(key);
    if (existing) {
      existing.students.push(student);
      existing.topScore = Math.max(existing.topScore, student.total_score);
    } else {
      byClass.set(key, { students: [student], topScore: student.total_score });
    }
  }

  const badgeMap = new Map();
  const now = Date.now();

  for (const student of students) {
    const key = `${student.grade}::${student.section ?? ''}`;
    const stats = byClass.get(key);
    const badges = [];

    if (
      student.academic_score > 0 &&
      student.behavior_score > 0 &&
      student.extracurricular_score > 0 &&
      student.attendance_score > 0
    ) {
      badges.push('all_rounder');
    }

    if (stats && student.total_score === stats.topScore) {
      badges.push('top_performer');
    }

    if (student.recent_activity_count >= 3) {
      badges.push('hot_streak');
    }

    if (now - new Date(student.created_at).getTime() <= 7 * 24 * 60 * 60 * 1000) {
      badges.push('new_student');
    }

    badgeMap.set(student.student_id, badges);
  }

  return badgeMap;
}

function benchmark() {
  const { students, teachers } = buildDataset();

  const start = performance.now();

  const sorted = [...students].sort((a, b) => b.total_score - a.total_score || a.student_id.localeCompare(b.student_id));
  const rankMap = new Map(sorted.map((student, index) => [student.student_id, index + 1]));

  const last7dByStudent = new Map();
  for (const student of students) {
    last7dByStudent.set(student.student_id, student.recent_activity_count * 2);
  }

  const priorRanks = [...students]
    .map(student => ({
      id: student.student_id,
      score7: student.total_score - (last7dByStudent.get(student.student_id) ?? 0),
    }))
    .sort((a, b) => b.score7 - a.score7 || a.id.localeCompare(b.id));

  const priorRankMap = new Map(priorRanks.map((student, index) => [student.id, index + 1]));
  const enriched = sorted.map(student => ({
    ...student,
    rank_delta: (priorRankMap.get(student.student_id) ?? 0) - (rankMap.get(student.student_id) ?? 0),
  }));

  const badgeMap = computeBadgeMap(enriched);
  const end = performance.now();

  return {
    elapsedMs: Number((end - start).toFixed(2)),
    studentCount: enriched.length,
    teacherCount: teachers.length,
    badgeCount: [...badgeMap.values()].reduce((sum, badges) => sum + badges.length, 0),
  };
}

const result = benchmark();
const passed = result.elapsedMs < THRESHOLD_MS;

console.log(`Leaderboard benchmark: ${result.elapsedMs}ms for ${result.studentCount} students and ${result.teacherCount} teachers`);
console.log(`Computed ${result.badgeCount} badges`);

if (!passed) {
  console.error(`Performance threshold exceeded (${THRESHOLD_MS}ms)`);
  process.exitCode = 1;
}
