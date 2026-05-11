// scripts/test-teacher-ranking.ts
import assert from "node:assert/strict";

// src/lib/teacherRanking.ts
var TEACHER_RECENT_ACTIVITY_WINDOW_DAYS = 7;
function toDateKey(value) {
  return new Date(value).toISOString().slice(0, 10);
}
function createTeacherAggregate() {
  return {
    qualification_count: 0,
    unique_students: /* @__PURE__ */ new Set(),
    active_days: /* @__PURE__ */ new Set(),
    categories: /* @__PURE__ */ new Set(),
    recent_activity_count: 0,
    weighted_event_credit: 0,
    sameDayStudentCounts: /* @__PURE__ */ new Map()
  };
}
function getTeacherCategoryWeight(category) {
  if (category === "Behavior") return 1.25;
  if (category === "Attendance") return 1.2;
  if (category === "Extracurricular") return 1.05;
  return 1;
}
function adaptLiveTeacherRankingRow(row) {
  return {
    teacher_id: String(row.teacher_id ?? row.id),
    full_name: row.full_name ?? row.name ?? "Unknown Teacher",
    subjects: Array.isArray(row.subjects) ? row.subjects.map(String) : [],
    qualification_count: Number(row.qualification_count ?? 0),
    unique_students_count: Number(row.unique_students_count ?? 0),
    active_days_count: Number(row.active_days_count ?? 0),
    category_coverage_count: Number(row.category_coverage_count ?? 0),
    recent_activity_count: Number(row.recent_activity_count ?? 0),
    activity_score: Number(row.activity_score ?? 0),
    trend: row.trend ?? "flat",
    rank_delta: Number(row.rank_delta ?? 0)
  };
}
function adaptArchiveTeacherRankingRow(row) {
  return adaptLiveTeacherRankingRow(row);
}
function sortTeacherRanks(ranks) {
  return [...ranks].sort((a, b) => {
    if (b.activity_score !== a.activity_score) return b.activity_score - a.activity_score;
    if (b.unique_students_count !== a.unique_students_count) return b.unique_students_count - a.unique_students_count;
    if (b.category_coverage_count !== a.category_coverage_count) return b.category_coverage_count - a.category_coverage_count;
    if (b.recent_activity_count !== a.recent_activity_count) return b.recent_activity_count - a.recent_activity_count;
    return a.full_name.localeCompare(b.full_name);
  });
}
function filterCountedTeacherQualifications(qualifications) {
  const countedQualifications = [];
  const sameDayStudentCounts = /* @__PURE__ */ new Map();
  const sortedQualifications = [...qualifications].sort((a, b) => {
    const byCreatedAt = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (byCreatedAt !== 0) return byCreatedAt;
    return a.id.localeCompare(b.id);
  });
  for (const qualification of sortedQualifications) {
    const day = toDateKey(qualification.created_at);
    const sameDayKey = `${qualification.student_id}::${day}`;
    const currentCount = sameDayStudentCounts.get(sameDayKey) ?? 0;
    if (currentCount >= 3) continue;
    sameDayStudentCounts.set(sameDayKey, currentCount + 1);
    countedQualifications.push(qualification);
  }
  return countedQualifications;
}
function buildTeacherRankingFromQualifications(teachers, qualifications, now = /* @__PURE__ */ new Date()) {
  const teacherMap = new Map(
    teachers.filter((teacher) => teacher.is_active !== false).map((teacher) => [teacher.id, teacher])
  );
  const aggregates = /* @__PURE__ */ new Map();
  const recentCutoff = now.getTime() - TEACHER_RECENT_ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1e3;
  const getAggregate = (teacherId) => {
    let aggregate = aggregates.get(teacherId);
    if (!aggregate) {
      aggregate = createTeacherAggregate();
      aggregates.set(teacherId, aggregate);
    }
    return aggregate;
  };
  const sortedQualifications = [...qualifications].sort((a, b) => {
    const byCreatedAt = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (byCreatedAt !== 0) return byCreatedAt;
    return a.id.localeCompare(b.id);
  });
  for (const qualification of sortedQualifications) {
    if (!qualification.teacher_id || !teacherMap.has(qualification.teacher_id)) continue;
    const aggregate = getAggregate(qualification.teacher_id);
    const day = toDateKey(qualification.created_at);
    const sameDayKey = `${qualification.student_id}::${day}`;
    const currentCount = aggregate.sameDayStudentCounts.get(sameDayKey) ?? 0;
    if (currentCount >= 3) continue;
    aggregate.sameDayStudentCounts.set(sameDayKey, currentCount + 1);
    aggregate.qualification_count += 1;
    aggregate.unique_students.add(qualification.student_id);
    aggregate.active_days.add(day);
    aggregate.categories.add(qualification.category);
    aggregate.weighted_event_credit += getTeacherCategoryWeight(qualification.category);
    if (new Date(qualification.created_at).getTime() >= recentCutoff) {
      aggregate.recent_activity_count += 1;
    }
  }
  const ranks = teachers.filter((teacher) => teacher.is_active !== false).map((teacher) => {
    const aggregate = aggregates.get(teacher.id);
    const qualification_count = aggregate?.qualification_count ?? 0;
    const unique_students_count = aggregate?.unique_students.size ?? 0;
    const active_days_count = aggregate?.active_days.size ?? 0;
    const category_coverage_count = aggregate?.categories.size ?? 0;
    const recent_activity_count = aggregate?.recent_activity_count ?? 0;
    const activity_score = Number(((aggregate?.weighted_event_credit ?? 0) + unique_students_count * 0.2 + Math.max(category_coverage_count - 1, 0) * 0.35 + active_days_count * 0.15).toFixed(2));
    return {
      teacher_id: teacher.id,
      full_name: teacher.full_name,
      subjects: teacher.subjects,
      qualification_count,
      unique_students_count,
      active_days_count,
      category_coverage_count,
      recent_activity_count,
      activity_score,
      trend: "flat",
      rank_delta: 0
    };
  });
  return sortTeacherRanks(ranks);
}

// src/lib/archiveSnapshot.ts
function normalizeArchiveQualification(qualification) {
  return {
    id: String(qualification.id),
    student_id: String(qualification.student_id),
    teacher_id: qualification.teacher_id ?? null,
    category: qualification.category,
    subject: qualification.subject ?? null,
    value: Number(qualification.value ?? 0),
    teacher_note: qualification.teacher_note ?? null,
    created_at: qualification.created_at ?? (/* @__PURE__ */ new Date(0)).toISOString()
  };
}
function normalizeArchiveTeacher(teacher) {
  return {
    id: String(teacher.id),
    full_name: teacher.full_name ?? "Unknown Teacher",
    subjects: Array.isArray(teacher.subjects) ? teacher.subjects.map(String) : [],
    is_password_changed: Boolean(teacher.is_password_changed ?? false),
    is_active: teacher.is_active ?? true,
    created_at: teacher.created_at ?? (/* @__PURE__ */ new Date(0)).toISOString(),
    updated_at: teacher.updated_at ?? teacher.created_at ?? (/* @__PURE__ */ new Date(0)).toISOString()
  };
}
function normalizeArchiveTeacherRank(ranking) {
  return adaptArchiveTeacherRankingRow(ranking);
}
function buildArchiveTeacherRankingData(archive) {
  if (!archive) {
    return [];
  }
  if (archive.teacher_ranking?.length) {
    return archive.teacher_ranking.map(normalizeArchiveTeacherRank);
  }
  const teachers = (archive.teachers ?? []).map(normalizeArchiveTeacher);
  if (teachers.length === 0) {
    return [];
  }
  const qualifications = (archive.qualifications ?? []).map(normalizeArchiveQualification);
  return buildTeacherRankingFromQualifications(
    teachers,
    qualifications,
    archive.created_at ? new Date(archive.created_at) : /* @__PURE__ */ new Date()
  );
}

// scripts/test-teacher-ranking.ts
function createQualification(input) {
  return {
    id: input.id,
    student_id: input.studentId,
    teacher_id: input.teacherId ?? "teacher-1",
    category: input.category,
    subject: input.subject ?? input.category,
    value: input.value ?? 1,
    teacher_note: null,
    created_at: input.createdAt
  };
}
function testCategoryWeights() {
  assert.equal(getTeacherCategoryWeight("Academic"), 1);
  assert.equal(getTeacherCategoryWeight("Extracurricular"), 1.05);
  assert.equal(getTeacherCategoryWeight("Attendance"), 1.2);
  assert.equal(getTeacherCategoryWeight("Behavior"), 1.25);
}
function testAntiSpamSameDayCap() {
  const qualifications = [
    createQualification({ id: "q1", studentId: "student-1", category: "Academic", value: 5, createdAt: "2026-02-01T08:00:00.000Z" }),
    createQualification({ id: "q2", studentId: "student-1", category: "Academic", value: -5, createdAt: "2026-02-01T08:05:00.000Z" }),
    createQualification({ id: "q3", studentId: "student-1", category: "Academic", value: 1, createdAt: "2026-02-01T08:10:00.000Z" }),
    createQualification({ id: "q4", studentId: "student-1", category: "Academic", value: 3, createdAt: "2026-02-01T08:15:00.000Z" }),
    createQualification({ id: "q5", studentId: "student-1", category: "Academic", value: -3, createdAt: "2026-02-01T08:20:00.000Z" })
  ];
  const countedQualifications = filterCountedTeacherQualifications(qualifications);
  assert.equal(countedQualifications.length, 3);
  assert.deepEqual(countedQualifications.map((qualification) => qualification.id), ["q1", "q2", "q3"]);
  const ranking = buildTeacherRankingFromQualifications(
    [{ id: "teacher-1", full_name: "Anti Spam Teacher", subjects: ["Math"], is_active: true }],
    qualifications,
    /* @__PURE__ */ new Date("2026-02-10T00:00:00.000Z")
  );
  assert.equal(ranking.length, 1);
  assert.equal(ranking[0].qualification_count, 3);
  assert.equal(ranking[0].unique_students_count, 1);
  assert.equal(ranking[0].active_days_count, 1);
  assert.equal(ranking[0].category_coverage_count, 1);
  assert.equal(ranking[0].activity_score, 3.35);
}
function testActivityScoreFormula() {
  const teacher = { id: "teacher-1", full_name: "Formula Teacher", subjects: ["Math"], is_active: true };
  const categories = [
    ...Array.from({ length: 40 }, () => "Academic"),
    ...Array.from({ length: 10 }, () => "Behavior"),
    ...Array.from({ length: 8 }, () => "Attendance"),
    ...Array.from({ length: 12 }, () => "Extracurricular")
  ];
  const studentIds = Array.from({ length: 44 }, (_, index) => `student-${index + 1}`);
  const qualifications = categories.map((category, index) => {
    const studentId = studentIds[index % studentIds.length];
    const day = String(index % 19 + 1).padStart(2, "0");
    return createQualification({
      id: `formula-${index + 1}`,
      studentId,
      category,
      value: index % 2 === 0 ? 3 : -3,
      createdAt: `2026-01-${day}T09:00:00.000Z`
    });
  });
  const [ranking] = buildTeacherRankingFromQualifications(
    [teacher],
    qualifications,
    /* @__PURE__ */ new Date("2026-01-20T00:00:00.000Z")
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
    created_at: "2025-05-30T00:00:00.000Z",
    teacher_ranking: [
      {
        teacher_id: "teacher-9",
        full_name: "Archive Teacher",
        subjects: ["History"],
        qualification_count: "12",
        unique_students_count: "9",
        active_days_count: "6",
        category_coverage_count: "3",
        recent_activity_count: "4",
        activity_score: "16.55"
      }
    ]
  });
  assert.equal(normalized.length, 1);
  assert.deepEqual(normalized[0], {
    teacher_id: "teacher-9",
    full_name: "Archive Teacher",
    subjects: ["History"],
    qualification_count: 12,
    unique_students_count: 9,
    active_days_count: 6,
    category_coverage_count: 3,
    recent_activity_count: 4,
    activity_score: 16.55,
    trend: "flat",
    rank_delta: 0
  });
}
function testInactiveTeachersAreExcluded() {
  const qualifications = [
    createQualification({
      id: "inactive-1",
      teacherId: "teacher-inactive",
      studentId: "student-1",
      category: "Behavior",
      createdAt: "2026-03-01T09:00:00.000Z"
    }),
    createQualification({
      id: "active-1",
      teacherId: "teacher-active",
      studentId: "student-2",
      category: "Behavior",
      createdAt: "2026-03-01T10:00:00.000Z"
    })
  ];
  const ranking = buildTeacherRankingFromQualifications(
    [
      { id: "teacher-active", full_name: "Active Teacher", subjects: ["Math"], is_active: true },
      { id: "teacher-inactive", full_name: "Inactive Teacher", subjects: ["History"], is_active: false }
    ],
    qualifications,
    /* @__PURE__ */ new Date("2026-03-10T00:00:00.000Z")
  );
  assert.equal(ranking.length, 1);
  assert.equal(ranking[0].teacher_id, "teacher-active");
  assert.equal(ranking[0].qualification_count, 1);
}
function testRankingUpdatesAfterNewQualification() {
  const teachers = [
    { id: "teacher-1", full_name: "Teacher One", subjects: ["Math"], is_active: true },
    { id: "teacher-2", full_name: "Teacher Two", subjects: ["Science"], is_active: true }
  ];
  const baselineQualifications = [
    createQualification({
      id: "base-1",
      teacherId: "teacher-1",
      studentId: "student-1",
      category: "Academic",
      createdAt: "2026-04-01T09:00:00.000Z"
    }),
    createQualification({
      id: "base-2",
      teacherId: "teacher-2",
      studentId: "student-2",
      category: "Academic",
      createdAt: "2026-04-01T10:00:00.000Z"
    })
  ];
  const baselineRanking = buildTeacherRankingFromQualifications(
    teachers,
    baselineQualifications,
    /* @__PURE__ */ new Date("2026-04-08T00:00:00.000Z")
  );
  const baselineTeacherTwoScore = baselineRanking.find((entry) => entry.teacher_id === "teacher-2")?.activity_score ?? 0;
  const updatedRanking = buildTeacherRankingFromQualifications(
    teachers,
    [
      ...baselineQualifications,
      createQualification({
        id: "added-1",
        teacherId: "teacher-2",
        studentId: "student-3",
        category: "Attendance",
        createdAt: "2026-04-02T11:00:00.000Z"
      })
    ],
    /* @__PURE__ */ new Date("2026-04-08T00:00:00.000Z")
  );
  const updatedTeacherTwo = updatedRanking.find((entry) => entry.teacher_id === "teacher-2");
  assert.ok(updatedTeacherTwo);
  assert.ok(updatedTeacherTwo.activity_score > baselineTeacherTwoScore);
  assert.equal(updatedTeacherTwo.qualification_count, 2);
  assert.equal(updatedTeacherTwo.unique_students_count, 2);
}
function testAttendanceAndBehaviorReceiveBroaderRecognition() {
  const teachers = [
    { id: "teacher-academic", full_name: "Academic Teacher", subjects: ["Math"], is_active: true },
    { id: "teacher-support", full_name: "Support Teacher", subjects: ["Homeroom"], is_active: true }
  ];
  const qualifications = [
    createQualification({
      id: "academic-1",
      teacherId: "teacher-academic",
      studentId: "student-1",
      category: "Academic",
      createdAt: "2026-05-01T09:00:00.000Z"
    }),
    createQualification({
      id: "support-1",
      teacherId: "teacher-support",
      studentId: "student-2",
      category: "Attendance",
      createdAt: "2026-05-01T09:30:00.000Z"
    }),
    createQualification({
      id: "support-2",
      teacherId: "teacher-support",
      studentId: "student-3",
      category: "Behavior",
      createdAt: "2026-05-02T09:30:00.000Z"
    })
  ];
  const ranking = buildTeacherRankingFromQualifications(
    teachers,
    qualifications,
    /* @__PURE__ */ new Date("2026-05-10T00:00:00.000Z")
  );
  assert.equal(ranking[0].teacher_id, "teacher-support");
  assert.equal(ranking[0].activity_score, 3.5);
  assert.equal(ranking[1].teacher_id, "teacher-academic");
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
  console.log("Teacher ranking logic tests passed.");
}
main();
