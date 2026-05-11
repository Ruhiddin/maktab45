import type { BadgeType, Qualification, StudentRank } from '../types';

type MaybeDate = string | Date | null | undefined;

function toUtcDateKey(d: Date): string {
  // YYYY-MM-DD in UTC, stable for streak checks
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dayDiffUtc(a: Date, b: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const aUtc = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const bUtc = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.round((aUtc - bUtc) / msPerDay);
}

export function isHotStreak(qualifications: Qualification[] | null | undefined): boolean {
  if (!qualifications || qualifications.length === 0) return false;

  // Sum positive points per day, then look for 3 consecutive days with >0 total.
  const perDay = new Map<string, number>();
  for (const q of qualifications) {
    const dt = new Date(q.created_at);
    if (Number.isNaN(dt.getTime())) continue;
    const key = toUtcDateKey(dt);
    perDay.set(key, (perDay.get(key) || 0) + q.value);
  }

  const days = [...perDay.entries()]
    .filter(([, total]) => total > 0)
    .map(([key]) => key)
    .sort((a, b) => (a < b ? 1 : -1)); // desc (YYYY-MM-DD string sort works)

  if (days.length < 3) return false;

  // Walk newest -> oldest and count consecutive calendar days.
  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(`${days[i - 1]}T00:00:00Z`);
    const cur = new Date(`${days[i]}T00:00:00Z`);
    if (dayDiffUtc(prev, cur) === 1) {
      streak += 1;
      if (streak >= 3) return true;
    } else {
      streak = 1;
    }
  }

  return false;
}

export function isTopPerformer(student: Pick<StudentRank, 'student_id' | 'total_score'>, allStudentsInClass: StudentRank[] | null | undefined): boolean {
  if (!allStudentsInClass || allStudentsInClass.length === 0) return false;
  const max = Math.max(...allStudentsInClass.map(s => s.total_score));
  return student.total_score === max && allStudentsInClass.some(s => s.student_id === student.student_id);
}

export function isAllRounder(student: Pick<StudentRank, 'academic_score' | 'behavior_score' | 'extracurricular_score' | 'attendance_score'>): boolean {
  return (
    student.academic_score > 0 &&
    student.behavior_score > 0 &&
    student.extracurricular_score > 0 &&
    student.attendance_score > 0
  );
}

export function isRisingStar(currentRank: number | null | undefined, rankSevenDaysAgo: number | null | undefined): boolean {
  if (!currentRank || !rankSevenDaysAgo) return false;
  return (rankSevenDaysAgo - currentRank) >= 5;
}

export function isNewStudent(createdAt: MaybeDate, now: Date = new Date()): boolean {
  if (!createdAt) return false;
  const created = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (Number.isNaN(created.getTime())) return false;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  return (now.getTime() - created.getTime()) <= sevenDaysMs;
}

export function computeBadges(
  student: Partial<StudentRank> & { student_id?: string; created_at?: string },
  context: {
    qualifications?: Qualification[] | null;
    allStudentsInClass?: StudentRank[] | null;
    currentRank?: number | null;
    rankSevenDaysAgo?: number | null;
    now?: Date;
    createdAt?: MaybeDate;
    topScoreInClass?: number | null;
  } = {}
): BadgeType[] {
  const badges: BadgeType[] = [];

  if (context.qualifications && isHotStreak(context.qualifications)) badges.push('hot_streak');

  const canAllRounder =
    typeof student.academic_score === 'number' &&
    typeof student.behavior_score === 'number' &&
    typeof student.extracurricular_score === 'number' &&
    typeof student.attendance_score === 'number';
  if (canAllRounder && isAllRounder(student as any)) badges.push('all_rounder');

  if (
    student.student_id &&
    typeof student.total_score === 'number' &&
    (
      (typeof context.topScoreInClass === 'number' && student.total_score === context.topScoreInClass) ||
      (context.allStudentsInClass &&
        isTopPerformer({ student_id: student.student_id, total_score: student.total_score }, context.allStudentsInClass))
    )
  ) {
    badges.push('top_performer');
  }

  if (isRisingStar(context.currentRank ?? null, context.rankSevenDaysAgo ?? null)) badges.push('rising_star');

  const createdAt = context.createdAt ?? (student as any).created_at;
  if (isNewStudent(createdAt, context.now ?? new Date())) badges.push('new_student');

  return badges;
}
