import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { buildClassHref, buildStudentHref, cn, formatGradeSection } from '../lib/utils';
import type { Category, StudentRank } from '../types';
import BadgePill from './BadgePill';
import RankDeltaChip from './RankDeltaChip';
import CategoryMiniBar from './CategoryMiniBar';

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatSigned(n: number) {
  return n > 0 ? `+${n}` : String(n);
}

function scoreTone(score: number) {
  if (score > 0) return 'text-green-700 dark:text-green-300';
  if (score < 0) return 'text-red-700 dark:text-red-300';
  return 'text-gray-600 dark:text-gray-300';
}

function useTickerNumber(value: number, durationMs = 450) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    const from = prev.current;
    const to = value;
    if (from === to) return;
    prev.current = to;

    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(from + (to - from) * eased);
      setDisplay(next);
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);

  return display;
}

export default function StudentRow({
  student,
  actualRank,
  categoryFilter,
  gradePillClass,
  badges,
  searchQuery,
  flash,
  selectedYear,
  onHoverAnchor,
  onHoverLeave,
}: {
  student: StudentRank;
  actualRank: number;
  categoryFilter: Category;
  gradePillClass: (grade: number) => string;
  badges: string[];
  searchQuery: string;
  flash?: 'up' | 'down' | null;
  selectedYear?: string | null;
  onHoverAnchor?: (studentId: string, name: string, rect: DOMRect) => void;
  onHoverLeave?: () => void;
}) {
  const rawScore = useMemo(() => {
    if (categoryFilter === 'Academic') return student.academic_score;
    if (categoryFilter === 'Behavior') return student.behavior_score;
    if (categoryFilter === 'Extracurricular') return student.extracurricular_score;
    if (categoryFilter === 'Attendance') return student.attendance_score;
    return student.total_score;
  }, [student, categoryFilter]);

  const score = useTickerNumber(rawScore);

  const nameNode = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return student.name;
    const re = new RegExp(`(${escapeRegExp(q)})`, 'ig');
    const parts = student.name.split(re);
    return parts.map((p, i) =>
      re.test(p) ? (
        <mark key={i} className="bg-yellow-200/70 dark:bg-yellow-500/20 rounded px-0.5">{p}</mark>
      ) : (
        <React.Fragment key={i}>{p}</React.Fragment>
      )
    );
  }, [student.name, searchQuery]);

  const navigateToStudent = () => {
    window.location.href = buildStudentHref(student.student_id, selectedYear);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={cn(
        'flex flex-wrap sm:grid sm:grid-cols-12 gap-2 sm:gap-4 px-3 sm:px-4 py-3 items-center rounded-xl shadow-sm border hover:shadow-md transition-shadow cursor-pointer',
        flash === 'up'
          ? 'bg-green-50/70 dark:bg-green-950/20 border-green-200/60 dark:border-green-900/40'
          : flash === 'down'
            ? 'bg-red-50/70 dark:bg-red-950/20 border-red-200/60 dark:border-red-900/40'
            : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800'
      )}
      role="link"
      tabIndex={0}
      aria-label={`Open ${student.name}, ranked ${actualRank}, ${formatGradeSection(student.grade, student.section)}`}
      onClick={navigateToStudent}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigateToStudent();
        }
      }}
      onMouseEnter={(e) => {
        if (!onHoverAnchor) return;
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        onHoverAnchor(student.student_id, student.name, rect);
      }}
      onMouseLeave={() => onHoverLeave?.()}
    >
      <div className="hidden sm:block col-span-1 text-center font-bold text-gray-500" aria-label={`Rank ${actualRank}`}>#{actualRank}</div>

      <div className="flex items-center gap-3 w-full sm:w-auto sm:col-span-6 min-w-0">
        <span className="sm:hidden text-sm font-bold text-gray-400 w-6 flex-shrink-0">#{actualRank}</span>

        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
          {student.avatar_url ? (
            <img src={student.avatar_url} alt={student.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 uppercase font-bold text-sm">
              {student.name.charAt(0)}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-gray-800 dark:text-gray-100 truncate hover:text-indigo-600 transition-colors text-sm sm:text-base">
              {nameNode}
            </span>
            {badges.length > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1 flex-shrink-0">
                {badges.slice(0, 3).map((b) => (
                  <BadgePill key={`${student.student_id}-${b}`} type={b as any} compact />
                ))}
              </span>
            )}
          </div>
          {badges.length > 0 && (
            <div className="sm:hidden mt-1 flex items-center gap-1">
              {badges.slice(0, 3).map((b) => (
                <BadgePill key={`${student.student_id}-m-${b}`} type={b as any} compact />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 sm:contents ml-auto">
        <a
          href={buildClassHref(formatGradeSection(student.grade, student.section), selectedYear)}
          onClick={(e) => e.stopPropagation()}
          className="sm:col-span-2 text-center text-xs sm:text-base text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border', gradePillClass(student.grade))}>
            {formatGradeSection(student.grade, student.section)}
          </span>
        </a>

        <div className="sm:col-span-2 text-center">
          <div className={cn('font-black text-sm sm:text-base tabular-nums', scoreTone(score))}>
            {formatSigned(score)}
          </div>
          <div className="mt-1 hidden sm:block">
            <CategoryMiniBar
              academic={student.academic_score}
              behavior={student.behavior_score}
              extracurricular={student.extracurricular_score}
              attendance={student.attendance_score}
              className="max-w-[140px] mx-auto"
            />
          </div>
        </div>

        <div className="sm:col-span-1 flex justify-center">
          <RankDeltaChip delta={student.rank_delta ?? 0} />
        </div>
      </div>
    </motion.div>
  );
}
