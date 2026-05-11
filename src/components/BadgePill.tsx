import React from 'react';
import { BADGE_DEFINITIONS, type BadgeType } from '../types';
import { cn } from '../lib/utils';

export default function BadgePill({ type, compact = false }: { type: BadgeType; compact?: boolean }) {
  const def = BADGE_DEFINITIONS[type];
  const tone: Record<BadgeType, string> = {
    hot_streak: 'bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-950/40 dark:text-orange-100 dark:border-orange-800',
    top_performer: 'bg-yellow-100 text-yellow-950 border-yellow-300 dark:bg-yellow-950/40 dark:text-yellow-100 dark:border-yellow-800',
    all_rounder: 'bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-100 dark:border-indigo-800',
    rising_star: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-800',
    new_student: 'bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950/40 dark:text-sky-100 dark:border-sky-800',
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
