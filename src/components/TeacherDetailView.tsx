import { useEffect, useMemo, useState } from 'react';
import ClientStudyYearPicker from './ClientStudyYearPicker';
import { normalizeArchiveTeacherProfile, normalizeArchiveTeacherRanking, fetchPublicTeacherProfileDirect, fetchPublicTeacherRankingDirect } from '../lib/publicData';
import type { ArchiveSnapshot } from '../lib/archiveSnapshot';
import { buildLocaleHref, getMessages, resolveRuntimeLocale, type Locale } from '../lib/i18n';
import { withBasePath } from '../lib/utils';
import type { TeacherPublicProfile } from '../types';
import TeacherDetail from './TeacherDetail';

type Props = {
  locale: Locale;
  pathname: string;
  teacherId?: string | null;
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

export default function TeacherDetailView({
  locale,
  pathname,
  teacherId,
  archiveYears,
  currentAcademicYear,
}: Props) {
  const [activeLocale, setActiveLocale] = useState<Locale>(() => resolveRuntimeLocale(locale));
  const [selectedYear, setSelectedYear] = useState<string | null>(() => getSelectedArchiveYear(archiveYears));
  const [activeTeacherId, setActiveTeacherId] = useState<string | null>(() => {
    if (typeof window === 'undefined') {
      return teacherId ?? null;
    }

    return new URLSearchParams(window.location.search).get('id') || teacherId || null;
  });
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<TeacherPublicProfile | null>(null);
  const [rankPosition, setRankPosition] = useState<number | null>(null);
  const [archiveState, setArchiveState] = useState<'ready' | 'missing' | 'legacy'>('ready');
  const m = getMessages(activeLocale);

  useEffect(() => {
    const syncFromLocation = () => {
      setActiveLocale(resolveRuntimeLocale(locale));
      setSelectedYear(getSelectedArchiveYear(archiveYears));
      setActiveTeacherId(new URLSearchParams(window.location.search).get('id') || teacherId || null);
    };

    syncFromLocation();
    window.addEventListener('popstate', syncFromLocation);
    return () => window.removeEventListener('popstate', syncFromLocation);
  }, [archiveYears, locale, teacherId]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setArchiveState('ready');

      if (!activeTeacherId) {
        setProfile(null);
        setRankPosition(null);
        setLoading(false);
        return;
      }

      if (selectedYear) {
        try {
          const response = await fetch(withBasePath(`/archives/${selectedYear}_archive.json`));
          if (!response.ok) {
            if (!cancelled) {
              setProfile(null);
              setRankPosition(null);
              setArchiveState('missing');
            }
            return;
          }

          const archive = (await response.json()) as ArchiveSnapshot;
          if (!cancelled) {
            const hasTeacherArchiveData = Boolean(
              (archive.teacher_ranking && archive.teacher_ranking.length > 0) ||
              (archive.teachers && archive.teachers.length > 0)
            );
            setProfile(normalizeArchiveTeacherProfile(archive, activeTeacherId));
            const ranking = normalizeArchiveTeacherRanking(archive);
            const nextRankPosition = ranking.findIndex((entry) => entry.teacher_id === activeTeacherId);
            setRankPosition(nextRankPosition >= 0 ? nextRankPosition + 1 : null);
            setArchiveState(hasTeacherArchiveData ? 'ready' : 'legacy');
          }
        } catch {
          if (!cancelled) {
            setProfile(null);
            setRankPosition(null);
            setArchiveState('missing');
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
        return;
      }

      try {
        const [nextProfile, ranking] = await Promise.all([
          fetchPublicTeacherProfileDirect(activeTeacherId),
          fetchPublicTeacherRankingDirect(),
        ]);
        if (!cancelled) {
          setProfile(nextProfile);
          const nextRankPosition = ranking.findIndex((entry) => entry.teacher_id === activeTeacherId);
          setRankPosition(nextRankPosition >= 0 ? nextRankPosition + 1 : null);
        }
      } catch {
        if (!cancelled) {
          setProfile(null);
          setRankPosition(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [activeTeacherId, selectedYear]);

  const backHref = useMemo(
    () => buildLocaleHref('/teachers', activeLocale, selectedYear ? `year=${selectedYear}` : null),
    [activeLocale, selectedYear]
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-indigo-950 py-12 eboard:py-6">
      <div className="max-w-5xl mx-auto px-4 mb-6 eboard:mb-4 flex justify-center">
        <ClientStudyYearPicker
          pathname={pathname}
          locale={activeLocale}
          currentAcademicYear={currentAcademicYear}
          archiveYears={archiveYears}
          selectedYear={selectedYear}
          preservedSearchParams={activeTeacherId ? `id=${activeTeacherId}` : null}
        />
      </div>

      {loading ? (
        <div className="max-w-4xl mx-auto px-4">
          <div className="rounded-3xl border border-gray-200/70 bg-white/60 px-6 eboard:px-5 py-16 eboard:py-10 text-center shadow-lg backdrop-blur-md dark:border-gray-800 dark:bg-black/40">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-indigo-500/30 border-t-indigo-500" />
          </div>
        </div>
      ) : profile ? (
        <TeacherDetail
          locale={activeLocale}
          profile={profile}
          rankPosition={rankPosition}
          selectedYear={selectedYear}
        />
      ) : (
        <div className="max-w-4xl mx-auto px-4">
          <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 px-8 eboard:px-6 py-12 eboard:py-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.32)] backdrop-blur">
            {archiveState === 'missing' ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-300">
                  {m.teacherDetail.eyebrow}
                </p>
                <h1 className="mt-4 text-3xl font-black text-white md:text-4xl">{m.teacherDetail.archiveSnapshotMissing}</h1>
                <p className="mt-4 text-sm leading-7 text-slate-300 md:text-base">
                  {m.teacherDetail.archiveSnapshotMissingHint}
                </p>
              </>
            ) : archiveState === 'legacy' ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-300">
                  {m.teacherDetail.eyebrow}
                </p>
                <h1 className="mt-4 text-3xl font-black text-white md:text-4xl">{m.teacherDetail.teacherArchiveUnavailable}</h1>
                <p className="mt-4 text-sm leading-7 text-slate-300 md:text-base">
                  {m.teacherDetail.teacherArchiveUnavailableHint}
                </p>
              </>
            ) : activeTeacherId ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-rose-300">
                  {m.teacherDetail.eyebrow}
                </p>
                <h1 className="mt-4 text-3xl font-black text-white md:text-4xl">{m.teacherDetail.teacherNotFound}</h1>
                <p className="mt-4 text-sm leading-7 text-slate-300 md:text-base">
                  {m.teacherDetail.teacherNotFoundHint}
                </p>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-300">
                  {m.teacherDetail.eyebrow}
                </p>
                <h1 className="mt-4 text-3xl font-black text-white md:text-4xl">{m.teacherDetail.teacherIdMissing}</h1>
                <p className="mt-4 text-sm leading-7 text-slate-300 md:text-base">
                  {m.teacherDetail.teacherIdMissingHint}{' '}
                  <span className="font-mono text-white">?id=&lt;teacher_id&gt;</span>.
                </p>
              </>
            )}

            <a
              href={backHref}
              className="mt-8 inline-flex rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-indigo-400/40 hover:bg-indigo-500/10"
            >
              {m.teacherDetail.back}
            </a>
          </div>
        </div>
      )}
    </main>
  );
}
