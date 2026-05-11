import { useCallback, useEffect, useState } from 'react';
import type { ArchiveSnapshot } from '../lib/archiveSnapshot';
import { buildLocaleHref, getMessages, resolveRuntimeLocale, type Locale } from '../lib/i18n';
import { fetchPublicTeacherRankingDirect, normalizeArchiveTeacherRanking } from '../lib/publicData';
import { withBasePath } from '../lib/utils';
import type { TeacherRank } from '../types';
import ClientStudyYearPicker from './ClientStudyYearPicker';
import TeacherLeaderboard from './TeacherLeaderboard';

type Props = {
  locale: Locale;
  pathname: string;
  archiveYears: number[];
  currentAcademicYear: string;
};

function getSelectedArchiveYear(archiveYears: number[]) {
  if (typeof window === 'undefined') {
    return null;
  }

  const year = new URLSearchParams(window.location.search).get('year');
  return year && archiveYears.includes(Number(year)) ? year : null;
}

export default function TeacherLeaderboardView({
  locale,
  pathname,
  archiveYears,
  currentAcademicYear,
}: Props) {
  const [activeLocale, setActiveLocale] = useState<Locale>(() => resolveRuntimeLocale(locale));
  const m = getMessages(activeLocale);
  const [selectedYear, setSelectedYear] = useState<string | null>(() => getSelectedArchiveYear(archiveYears));
  const [teachers, setTeachers] = useState<TeacherRank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archiveState, setArchiveState] = useState<'ready' | 'missing' | 'legacy'>('ready');

  useEffect(() => {
    const syncFromLocation = () => {
      setActiveLocale(resolveRuntimeLocale(locale));
      setSelectedYear(getSelectedArchiveYear(archiveYears));
    };

    syncFromLocation();
    window.addEventListener('popstate', syncFromLocation);
    return () => window.removeEventListener('popstate', syncFromLocation);
  }, [archiveYears, locale]);

  const loadTeachers = useCallback(async (signal?: AbortSignal) => {
    const isCancelled = () => signal?.aborted ?? false;
    setLoading(true);
    setError(null);
    setArchiveState('ready');

    try {
      if (selectedYear) {
        const response = await fetch(withBasePath(`/archives/${selectedYear}_archive.json`), { signal });
        if (!response.ok) {
          if (!isCancelled()) {
            setTeachers([]);
            setArchiveState('missing');
          }
          return;
        }

        const archive = (await response.json()) as ArchiveSnapshot;
        if (isCancelled()) return;

        const ranking = normalizeArchiveTeacherRanking(archive);
        const hasTeacherArchiveData = Boolean(
          (archive.teacher_ranking && archive.teacher_ranking.length > 0) ||
          (archive.teachers && archive.teachers.length > 0)
        );

        setTeachers(ranking);
        setArchiveState(hasTeacherArchiveData ? 'ready' : 'legacy');
        return;
      }

      const ranking = await fetchPublicTeacherRankingDirect();
      if (!isCancelled()) {
        setTeachers(ranking);
      }
    } catch (loadError) {
      if (!isCancelled()) {
        setTeachers([]);
        setError(loadError instanceof Error ? loadError.message : 'Failed to load teacher leaderboard.');
      }
    } finally {
      if (!isCancelled()) {
        setLoading(false);
      }
    }
  }, [selectedYear]);

  useEffect(() => {
    const controller = new AbortController();
    void loadTeachers(controller.signal);
    return () => controller.abort();
  }, [loadTeachers]);

  const hasTeachers = teachers.length > 0;

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-indigo-950 py-12">
      <div className="max-w-5xl mx-auto px-4">
        <div className="mb-6 flex justify-center">
          <ClientStudyYearPicker
            pathname={pathname}
            locale={activeLocale}
            currentAcademicYear={currentAcademicYear}
            archiveYears={archiveYears}
            selectedYear={selectedYear}
          />
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-900/95 via-indigo-950/90 to-slate-900/95 px-6 py-10 text-center shadow-[0_24px_80px_rgba(15,23,42,0.45)] backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-indigo-300">
            {m.teacherLeaderboard.eyebrow}
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-white md:text-5xl">
            {m.teacherLeaderboard.title}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-300 md:text-base">
            {selectedYear
              ? `${m.teacherLeaderboard.archiveIntro} ${selectedYear}.`
              : `${currentAcademicYear} ${m.teacherLeaderboard.liveIntro}`}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href={buildLocaleHref('/', activeLocale, selectedYear ? `year=${selectedYear}` : null)}
              className="w-full rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-indigo-400/40 hover:bg-indigo-500/10 sm:w-auto"
            >
              {m.teacherLeaderboard.backToStudent}
            </a>
            {selectedYear ? (
              <a
                href={buildLocaleHref(pathname, activeLocale)}
                className="w-full rounded-full border border-amber-400/30 bg-amber-500/10 px-5 py-2.5 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/15 sm:w-auto"
              >
                {m.teacherLeaderboard.returnToLive}
              </a>
            ) : null}
          </div>
        </div>

        {selectedYear ? (
          <section className="mt-6 rounded-[1.5rem] border border-amber-400/20 bg-amber-500/10 px-5 py-4 text-sm text-amber-100 shadow-[0_16px_40px_rgba(120,53,15,0.15)]">
            {m.teacherLeaderboard.archiveBanner.replace('{year}', selectedYear)}
          </section>
        ) : null}

        {loading ? (
          <section className="mt-8 rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-10 text-center shadow-[0_16px_60px_rgba(15,23,42,0.25)] backdrop-blur">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-400/20 border-t-indigo-400" />
            <h2 className="mt-5 text-xl font-bold text-white">{m.teacherLeaderboard.loadingTitle}</h2>
            <p className="mt-2 text-sm text-slate-300">
              {m.teacherLeaderboard.loadingHint}
            </p>
          </section>
        ) : error ? (
          <section className="mt-8 rounded-[1.75rem] border border-rose-500/30 bg-rose-500/10 p-8 text-center shadow-[0_16px_60px_rgba(127,29,29,0.18)] backdrop-blur">
            <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/20 text-2xl text-rose-100">
              !
            </div>
            <h2 className="mt-5 text-2xl font-bold text-white">{m.teacherLeaderboard.loadFailedTitle}</h2>
            <p className="mt-3 text-sm leading-7 text-rose-100/90">
              {error}
            </p>
            <button
              type="button"
              onClick={() => void loadTeachers()}
              className="mt-6 rounded-full bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-400"
            >
              {m.teacherLeaderboard.retry}
            </button>
          </section>
        ) : archiveState === 'missing' ? (
          <section className="mt-8 rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-8 text-center shadow-[0_16px_60px_rgba(15,23,42,0.25)] backdrop-blur">
            <h2 className="text-2xl font-bold text-white">{m.teacherLeaderboard.archiveMissingTitle}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              {m.teacherLeaderboard.archiveMissingHint}
            </p>
          </section>
        ) : archiveState === 'legacy' ? (
          <section className="mt-8 rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-8 text-center shadow-[0_16px_60px_rgba(15,23,42,0.25)] backdrop-blur">
            <h2 className="text-2xl font-bold text-white">{m.teacherLeaderboard.archiveLegacyTitle}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              {m.teacherLeaderboard.archiveLegacyHint}
            </p>
          </section>
        ) : !hasTeachers ? (
          <section className="mt-8 rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-8 text-center shadow-[0_16px_60px_rgba(15,23,42,0.25)] backdrop-blur">
            <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/15 text-2xl shadow-[0_10px_30px_rgba(99,102,241,0.25)]">
              👩‍🏫
            </div>
            <h2 className="mt-5 text-2xl font-bold text-white">{m.teacherLeaderboard.emptyTitle}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              {m.teacherLeaderboard.emptyHint}
            </p>
          </section>
        ) : (
          <TeacherLeaderboard
            teachers={teachers}
            locale={activeLocale}
            selectedYear={selectedYear}
            archiveYears={archiveYears}
            currentAcademicYear={currentAcademicYear}
          />
        )}
      </div>
    </main>
  );
}
