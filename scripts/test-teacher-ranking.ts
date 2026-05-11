import assert from 'node:assert/strict';
import { buildArchiveTeacherRankingData } from '../src/lib/archiveSnapshot';
import {
  buildTeacherRankingFromQualifications,
  filterCountedTeacherQualifications,
  getTeacherCategoryWeight,
} from '../src/lib/teacherRanking';
import type { Qualification } from '../src/types';

function createQualification(input: {
  id: string;
  studentId: string;
  teacherId?: string;
  category: Qualification['category'];
  value?: number;
  createdAt: string;
  subject?: string | null;
}): Qualification {
  return {
    id: input.id,
    student_id: input.studentId,
    teacher_id: input.teacherId ?? 'teacher-1',
    category: input.category,
    subject: input.subject ?? input.category,
    value: input.value ?? 1,
    teacher_note: null,
    created_at: input.createdAt,
  };
}

function testCategoryWeights() {
  assert.equal(getTeacherCategoryWeight('Academic'), 1);
  assert.equal(getTeacherCategoryWeight('Extracurricular'), 1.05);
  assert.equal(getTeacherCategoryWeight('Attendance'), 1.2);
  assert.equal(getTeacherCategoryWeight('Behavior'), 1.25);
}

function testAntiSpamSameDayCap() {
  const qualifications: Qualification[] = [
    createQualification({ id: 'q1', studentId: 'student-1', category: 'Academic', value: 5, createdAt: '2026-02-01T08:00:00.000Z' }),
    createQualification({ id: 'q2', studentId: 'student-1', category: 'Academic', value: -5, createdAt: '2026-02-01T08:05:00.000Z' }),
    createQualification({ id: 'q3', studentId: 'student-1', category: 'Academic', value: 1, createdAt: '2026-02-01T08:10:00.000Z' }),
    createQualification({ id: 'q4', studentId: 'student-1', category: 'Academic', value: 3, createdAt: '2026-02-01T08:15:00.000Z' }),
    createQualification({ id: 'q5', studentId: 'student-1', category: 'Academic', value: -3, createdAt: '2026-02-01T08:20:00.000Z' }),
  ];

  const countedQualifications = filterCountedTeacherQualifications(qualifications);
  assert.equal(countedQualifications.length, 3);
  assert.deepEqual(countedQualifications.map((qualification) => qualification.id), ['q1', 'q2', 'q3']);

  const ranking = buildTeacherRankingFromQualifications(
    [{ id: 'teacher-1', full_name: 'Anti Spam Teacher', subjects: ['Math'], is_active: true }],
    qualifications,
    new Date('2026-02-10T00:00:00.000Z')
  );

  assert.equal(ranking.length, 1);
  assert.equal(ranking[0].qualification_count, 3);
  assert.equal(ranking[0].unique_students_count, 1);
  assert.equal(ranking[0].active_days_count, 1);
  assert.equal(ranking[0].category_coverage_count, 1);
  assert.equal(ranking[0].activity_score, 3.35);
}

function testActivityScoreFormula() {
  const teacher = { id: 'teacher-1', full_name: 'Formula Teacher', subjects: ['Math'], is_active: true };
  const categories: Qualification['category'][] = [
    ...Array.from({ length: 40 }, () => 'Academic' as const),
    ...Array.from({ length: 10 }, () => 'Behavior' as const),
    ...Array.from({ length: 8 }, () => 'Attendance' as const),
    ...Array.from({ length: 12 }, () => 'Extracurricular' as const),
  ];

  const studentIds = Array.from({ length: 44 }, (_, index) => `student-${index + 1}`);
  const qualifications = categories.map((category, index) => {
    const studentId = studentIds[index % studentIds.length];
    const day = String((index % 19) + 1).padStart(2, '0');
    return createQualification({
      id: `formula-${index + 1}`,
      studentId,
      category,
      value: index % 2 === 0 ? 3 : -3,
      createdAt: `2026-01-${day}T09:00:00.000Z`,
    });
  });

  const [ranking] = buildTeacherRankingFromQualifications(
    [teacher],
    qualifications,
    new Date('2026-01-20T00:00:00.000Z')
  );

  assert.ok(ranking);
  assert.equal(ranking.qualification_count, 70);
  assert.equal(ranking.unique_students_count, 44);
  assert.equal(ranking.category_coverage_count, 4);
  assert.equal(ranking.active_days_count, 19);
  assert.equal(ranking.activity_score, 87.4);
}

function testArchiveTeacherRankingNormalization() {
  const normalized = buildArchiveTeacherRankingData({
    year: 2025,
    created_at: '2025-05-30T00:00:00.000Z',
    teacher_ranking: [
      {
        teacher_id: 'teacher-9',
        full_name: 'Archive Teacher',
        subjects: ['History'],
        qualification_count: '12',
        unique_students_count: '9',
        active_days_count: '6',
        category_coverage_count: '3',
        recent_activity_count: '4',
        activity_score: '16.55',
      },
    ],
  });

  assert.equal(normalized.length, 1);
  assert.deepEqual(normalized[0], {
    teacher_id: 'teacher-9',
    full_name: 'Archive Teacher',
    subjects: ['History'],
    qualification_count: 12,
    unique_students_count: 9,
    active_days_count: 6,
    category_coverage_count: 3,
    recent_activity_count: 4,
    activity_score: 16.55,
    trend: 'flat',
    rank_delta: 0,
  });
}

function testInactiveTeachersAreExcluded() {
  const qualifications: Qualification[] = [
    createQualification({
      id: 'inactive-1',
      teacherId: 'teacher-inactive',
      studentId: 'student-1',
      category: 'Behavior',
      createdAt: '2026-03-01T09:00:00.000Z',
    }),
    createQualification({
      id: 'active-1',
      teacherId: 'teacher-active',
      studentId: 'student-2',
      category: 'Behavior',
      createdAt: '2026-03-01T10:00:00.000Z',
    }),
  ];

  const ranking = buildTeacherRankingFromQualifications(
    [
      { id: 'teacher-active', full_name: 'Active Teacher', subjects: ['Math'], is_active: true },
      { id: 'teacher-inactive', full_name: 'Inactive Teacher', subjects: ['History'], is_active: false },
    ],
    qualifications,
    new Date('2026-03-10T00:00:00.000Z')
  );

  assert.equal(ranking.length, 1);
  assert.equal(ranking[0].teacher_id, 'teacher-active');
  assert.equal(ranking[0].qualification_count, 1);
}

function testRankingUpdatesAfterNewQualification() {
  const teachers = [
    { id: 'teacher-1', full_name: 'Teacher One', subjects: ['Math'], is_active: true },
    { id: 'teacher-2', full_name: 'Teacher Two', subjects: ['Science'], is_active: true },
  ];

  const baselineQualifications: Qualification[] = [
    createQualification({
      id: 'base-1',
      teacherId: 'teacher-1',
      studentId: 'student-1',
      category: 'Academic',
      createdAt: '2026-04-01T09:00:00.000Z',
    }),
    createQualification({
      id: 'base-2',
      teacherId: 'teacher-2',
      studentId: 'student-2',
      category: 'Academic',
      createdAt: '2026-04-01T10:00:00.000Z',
    }),
  ];

  const baselineRanking = buildTeacherRankingFromQualifications(
    teachers,
    baselineQualifications,
    new Date('2026-04-08T00:00:00.000Z')
  );
  const baselineTeacherTwoScore = baselineRanking.find((entry) => entry.teacher_id === 'teacher-2')?.activity_score ?? 0;

  const updatedRanking = buildTeacherRankingFromQualifications(
    teachers,
    [
      ...baselineQualifications,
      createQualification({
        id: 'added-1',
        teacherId: 'teacher-2',
        studentId: 'student-3',
        category: 'Attendance',
        createdAt: '2026-04-02T11:00:00.000Z',
      }),
    ],
    new Date('2026-04-08T00:00:00.000Z')
  );

  const updatedTeacherTwo = updatedRanking.find((entry) => entry.teacher_id === 'teacher-2');
  assert.ok(updatedTeacherTwo);
  assert.ok(updatedTeacherTwo.activity_score > baselineTeacherTwoScore);
  assert.equal(updatedTeacherTwo.qualification_count, 2);
  assert.equal(updatedTeacherTwo.unique_students_count, 2);
}

function testAttendanceAndBehaviorReceiveBroaderRecognition() {
  const teachers = [
    { id: 'teacher-academic', full_name: 'Academic Teacher', subjects: ['Math'], is_active: true },
    { id: 'teacher-support', full_name: 'Support Teacher', subjects: ['Homeroom'], is_active: true },
  ];

  const qualifications: Qualification[] = [
    createQualification({
      id: 'academic-1',
      teacherId: 'teacher-academic',
      studentId: 'student-1',
      category: 'Academic',
      createdAt: '2026-05-01T09:00:00.000Z',
    }),
    createQualification({
      id: 'support-1',
      teacherId: 'teacher-support',
      studentId: 'student-2',
      category: 'Attendance',
      createdAt: '2026-05-01T09:30:00.000Z',
    }),
    createQualification({
      id: 'support-2',
      teacherId: 'teacher-support',
      studentId: 'student-3',
      category: 'Behavior',
      createdAt: '2026-05-02T09:30:00.000Z',
    }),
  ];

  const ranking = buildTeacherRankingFromQualifications(
    teachers,
    qualifications,
    new Date('2026-05-10T00:00:00.000Z')
  );

  assert.equal(ranking[0].teacher_id, 'teacher-support');
  assert.equal(ranking[0].activity_score, 3.5);
  assert.equal(ranking[1].teacher_id, 'teacher-academic');
  assert.equal(ranking[1].activity_score, 1.35);
}

function main() {
  testCategoryWeights();
  testAntiSpamSameDayCap();
  testActivityScoreFormula();
  testArchiveTeacherRankingNormalization();
  testInactiveTeachersAreExcluded();
  testRankingUpdatesAfterNewQualification();
  testAttendanceAndBehaviorReceiveBroaderRecognition();
  console.log('Teacher ranking logic tests passed.');
}

main();
