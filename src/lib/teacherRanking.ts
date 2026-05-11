import type {
  Qualification,
  TeacherCategoryBreakdownPoint,
  TeacherClassReachPoint,
  TeacherLeaderboardBadgeType,
  TeacherMonthlyActivityPoint,
  TeacherPublicProfile,
  TeacherRank,
  TeacherSubjectActivityPoint,
  TeacherValueBalance,
} from '../types';

type TeacherLike = {
  id: string;
  full_name: string;
  subjects: string[];
  is_active?: boolean;
};

type StudentLike = {
  id: string;
  grade: number;
  section: string | null;
};

type TeacherRankingRow = Record<string, any>;

type TeacherAggregate = {
  qualification_count: number;
  unique_students: Set<string>;
  active_days: Set<string>;
  categories: Set<string>;
  recent_activity_count: number;
  weighted_event_credit: number;
  sameDayStudentCounts: Map<string, number>;
};

const TEACHER_RECENT_ACTIVITY_WINDOW_DAYS = 7;
const TEACHER_UNIQUE_STUDENTS_BADGE_THRESHOLD = 10;
const TEACHER_ACTIVE_DAYS_BADGE_THRESHOLD = 5;
const TEACHER_HOT_WEEK_BADGE_THRESHOLD = 8;
const TEACHER_CATEGORY_SHARE_BADGE_THRESHOLD = 0.35;

function toDateKey(value: string): string {
  return new Date(value).toISOString().slice(0, 10);
}

function createTeacherAggregate(): TeacherAggregate {
  return {
    qualification_count: 0,
    unique_students: new Set<string>(),
    active_days: new Set<string>(),
    categories: new Set<string>(),
    recent_activity_count: 0,
    weighted_event_credit: 0,
    sameDayStudentCounts: new Map<string, number>(),
  };
}

export function getTeacherCategoryWeight(category: Qualification['category']) {
  if (category === 'Behavior') return 1.25;
  if (category === 'Attendance') return 1.2;
  if (category === 'Extracurricular') return 1.05;
  return 1;
}

export function adaptLiveTeacherRankingRow(row: TeacherRankingRow): TeacherRank {
  return {
    teacher_id: String(row.teacher_id ?? row.id),
    full_name: row.full_name ?? row.name ?? 'Unknown Teacher',
    subjects: Array.isArray(row.subjects) ? row.subjects.map(String) : [],
    qualification_count: Number(row.qualification_count ?? 0),
    unique_students_count: Number(row.unique_students_count ?? 0),
    active_days_count: Number(row.active_days_count ?? 0),
    category_coverage_count: Number(row.category_coverage_count ?? 0),
    recent_activity_count: Number(row.recent_activity_count ?? 0),
    activity_score: Number(row.activity_score ?? 0),
    trend: row.trend ?? 'flat',
    rank_delta: Number(row.rank_delta ?? 0),
  };
}

export function adaptArchiveTeacherRankingRow(row: TeacherRankingRow): TeacherRank {
  return adaptLiveTeacherRankingRow(row);
}

export function sortTeacherRanks(ranks: TeacherRank[]) {
  return [...ranks].sort((a, b) => {
    if (b.activity_score !== a.activity_score) return b.activity_score - a.activity_score;
    if (b.unique_students_count !== a.unique_students_count) return b.unique_students_count - a.unique_students_count;
    if (b.category_coverage_count !== a.category_coverage_count) return b.category_coverage_count - a.category_coverage_count;
    if (b.recent_activity_count !== a.recent_activity_count) return b.recent_activity_count - a.recent_activity_count;
    return a.full_name.localeCompare(b.full_name);
  });
}

export function filterCountedTeacherQualifications(qualifications: Qualification[]): Qualification[] {
  const countedQualifications: Qualification[] = [];
  const sameDayStudentCounts = new Map<string, number>();

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

export function buildTeacherRankingFromQualifications(
  teachers: TeacherLike[],
  qualifications: Qualification[],
  now: Date = new Date()
): TeacherRank[] {
  const teacherMap = new Map(
    teachers
      .filter((teacher) => teacher.is_active !== false)
      .map((teacher) => [teacher.id, teacher])
  );

  const aggregates = new Map<string, TeacherAggregate>();
  const recentCutoff = now.getTime() - TEACHER_RECENT_ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  const getAggregate = (teacherId: string) => {
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

  const ranks = teachers
    .filter((teacher) => teacher.is_active !== false)
    .map((teacher) => {
      const aggregate = aggregates.get(teacher.id);
      const qualification_count = aggregate?.qualification_count ?? 0;
      const unique_students_count = aggregate?.unique_students.size ?? 0;
      const active_days_count = aggregate?.active_days.size ?? 0;
      const category_coverage_count = aggregate?.categories.size ?? 0;
      const recent_activity_count = aggregate?.recent_activity_count ?? 0;
      const activity_score = Number((
        (aggregate?.weighted_event_credit ?? 0)
        + (unique_students_count * 0.2)
        + (Math.max(category_coverage_count - 1, 0) * 0.35)
        + (active_days_count * 0.15)
      ).toFixed(2));

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
        trend: 'flat',
        rank_delta: 0,
      } satisfies TeacherRank;
    });

  return sortTeacherRanks(ranks);
}

export function buildTeacherCategoryBreakdown(
  qualifications: Qualification[]
): TeacherCategoryBreakdownPoint[] {
  const categoryTotals = new Map<Qualification['category'], { count: number; weighted_score: number }>();

  for (const qualification of qualifications) {
    const weight = getTeacherCategoryWeight(qualification.category);
    const categoryEntry = categoryTotals.get(qualification.category) ?? { count: 0, weighted_score: 0 };
    categoryEntry.count += 1;
    categoryEntry.weighted_score += weight;
    categoryTotals.set(qualification.category, categoryEntry);
  }

  return Array.from(categoryTotals.entries())
    .map(([name, totals]) => ({
      name,
      count: totals.count,
      weighted_score: Number(totals.weighted_score.toFixed(2)),
    }))
    .sort((a, b) => b.weighted_score - a.weighted_score || a.name.localeCompare(b.name));
}

export function buildTeacherSubjectActivity(
  qualifications: Qualification[]
): TeacherSubjectActivityPoint[] {
  const subjectTotals = new Map<string, { count: number; weighted_score: number }>();

  for (const qualification of qualifications) {
    const subjectKey = qualification.subject?.trim() || 'General';
    const weight = getTeacherCategoryWeight(qualification.category);
    const subjectEntry = subjectTotals.get(subjectKey) ?? { count: 0, weighted_score: 0 };
    subjectEntry.count += 1;
    subjectEntry.weighted_score += weight;
    subjectTotals.set(subjectKey, subjectEntry);
  }

  return Array.from(subjectTotals.entries())
    .map(([subject, totals]) => ({
      subject,
      count: totals.count,
      weighted_score: Number(totals.weighted_score.toFixed(2)),
    }))
    .sort((a, b) => b.weighted_score - a.weighted_score || a.subject.localeCompare(b.subject));
}

export function buildTeacherMonthlyActivity(
  qualifications: Qualification[]
): TeacherMonthlyActivityPoint[] {
  const monthlyTotals = new Map<string, { qualification_count: number; weighted_score: number }>();

  for (const qualification of qualifications) {
    const month = new Date(qualification.created_at).toISOString().slice(0, 7);
    const weight = getTeacherCategoryWeight(qualification.category);
    const monthlyEntry = monthlyTotals.get(month) ?? { qualification_count: 0, weighted_score: 0 };
    monthlyEntry.qualification_count += 1;
    monthlyEntry.weighted_score += weight;
    monthlyTotals.set(month, monthlyEntry);
  }

  return Array.from(monthlyTotals.entries())
    .map(([month, totals]) => ({
      month,
      qualification_count: totals.qualification_count,
      weighted_score: Number(totals.weighted_score.toFixed(2)),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export function buildTeacherClassReach(
  qualifications: Qualification[],
  students: StudentLike[]
): TeacherClassReachPoint[] {
  const studentMap = new Map(students.map((student) => [student.id, student]));
  const classReach = new Map<string, { grade: number; section: string | null; class_label: string; students: Set<string>; qualification_count: number }>();

  for (const qualification of qualifications) {
    const student = studentMap.get(qualification.student_id);
    if (!student) continue;

    const classLabel = `${student.grade}${student.section ? `-${student.section}` : ''}`;
    const classKey = `${student.grade}::${student.section ?? ''}`;
    const classEntry = classReach.get(classKey) ?? {
      grade: student.grade,
      section: student.section,
      class_label: classLabel,
      students: new Set<string>(),
      qualification_count: 0,
    };
    classEntry.students.add(student.id);
    classEntry.qualification_count += 1;
    classReach.set(classKey, classEntry);
  }

  return Array.from(classReach.values())
    .map((entry) => ({
      grade: entry.grade,
      section: entry.section,
      class_label: entry.class_label,
      students_reached: entry.students.size,
      qualification_count: entry.qualification_count,
    }))
    .sort((a, b) => b.students_reached - a.students_reached || b.qualification_count - a.qualification_count || a.class_label.localeCompare(b.class_label));
}

export function buildTeacherValueBalance(
  qualifications: Qualification[]
): TeacherValueBalance {
  const valueBalance: TeacherValueBalance = { positive_count: 0, negative_count: 0, neutral_count: 0 };

  for (const qualification of qualifications) {
    if (qualification.value > 0) valueBalance.positive_count += 1;
    else if (qualification.value < 0) valueBalance.negative_count += 1;
    else valueBalance.neutral_count += 1;
  }

  return valueBalance;
}

export function computeTeacherLeaderboardBadges(input: {
  ranking: TeacherRank;
  profile?: Pick<TeacherPublicProfile, 'categories'> | null;
}): TeacherLeaderboardBadgeType[] {
  const { ranking, profile } = input;
  const badges: TeacherLeaderboardBadgeType[] = [];
  const categories = profile?.categories ?? [];
  const totalWeightedScore = categories.reduce((sum, entry) => sum + entry.weighted_score, 0);
  const attendanceShare = totalWeightedScore > 0
    ? (categories.find((entry) => entry.name === 'Attendance')?.weighted_score ?? 0) / totalWeightedScore
    : 0;
  const behaviorShare = totalWeightedScore > 0
    ? (categories.find((entry) => entry.name === 'Behavior')?.weighted_score ?? 0) / totalWeightedScore
    : 0;

  if (ranking.category_coverage_count >= 4) badges.push('all_round_mentor');
  if (attendanceShare >= TEACHER_CATEGORY_SHARE_BADGE_THRESHOLD) badges.push('attendance_anchor');
  if (behaviorShare >= TEACHER_CATEGORY_SHARE_BADGE_THRESHOLD) badges.push('behavior_guide');
  if (ranking.unique_students_count >= TEACHER_UNIQUE_STUDENTS_BADGE_THRESHOLD) badges.push('student_reach');
  if (ranking.active_days_count >= TEACHER_ACTIVE_DAYS_BADGE_THRESHOLD) badges.push('steady_presence');
  if (ranking.recent_activity_count >= TEACHER_HOT_WEEK_BADGE_THRESHOLD) badges.push('hot_week');

  return badges;
}

export function buildTeacherPublicProfile(
  teacher: TeacherLike,
  rankings: TeacherRank[],
  qualifications: Qualification[],
  students: StudentLike[]
): TeacherPublicProfile | null {
  const ranking = rankings.find((entry) => entry.teacher_id === teacher.id);
  if (!ranking) {
    return null;
  }

  const countedQualifications = filterCountedTeacherQualifications(
    qualifications.filter((qualification) => qualification.teacher_id === teacher.id)
  );

  const categories = buildTeacherCategoryBreakdown(countedQualifications);
  const subjects_breakdown = buildTeacherSubjectActivity(countedQualifications);
  const monthly_activity = buildTeacherMonthlyActivity(countedQualifications);
  const class_reach = buildTeacherClassReach(countedQualifications, students);
  const value_balance = buildTeacherValueBalance(countedQualifications);

  return {
    ...ranking,
    categories,
    subjects_breakdown,
    monthly_activity,
    class_reach,
    value_balance,
    most_used_category: categories[0]?.name ?? null,
    top_supported_classes: class_reach.slice(0, 5).map((entry) => ({
      grade: entry.grade,
      section: entry.section,
      class_label: entry.class_label,
      qualification_count: entry.qualification_count,
      students_reached: entry.students_reached,
    })),
  };
}
