import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Trophy } from 'lucide-react';
import { getMessages, type Locale } from '../lib/i18n';
import { cn } from '../lib/utils';
import type { TeacherLeaderboardBadgeType, TeacherRank } from '../types';
import TeacherBadgePill from './TeacherBadgePill';

type Props = {
  locale: Locale;
  top3: TeacherRank[];
  badgeMap: Record<string, TeacherLeaderboardBadgeType[]>;
  buildTeacherDetailHref: (teacherId: string) => string;
  onHoverTeacher?: (teacher: TeacherRank, element: HTMLElement) => void;
  onLeaveTeacher?: () => void;
};

export default function TeacherPodium({
  top3,
  badgeMap,
  locale,
  buildTeacherDetailHref,
  onHoverTeacher,
  onLeaveTeacher,
}: Props) {
  if (!top3.length) return null;

  return (
    <div className="flex flex-wrap items-start justify-center gap-5 eboard:gap-2 pt-14 eboard:pt-4 pb-10 eboard:pb-3 sm:gap-6 md:items-end md:gap-10 eboard:md:gap-3 md:pt-22 eboard:md:pt-5">
      {top3[1] ? (
        <TeacherPodiumCard
          teacher={top3[1]}
          locale={locale}
          rank={2}
          badges={badgeMap[top3[1].teacher_id] ?? []}
          href={buildTeacherDetailHref(top3[1].teacher_id)}
          onHoverTeacher={onHoverTeacher}
          onLeaveTeacher={onLeaveTeacher}
        />
      ) : null}
      {top3[0] ? (
        <TeacherPodiumCard
          teacher={top3[0]}
          locale={locale}
          rank={1}
          badges={badgeMap[top3[0].teacher_id] ?? []}
          href={buildTeacherDetailHref(top3[0].teacher_id)}
          onHoverTeacher={onHoverTeacher}
          onLeaveTeacher={onLeaveTeacher}
        />
      ) : null}
      {top3[2] ? (
        <TeacherPodiumCard
          teacher={top3[2]}
          locale={locale}
          rank={3}
          badges={badgeMap[top3[2].teacher_id] ?? []}
          href={buildTeacherDetailHref(top3[2].teacher_id)}
          onHoverTeacher={onHoverTeacher}
          onLeaveTeacher={onLeaveTeacher}
        />
      ) : null}
    </div>
  );
}

function TeacherPodiumCard({
  teacher,
  locale,
  rank,
  badges,
  href,
  onHoverTeacher,
  onLeaveTeacher,
}: {
  teacher: TeacherRank;
  locale: Locale;
  rank: 1 | 2 | 3;
  badges: TeacherLeaderboardBadgeType[];
  href: string;
  onHoverTeacher?: (teacher: TeacherRank, element: HTMLElement) => void;
  onLeaveTeacher?: () => void;
}) {
  const m = getMessages(locale);
  const gradients: Record<1 | 2 | 3, string> = {
    1: 'from-fuchsia-500 via-indigo-500 to-sky-500 border-fuchsia-300/40 shadow-fuchsia-500/30',
    2: 'from-slate-400 via-slate-500 to-slate-700 border-slate-200/30 shadow-slate-500/25',
    3: 'from-amber-400 via-orange-500 to-rose-500 border-amber-200/30 shadow-orange-500/25',
  };

  const heights: Record<1 | 2 | 3, string> = {
    1: 'min-h-[18rem] sm:min-h-[19rem] md:min-h-[21rem] eboard:min-h-[10.5rem] eboard:sm:min-h-[11rem] eboard:md:min-h-[12rem]',
    2: 'min-h-[15.5rem] sm:min-h-[17rem] md:min-h-[19rem] eboard:min-h-[9.5rem] eboard:sm:min-h-[10rem] eboard:md:min-h-[11rem]',
    3: 'min-h-[15rem] sm:min-h-[16.5rem] md:min-h-[18rem] eboard:min-h-[9rem] eboard:sm:min-h-[9.5rem] eboard:md:min-h-[10.5rem]',
  };

  const layoutOrder: Record<1 | 2 | 3, string> = {
    1: 'order-1 basis-full max-w-[280px] eboard:max-w-[170px] sm:max-w-[310px] eboard:sm:max-w-[180px] md:order-2 md:basis-auto md:max-w-[280px] eboard:md:max-w-[175px] md:scale-[1.04] eboard:md:scale-95 lg:max-w-[300px]',
    2: 'order-2 basis-[calc(50%-0.625rem)] max-w-[220px] eboard:max-w-[145px] sm:max-w-[250px] eboard:sm:max-w-[155px] md:order-1 md:basis-auto md:max-w-[250px] eboard:md:max-w-[150px] lg:max-w-[270px]',
    3: 'order-3 basis-[calc(50%-0.625rem)] max-w-[220px] eboard:max-w-[145px] sm:max-w-[250px] eboard:sm:max-w-[155px] md:order-3 md:basis-auto md:max-w-[250px] eboard:md:max-w-[150px] lg:max-w-[270px]',
  };

  return (
    <motion.a
      layout
      href={href}
      aria-label={m.teacherLeaderboard.podiumTeacherAriaLabel
        .replace('{rank}', String(rank))
        .replace('{name}', teacher.full_name)}
      className={cn(
        'relative flex w-full flex-col rounded-[1.75rem] border bg-gradient-to-br p-4 eboard:p-2 shadow-2xl transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 sm:p-5 eboard:sm:p-2.5',
        gradients[rank],
        heights[rank],
        layoutOrder[rank]
      )}
      onMouseEnter={(event) => onHoverTeacher?.(teacher, event.currentTarget)}
      onMouseLeave={onLeaveTeacher}
    >
      <div className="absolute -top-5 eboard:-top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-slate-950/90 p-2.5 eboard:p-1.5 shadow-lg ring-1 ring-white/10" aria-hidden="true">
        {rank === 1 ? (
          <Sparkles className="h-6 w-6 text-yellow-200" />
        ) : (
          <Trophy className={cn('h-6 w-6', rank === 2 ? 'text-slate-100' : 'text-orange-100')} />
        )}
      </div>

      <div className="mt-5 eboard:mt-2.5 flex items-center justify-between gap-3 eboard:gap-1.5">
        <span className="rounded-full border border-white/15 bg-white/10 px-3 eboard:px-1.5 py-1 eboard:py-0.5 text-xs eboard:text-[0.55rem] font-bold uppercase tracking-[0.28em] text-white/80">
          #{rank}
        </span>
        <span className="rounded-full border border-white/15 bg-black/15 px-3 eboard:px-1.5 py-1 eboard:py-0.5 text-xs eboard:text-[0.55rem] font-semibold text-white/85">
          {teacher.activity_score.toFixed(2)}
        </span>
      </div>

      <div className="mt-4 eboard:mt-2 flex h-18 w-18 eboard:h-10 eboard:w-10 items-center justify-center self-center rounded-[1rem] border border-white/20 bg-white/10 text-3xl eboard:text-sm font-black text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] sm:h-20 sm:w-20 eboard:sm:h-11 eboard:sm:w-11">
        {teacher.full_name.charAt(0)}
      </div>

      <div className="mt-4 text-center">
        <h3 className="line-clamp-2 text-base eboard:text-[0.72rem] font-black leading-tight text-white sm:text-lg eboard:sm:text-[0.78rem]">{teacher.full_name}</h3>
        <p className="mt-2 eboard:mt-1 line-clamp-2 text-sm eboard:text-[0.58rem] text-white/75">
          {teacher.subjects.length ? teacher.subjects.join(', ') : m.teacherLeaderboard.generalSupport}
        </p>
      </div>

      <div className="mt-4 eboard:mt-1.5 flex flex-wrap justify-center gap-1.5 eboard:gap-0.5">
        {badges.slice(0, 2).map((badge) => (
          <TeacherBadgePill key={badge} type={badge} compact />
        ))}
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2 eboard:gap-1 pt-4 eboard:pt-1.5 text-center">
        <div className="rounded-2xl border border-white/10 bg-black/10 px-2 eboard:px-1 py-2 eboard:py-1">
          <div className="text-[11px] eboard:text-[0.5rem] uppercase tracking-[0.22em] text-white/55">{m.teacherLeaderboard.podiumStudents}</div>
          <div className="mt-1 text-lg eboard:text-[0.8rem] font-black text-white">{teacher.unique_students_count}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/10 px-2 eboard:px-1 py-2 eboard:py-1">
          <div className="text-[11px] eboard:text-[0.5rem] uppercase tracking-[0.22em] text-white/55">{m.teacherLeaderboard.podiumDays}</div>
          <div className="mt-1 text-lg eboard:text-[0.8rem] font-black text-white">{teacher.active_days_count}</div>
        </div>
      </div>
    </motion.a>
  );
}
