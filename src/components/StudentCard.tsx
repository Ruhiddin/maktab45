import React from 'react';
import { motion } from 'framer-motion';
import type { StudentRank } from '../types';
import { buildYearHref, cn, formatGradeSection } from '../lib/utils';
import RankDeltaChip from './RankDeltaChip';
import BadgePill from './BadgePill';
import CategoryMiniBar from './CategoryMiniBar';

export default function StudentCard({
  student,
  rank,
  gradePillClass,
  badges,
  selectedYear,
}: {
  student: StudentRank;
  rank: number;
  gradePillClass: (grade: number) => string;
  badges: string[];
  selectedYear?: string | null;
}) {
  return (
    <motion.a
      href={buildYearHref(`/student/${student.student_id}`, selectedYear)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      aria-label={`Open ${student.name}, ranked ${rank}, ${formatGradeSection(student.grade, student.section)}`}
      className="no-underline p-3 rounded-2xl bg-white/60 dark:bg-gray-900/60 backdrop-blur border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">#{rank}</span>
        <RankDeltaChip delta={student.rank_delta ?? 0} />
      </div>

      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
          {student.avatar_url ? (
            <img src={student.avatar_url} alt={student.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 uppercase font-bold text-sm">
              {student.name.charAt(0)}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-gray-800 dark:text-gray-100 truncate text-sm">
            {student.name}
          </div>
          <div className="mt-0.5">
            <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border', gradePillClass(student.grade))}>
              {formatGradeSection(student.grade, student.section)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <CategoryMiniBar
          academic={student.academic_score}
          behavior={student.behavior_score}
          extracurricular={student.extracurricular_score}
          attendance={student.attendance_score}
        />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="text-sm font-black text-indigo-700 dark:text-indigo-300 tabular-nums">
          {student.total_score > 0 ? `+${student.total_score}` : student.total_score}
        </div>
        {badges.length > 0 && (
          <div className="flex items-center gap-1">
            {badges.slice(0, 2).map(b => (
              <BadgePill key={`${student.student_id}-c-${b}`} type={b as any} compact />
            ))}
          </div>
        )}
      </div>
    </motion.a>
  );
}
