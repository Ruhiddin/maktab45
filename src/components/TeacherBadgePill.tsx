import React from 'react';
import { TEACHER_BADGE_DEFINITIONS, type TeacherLeaderboardBadgeType } from '../types';
import { cn } from '../lib/utils';

export default function TeacherBadgePill({
  type,
  compact = false,
}: {
  type: TeacherLeaderboardBadgeType;
  compact?: boolean;
}) {
  const def = TEACHER_BADGE_DEFINITIONS[type];
  const tone: Record<TeacherLeaderboardBadgeType, string> = {
    all_round_mentor: 'bg-indigo-100 text-indigo-950 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-100 dark:border-indigo-800',
    attendance_anchor: 'bg-sky-100 text-sky-950 border-sky-300 dark:bg-sky-950/40 dark:text-sky-100 dark:border-sky-800',
    behavior_guide: 'bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-800',
    student_reach: 'bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-800',
    steady_presence: 'bg-violet-100 text-violet-950 border-violet-300 dark:bg-violet-950/40 dark:text-violet-100 dark:border-violet-800',
    hot_week: 'bg-rose-100 text-rose-950 border-rose-300 dark:bg-rose-950/40 dark:text-rose-100 dark:border-rose-800',
  };

  return (
    <span
      title={def.description}
      className={cn(
        'inline-flex items-center rounded-full border select-none',
        compact ? 'px-1.5 py-0.5 text-xs font-semibold' : 'px-2.5 py-1 text-xs font-semibold',
        tone[type]
      )}
      aria-label={`${def.label}: ${def.description}`}
    >
      <span aria-hidden="true">{def.icon}</span>
      <span className="sr-only">{def.label}. </span>
      {!compact && <span className="ml-1">{def.label}</span>}
      {compact && <span className="sr-only">{def.label}</span>}
    </span>
  );
}
