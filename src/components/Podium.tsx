import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import type { Category, StudentRank } from '../types';
import { buildClassHref, buildStudentHref, cn, formatGradeSection } from '../lib/utils';
import CategoryMiniBar from './CategoryMiniBar';

type Props = {
  top3: StudentRank[];
  category: Category;
  selectedYear?: string | null;
};

export default function Podium({ top3, category, selectedYear = null }: Props) {
  // Confetti once per session (only when a podium exists)
  useEffect(() => {
    if (!top3?.[0]) return;
    try {
      const key = 'podium_confetti_fired_v1';
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      // ignore storage issues
    }

    // dynamic import so we don't hard-require it server-side
    import('canvas-confetti')
      .then((m: any) => (m?.default ?? m))
      .then((confetti: any) => {
        if (typeof confetti !== 'function') return;
        confetti({
          particleCount: 110,
          spread: 70,
          origin: { y: 0.25 },
        });
      })
      .catch(() => {});
  }, [top3]);

  if (!top3 || top3.length === 0) return null;

  return (
    <div className="flex flex-col items-center md:flex-row md:items-end justify-center gap-4 eboard:gap-3 md:gap-8 eboard:pt-8 pt-24 md:pt-28 eboard:md:pt-10 eboard:pb-6 pb-12">
      {top3[1] && <PodiumCard student={top3[1]} rank={2} category={category} selectedYear={selectedYear} />}
      {top3[0] && <PodiumCard student={top3[0]} rank={1} category={category} selectedYear={selectedYear} />}
      {top3[2] && <PodiumCard student={top3[2]} rank={3} category={category} selectedYear={selectedYear} />}
    </div>
  );
}

function PodiumCard({ student, rank, category, selectedYear }: { student: StudentRank; rank: 1 | 2 | 3; category: Category; selectedYear?: string | null }) {
  const gradients: Record<1 | 2 | 3, string> = {
    1: 'from-yellow-300 via-yellow-400 to-yellow-600 border-yellow-200 shadow-yellow-500/50',
    2: 'from-gray-300 via-gray-400 to-gray-500 border-gray-200 shadow-gray-500/50',
    3: 'from-orange-300 via-orange-400 to-orange-600 border-orange-200 shadow-orange-500/50',
  };

  const heights: Record<1 | 2 | 3, string> = {
    1: 'h-56 sm:h-64 md:h-72 eboard:h-44 eboard:sm:h-48 eboard:md:h-52 scale-105 eboard:scale-100',
    2: 'h-48 sm:h-56 md:h-64 eboard:h-40 eboard:sm:h-44 eboard:md:h-48',
    3: 'h-44 sm:h-52 md:h-60 eboard:h-36 eboard:sm:h-40 eboard:md:h-44',
  };

  let score = student.total_score;
  if (category === 'Academic') score = student.academic_score;
  if (category === 'Behavior') score = student.behavior_score;
  if (category === 'Extracurricular') score = student.extracurricular_score;
  if (category === 'Attendance') score = student.attendance_score;

  // Heuristic until we have per-student qualifications on leaderboard:
  const hasHotStreak = (student.recent_activity_count ?? 0) >= 3;
  const navigateToStudent = () => {
    window.location.href = buildStudentHref(student.student_id, selectedYear);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      role="link"
      tabIndex={0}
      aria-label={`Open podium student ${student.name}, rank ${rank}`}
      onClick={navigateToStudent}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigateToStudent();
        }
      }}
      className={cn(
        'relative flex flex-col items-center p-4 eboard:p-3 sm:p-6 eboard:sm:p-4 rounded-2xl w-full max-w-[170px] eboard:max-w-[150px] sm:max-w-[210px] eboard:sm:max-w-[170px] border shadow-xl bg-gradient-to-br transition-transform hover:-translate-y-2 eboard:hover:-translate-y-1 cursor-pointer',
        gradients[rank],
        heights[rank]
      )}
    >
      <div className="absolute -top-4 eboard:-top-3 bg-white dark:bg-gray-800 p-2 eboard:p-1.5 rounded-full shadow-lg">
        {rank === 1 ? (
          <>
            <span className="text-2xl leading-none" aria-hidden="true">👑</span>
            <span className="sr-only">Winner</span>
          </>
        ) : (
          <Trophy className={cn('text-white', rank === 2 ? 'w-6 h-6 text-gray-500' : 'w-6 h-6 text-orange-600')} />
        )}
      </div>

      {hasHotStreak && (
        <div
          className="absolute top-3 right-3 bg-white/20 border border-white/30 text-white rounded-full px-2 py-0.5 text-xs font-bold"
          title="Hot streak"
          aria-label="Hot streak"
        >
          <span aria-hidden="true">🔥</span>
          <span className="sr-only">Hot streak</span>
        </div>
      )}

      <div className="w-20 h-20 eboard:w-14 eboard:h-14 mt-4 eboard:mt-3 rounded-full bg-white/20 border-4 eboard:border-[3px] border-white/50 overflow-hidden mb-3 eboard:mb-2">
        {student.avatar_url ? (
          <img src={student.avatar_url} alt={student.name} className="w-full h-full object-cover" />
        ) : (
            <div className="w-full h-full flex items-center justify-center text-white uppercase text-2xl eboard:text-lg font-bold">
            {student.name.charAt(0)}
          </div>
        )}
      </div>

      <h3 className="font-bold text-white text-center text-lg eboard:text-base leading-tight mb-1 line-clamp-2">{student.name}</h3>
      <a
        href={buildClassHref(formatGradeSection(student.grade, student.section), selectedYear)}
        onClick={(e) => e.stopPropagation()}
        className="text-white/80 hover:text-white text-sm eboard:text-xs mb-3 eboard:mb-2 transition-colors"
      >
          <span className="inline-flex items-center px-2 py-0.5 eboard:px-1.5 rounded-full text-xs eboard:text-[11px] font-semibold border border-white/25 bg-white/15 text-white">
          {formatGradeSection(student.grade, student.section)}
        </span>
      </a>

      <div className="w-full mb-3">
        <CategoryMiniBar
          academic={student.academic_score}
          behavior={student.behavior_score}
          extracurricular={student.extracurricular_score}
          attendance={student.attendance_score}
        />
      </div>

      <div className="text-2xl eboard:text-xl font-black text-white mt-auto drop-shadow-md">
        {score > 0 ? `+${score}` : score}
      </div>
    </motion.div>
  );
}
