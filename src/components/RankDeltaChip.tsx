import React from 'react';
import { cn } from '../lib/utils';

export default function RankDeltaChip({ delta }: { delta: number }) {
  if (!delta) {
    return (
      <span
        aria-label="No rank change"
        className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold border bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-900/40 dark:text-gray-200 dark:border-gray-700"
      >
        —
      </span>
    );
  }

  const movedUp = delta > 0;
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold border tabular-nums',
        movedUp
          ? 'bg-green-100 text-green-900 border-green-300 dark:bg-green-950/40 dark:text-green-100 dark:border-green-800'
          : 'bg-red-100 text-red-900 border-red-300 dark:bg-red-950/40 dark:text-red-100 dark:border-red-800'
      )}
      title={movedUp ? `Moved up ${delta}` : `Moved down ${Math.abs(delta)}`}
      aria-label={movedUp ? `Moved up ${delta}` : `Moved down ${Math.abs(delta)}`}
    >
      {movedUp ? `↑${delta}` : `↓${Math.abs(delta)}`}
    </span>
  );
}
