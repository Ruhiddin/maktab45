import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, SlidersHorizontal, Sparkles } from 'lucide-react';
import { buildLocaleHref, getMessages, type Locale } from '../lib/i18n';
import { computeTeacherLeaderboardBadges } from '../lib/teacherRanking';
import { buildTeacherLeaderboardHref, buildTeacherProfileHref, cn } from '../lib/utils';
import type { TeacherLeaderboardBadgeType, TeacherRank } from '../types';
import TeacherBadgePill from './TeacherBadgePill';
import TeacherHoverPreviewCard from './TeacherHoverPreviewCard';
import TeacherPodium from './TeacherPodium';

type ViewMode = 'list' | 'cards';
type ScoreBand = 'all' | 'emerging' | 'active' | 'leading';
const ALL_SUBJECTS = '__all_subjects__';

type Props = {
  teachers: TeacherRank[];
  locale: Locale;
  selectedYear?: string | null;
  archiveYears?: number[];
  currentAcademicYear?: string;
};

export default function TeacherLeaderboard({
  teachers,
  locale,
  selectedYear = null,
  archiveYears = [],
  currentAcademicYear,
}: Props) {
  const m = getMessages(locale);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<string>(ALL_SUBJECTS);
  const [scoreBand, setScoreBand] = useState<ScoreBand>('all');
  const [recentOnly, setRecentOnly] = useState(false);
  const [view, setView] = useState<ViewMode>('list');
  const [hover, setHover] = useState<{ teacher: TeacherRank; rect: DOMRect } | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 220);
    return () => window.clearTimeout(timer);
  }, [search]);

  const subjectOptions = useMemo(() => {
    const set = new Set<string>();
    for (const teacher of teachers) {
      for (const subject of teacher.subjects) {
        const normalized = subject.trim();
        if (normalized) set.add(normalized);
      }
    }
    return [{ label: m.teacherLeaderboard.allSubjects, value: ALL_SUBJECTS }, ...Array.from(set).sort((a, b) => a.localeCompare(b)).map((subject) => ({ label: subject, value: subject }))];
  }, [teachers, m.teacherLeaderboard.allSubjects]);

  const badgeMap = useMemo<Record<string, TeacherLeaderboardBadgeType[]>>(() => {
    const next: Record<string, TeacherLeaderboardBadgeType[]> = {};
    for (const teacher of teachers) {
      next[teacher.teacher_id] = computeTeacherLeaderboardBadges({ ranking: teacher });
    }
    return next;
  }, [teachers]);

  const filteredTeachers = useMemo(() => {
    const data = teachers.filter((teacher) => {
      if (debouncedSearch && !teacher.full_name.toLowerCase().includes(debouncedSearch)) {
        return false;
      }

      if (subjectFilter !== ALL_SUBJECTS && !teacher.subjects.some((subject) => subject === subjectFilter)) {
        return false;
      }

      if (recentOnly && teacher.recent_activity_count <= 0) {
        return false;
      }

      if (scoreBand === 'emerging' && teacher.activity_score >= 6) return false;
      if (scoreBand === 'active' && (teacher.activity_score < 6 || teacher.activity_score >= 12)) return false;
      if (scoreBand === 'leading' && teacher.activity_score < 12) return false;

      return true;
    });

    return [...data].sort((a, b) => {
      if (b.activity_score !== a.activity_score) return b.activity_score - a.activity_score;
      if (b.unique_students_count !== a.unique_students_count) return b.unique_students_count - a.unique_students_count;
      if (b.category_coverage_count !== a.category_coverage_count) return b.category_coverage_count - a.category_coverage_count;
      if (b.recent_activity_count !== a.recent_activity_count) return b.recent_activity_count - a.recent_activity_count;
      return a.full_name.localeCompare(b.full_name);
    });
  }, [teachers, debouncedSearch, subjectFilter, recentOnly, scoreBand]);

  const top3 = filteredTeachers.slice(0, 3);

  const yearOptions = currentAcademicYear
    ? [
        { label: currentAcademicYear, year: null as string | null },
        ...archiveYears.map((year) => ({ label: `${m.public.archiveLabel} ${year}`, year: String(year) })),
      ]
    : [];

  const placeHoverCard = (rect: DOMRect) => {
    const gap = 12;
    const w = 340;
    const h = 250;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = Math.min(vw - w - 12, rect.right + gap);
    if (left < 12) left = 12;
    let top = Math.min(vh - h - 12, rect.top);
    if (top < 12) top = 12;
    return { left, top };
  };

  const navigateToYear = (year: string | null) => {
    if (typeof window === 'undefined') return;
    window.location.href = buildLocaleHref(buildTeacherLeaderboardHref(year), locale);
  };

  const buildTeacherDetailHref = (teacherId: string) =>
    buildLocaleHref(buildTeacherProfileHref(teacherId, selectedYear), locale);

  return (
    <div className="mt-8 eboard:mt-5">
      <div className="rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-4 eboard:p-3 shadow-[0_16px_60px_rgba(15,23,42,0.25)] backdrop-blur">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
          <div className="min-w-0 lg:mr-auto">
            <div className="flex items-center gap-3 eboard:gap-2">
              <div className="inline-flex h-11 w-11 eboard:h-9 eboard:w-9 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-200">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-300">{m.teacherLeaderboard.controlsEyebrow}</p>
                <h2 className="text-xl eboard:text-lg font-bold text-white sm:text-2xl eboard:sm:text-xl">{m.teacherLeaderboard.controlsTitle}</h2>
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-nowrap items-center justify-start gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-black/20 p-1 eboard:p-0.5 sm:rounded-full xl:justify-end">
            <a
              href={buildLocaleHref('/', locale, selectedYear ? `year=${selectedYear}` : null)}
              className="shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 eboard:px-2.5 eboard:py-1 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
            >
              {m.public.studentLeaderboard}
            </a>
            <span className="shrink-0 whitespace-nowrap rounded-full bg-indigo-500 px-3 py-1.5 eboard:px-2.5 eboard:py-1 text-xs font-semibold text-white shadow-sm">
              {m.public.teacherLeaderboard}
            </span>
          </div>

          {yearOptions.length > 0 ? (
            <div className="flex min-w-0 flex-nowrap items-center justify-start gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-black/20 p-1 eboard:p-0.5 sm:rounded-full xl:justify-end">
              {yearOptions.map((option) => {
                const isActive = (selectedYear ?? null) === option.year;
                return (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => navigateToYear(option.year)}
                    className={cn(
                      'shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 eboard:px-2.5 eboard:py-1 text-xs font-semibold transition-colors',
                      isActive
                        ? 'bg-indigo-500 text-white shadow-sm'
                        : 'text-slate-300 hover:bg-white/10'
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="mt-4 eboard:mt-3 grid gap-3 eboard:gap-2 md:grid-cols-2 xl:grid-cols-[minmax(0,1.3fr),minmax(190px,0.8fr),minmax(190px,0.8fr),auto,auto]">
          <label className="relative min-w-0 md:col-span-2 xl:col-span-1">
            <span className="sr-only">{m.teacherLeaderboard.searchLabel}</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              aria-label={m.teacherLeaderboard.searchLabel}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={m.teacherLeaderboard.searchPlaceholder}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/65 py-3 eboard:py-2.5 pl-11 pr-4 text-sm eboard:text-[13px] text-white outline-none transition focus:border-indigo-400/50"
            />
          </label>

          <select
            aria-label={m.teacherLeaderboard.subjectFilterLabel}
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="w-full min-w-0 rounded-2xl border border-white/10 bg-slate-950/65 px-4 py-3 eboard:px-3 eboard:py-2.5 text-sm eboard:text-[13px] text-white outline-none transition focus:border-indigo-400/50"
          >
            {subjectOptions.map((subject) => (
              <option key={subject.value} value={subject.value}>
                {subject.label}
              </option>
            ))}
          </select>

          <select
            aria-label={m.teacherLeaderboard.scoreBandLabel}
            value={scoreBand}
            onChange={(e) => setScoreBand(e.target.value as ScoreBand)}
            className="w-full min-w-0 rounded-2xl border border-white/10 bg-slate-950/65 px-4 py-3 eboard:px-3 eboard:py-2.5 text-sm eboard:text-[13px] text-white outline-none transition focus:border-indigo-400/50"
          >
            <option value="all">{m.teacherLeaderboard.allActivityBands}</option>
            <option value="emerging">{m.teacherLeaderboard.emergingImpact}</option>
            <option value="active">{m.teacherLeaderboard.activeImpact}</option>
            <option value="leading">{m.teacherLeaderboard.leadingImpact}</option>
          </select>

          <button
            type="button"
            aria-label={m.teacherLeaderboard.recentToggleLabel}
            aria-pressed={recentOnly}
            onClick={() => setRecentOnly((value) => !value)}
            className={cn(
              'inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 eboard:px-3 eboard:py-2.5 text-sm eboard:text-[13px] font-semibold transition-colors xl:w-auto',
              recentOnly
                ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100'
                : 'border-white/10 bg-slate-950/45 text-slate-200 hover:bg-white/5'
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {m.teacherLeaderboard.recentOnly}
          </button>

          <div
            className="flex items-center justify-stretch gap-1 rounded-2xl border border-white/10 bg-slate-950/45 p-1 eboard:p-0.5 xl:justify-self-end"
            role="group"
            aria-label={m.teacherLeaderboard.viewModeLabel}
          >
            <button
              type="button"
              aria-label={m.teacherLeaderboard.list}
              aria-pressed={view === 'list'}
              onClick={() => setView('list')}
              className={cn(
                'flex-1 rounded-xl px-3 py-2 eboard:px-2.5 eboard:py-1.5 text-sm eboard:text-[13px] font-semibold transition-colors xl:flex-none',
                view === 'list' ? 'bg-indigo-500 text-white' : 'text-slate-300 hover:bg-white/5'
              )}
            >
              {m.teacherLeaderboard.list}
            </button>
            <button
              type="button"
              aria-label={m.teacherLeaderboard.cards}
              aria-pressed={view === 'cards'}
              onClick={() => setView('cards')}
              className={cn(
                'flex-1 rounded-xl px-3 py-2 eboard:px-2.5 eboard:py-1.5 text-sm eboard:text-[13px] font-semibold transition-colors xl:flex-none',
                view === 'cards' ? 'bg-indigo-500 text-white' : 'text-slate-300 hover:bg-white/5'
              )}
            >
              {m.teacherLeaderboard.cards}
            </button>
          </div>
        </div>
      </div>

      {filteredTeachers.length === 0 ? (
        <div className="mt-8 rounded-[1.75rem] border border-dashed border-white/10 bg-slate-900/70 px-6 eboard:px-5 py-14 eboard:py-9 text-center shadow-[0_16px_60px_rgba(15,23,42,0.25)]">
          <p className="text-lg font-semibold text-white">{m.teacherLeaderboard.noResultsTitle}</p>
          <p className="mt-2 text-sm text-slate-300">{m.teacherLeaderboard.noResultsHint}</p>
        </div>
      ) : (
        <>
          <TeacherPodium
            locale={locale}
            top3={top3}
            badgeMap={badgeMap}
            buildTeacherDetailHref={buildTeacherDetailHref}
            onHoverTeacher={(teacher, element) => setHover({ teacher, rect: element.getBoundingClientRect() })}
            onLeaveTeacher={() => setHover(null)}
          />

          {view === 'list' ? (
            <div className="rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-4 eboard:p-3 shadow-[0_16px_60px_rgba(15,23,42,0.25)] backdrop-blur">
              <div className="hidden md:grid md:grid-cols-[72px,minmax(0,1.3fr),minmax(0,0.8fr),120px,110px,120px] md:gap-3 eboard:md:gap-2 border-b border-white/10 px-4 eboard:px-3 py-3 eboard:py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                <span>{m.teacherLeaderboard.rank}</span>
                <span>{m.teacherLeaderboard.teacher}</span>
                <span>{m.teacherLeaderboard.subjects}</span>
                <span>{m.teacherLeaderboard.score}</span>
                <span>{m.teacherLeaderboard.reach}</span>
                <span>{m.teacherLeaderboard.recent}</span>
              </div>

              <div className="mt-3 eboard:mt-2.5 space-y-3 eboard:space-y-2">
                {filteredTeachers.map((teacher, index) => (
                  <motion.a
                    key={teacher.teacher_id}
                    layout
                    href={buildTeacherDetailHref(teacher.teacher_id)}
                    aria-label={m.teacherLeaderboard.teacherLinkAriaLabel.replace('{name}', teacher.full_name)}
                    onMouseEnter={(event) => setHover({ teacher, rect: event.currentTarget.getBoundingClientRect() })}
                    onMouseLeave={() => setHover(null)}
                    className="grid grid-cols-1 gap-4 eboard:gap-3 rounded-[1.5rem] border border-white/10 bg-slate-950/45 px-4 eboard:px-3 py-4 eboard:py-3 shadow-[0_10px_30px_rgba(15,23,42,0.25)] transition hover:border-indigo-400/30 focus-visible:border-indigo-300/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/40 md:grid-cols-[72px,minmax(0,1.3fr),minmax(0,0.8fr),120px,110px,120px]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-11 w-11 eboard:h-9 eboard:w-9 items-center justify-center rounded-2xl bg-indigo-500/20 text-sm eboard:text-[13px] font-black text-indigo-100">
                        #{index + 1}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="break-words text-lg eboard:text-base font-bold text-white sm:truncate">{teacher.full_name}</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {(badgeMap[teacher.teacher_id] ?? []).slice(0, 3).map((badge) => (
                            <TeacherBadgePill key={badge} type={badge} compact />
                          ))}
                        </div>
                      </div>
                      <div className="mt-2 eboard:mt-1.5 flex flex-wrap gap-2 eboard:gap-1.5 text-sm eboard:text-[13px] text-slate-300">
                        <span>{teacher.qualification_count} {m.teacherLeaderboard.qualifications}</span>
                        <span className="text-slate-500">•</span>
                        <span>{teacher.active_days_count} {m.teacherLeaderboard.activeDays}</span>
                        <span className="text-slate-500">•</span>
                        <span>{teacher.category_coverage_count}/4 {m.teacherLeaderboard.categoriesCovered}</span>
                      </div>
                    </div>

                    <div className="text-sm text-slate-300">
                      <div className="break-words md:line-clamp-2">{teacher.subjects.length ? teacher.subjects.join(', ') : m.teacherLeaderboard.generalSupport}</div>
                    </div>

                    <div className="flex items-center justify-between gap-3 text-xl font-black text-white md:justify-start">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 md:hidden">{m.teacherLeaderboard.score}</span>
                      {teacher.activity_score.toFixed(2)}
                    </div>

                    <div className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-200 md:justify-start">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 md:hidden">{m.teacherLeaderboard.reach}</span>
                      {teacher.unique_students_count} {m.teacherLeaderboard.students}
                    </div>

                    <div className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-200 md:justify-start">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 md:hidden">{m.teacherLeaderboard.recent}</span>
                      {teacher.recent_activity_count} {m.teacherLeaderboard.recent.toLowerCase()}
                    </div>
                  </motion.a>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid gap-4 eboard:gap-3 sm:grid-cols-2 xl:grid-cols-3 eboard:xl:grid-cols-4">
              {filteredTeachers.map((teacher, index) => (
                <motion.a
                  key={teacher.teacher_id}
                  layout
                  href={buildTeacherDetailHref(teacher.teacher_id)}
                  aria-label={m.teacherLeaderboard.teacherLinkAriaLabel.replace('{name}', teacher.full_name)}
                  onMouseEnter={(event) => setHover({ teacher, rect: event.currentTarget.getBoundingClientRect() })}
                  onMouseLeave={() => setHover(null)}
                  className="rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-5 eboard:p-4 shadow-[0_16px_60px_rgba(15,23,42,0.25)] backdrop-blur transition hover:border-indigo-400/30 focus-visible:border-indigo-300/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/40"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-indigo-200">
                        #{index + 1}
                      </div>
                      <h3 className="mt-4 break-words text-xl font-black text-white">{teacher.full_name}</h3>
                      <p className="mt-2 break-words text-sm text-slate-300 sm:line-clamp-2">
                        {teacher.subjects.length ? teacher.subjects.join(', ') : m.teacherLeaderboard.generalSupport}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center">
                      <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{m.teacherLeaderboard.score}</div>
                      <div className="mt-1 text-2xl font-black text-white">{teacher.activity_score.toFixed(2)}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {(badgeMap[teacher.teacher_id] ?? []).map((badge) => (
                      <TeacherBadgePill key={badge} type={badge} compact />
                    ))}
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <CardMetric label={m.teacherDetail.qualifications} value={teacher.qualification_count} />
                    <CardMetric label={m.teacherLeaderboard.podiumStudents} value={teacher.unique_students_count} />
                    <CardMetric label={m.teacherDetail.activeDays} value={teacher.active_days_count} />
                    <CardMetric label={m.teacherDetail.recentActivity} value={teacher.recent_activity_count} />
                  </div>
                </motion.a>
              ))}
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {hover ? (
          <TeacherHoverPreviewCard
            locale={locale}
            teacher={hover.teacher}
            badges={badgeMap[hover.teacher.teacher_id] ?? []}
            position={placeHoverCard(hover.rect)}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function CardMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{label}</div>
      <div className="mt-2 text-xl font-black text-white">{value}</div>
    </div>
  );
}
