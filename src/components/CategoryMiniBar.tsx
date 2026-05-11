import React, { useMemo } from 'react';
import { cn } from '../lib/utils';

type Props = {
  academic: number;
  behavior: number;
  extracurricular: number;
  attendance: number;
  className?: string;
};

type Segment = {
  key: 'academic' | 'behavior' | 'extracurricular' | 'attendance';
  label: string;
  value: number;
  positive: number;
  className: string;
};

export default function CategoryMiniBar({
  academic,
  behavior,
  extracurricular,
  attendance,
  className,
}: Props) {
  const segments: Segment[] = useMemo(
    () => [
      {
        key: 'academic',
        label: 'Academic',
        value: academic,
        positive: Math.max(academic, 0),
        className: 'bg-blue-500',
      },
      {
        key: 'behavior',
        label: 'Behavior',
        value: behavior,
        positive: Math.max(behavior, 0),
        className: 'bg-green-500',
      },
      {
        key: 'extracurricular',
        label: 'Extracurricular',
        value: extracurricular,
        positive: Math.max(extracurricular, 0),
        className: 'bg-purple-500',
      },
      {
        key: 'attendance',
        label: 'Attendance',
        value: attendance,
        positive: Math.max(attendance, 0),
        className: 'bg-amber-500',
      },
    ],
    [academic, behavior, extracurricular, attendance]
  );

  const totalPositive = segments.reduce((acc, s) => acc + s.positive, 0);

  const tooltip = segments
    .map(s => `${s.label}: ${s.value > 0 ? `+${s.value}` : s.value}`)
    .join(' • ');

  return (
    <div
      className={cn(
        'h-2 w-full rounded-full overflow-hidden bg-gray-200/80 dark:bg-gray-800/80 border border-gray-300/50 dark:border-gray-700/50',
        className
      )}
      title={tooltip}
      aria-label={tooltip}
      role="img"
    >
      {totalPositive <= 0 ? (
        <div className="h-full w-full bg-gray-300/40 dark:bg-gray-700/40" />
      ) : (
        <div className="flex h-full w-full">
          {segments.map(s => {
            const pct = (s.positive / totalPositive) * 100;
            return (
              <div
                key={s.key}
                className={cn('h-full', s.className)}
                style={{ width: `${pct}%` }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

