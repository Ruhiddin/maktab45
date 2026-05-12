import React, { useCallback, useEffect, useState } from 'react';
import Leaderboard from './Leaderboard';
import { buildArchiveRankingData, type ArchiveSnapshot } from '../lib/archiveSnapshot';
import { buildLocaleHref, getMessages, resolveRuntimeLocale, type Locale } from '../lib/i18n';
import { isPlaceholderMode, MOCK_QUALIFICATIONS, MOCK_RANKINGS, MOCK_ADMIN_SETTINGS } from '../lib/mockData';
import { fetchPublicSettingsDirect } from '../lib/publicData';
import { supabase } from '../lib/supabase';
import { buildTeacherLeaderboardHref, withBasePath } from '../lib/utils';
import type { StudentRank } from '../types';

type Props = {
  locale: Locale;
  archiveYears: number[];
  fallbackSchoolName: string;
  fallbackAcademicYear: string;
};

function withRankDelta(students: StudentRank[], last7dByStudent: Map<string, number>) {
  if (last7dByStudent.size === 0) {
    return students.map((student) => ({ ...student, rank_delta: 0, trend: 'flat' as const }));
  }

  const compareStudents = (
    left: Pick<StudentRank, 'total_score' | 'name' | 'student_id'>,
    right: Pick<StudentRank, 'total_score' | 'name' | 'student_id'>
  ) => {
    if (right.total_score !== left.total_score) return right.total_score - left.total_score;
    const byName = left.name.localeCompare(right.name);
    if (byName !== 0) return byName;
    return left.student_id.localeCompare(right.student_id);
  };

  const current = [...students].sort(compareStudents);
  const currentRank = new Map<string, number>();
  current.forEach((student, index) => currentRank.set(student.student_id, index + 1));

  const prior = [...students].map((student) => ({
    id: student.student_id,
    score7: student.total_score - (last7dByStudent.get(student.student_id) ?? 0),
  }));
  prior.sort((a, b) => {
    if (b.score7 !== a.score7) return b.score7 - a.score7;
    const currentLeft = students.find((student) => student.student_id === a.id);
    const currentRight = students.find((student) => student.student_id === b.id);
    if (currentLeft && currentRight) {
      const byName = currentLeft.name.localeCompare(currentRight.name);
      if (byName !== 0) return byName;
    }
    return a.id.localeCompare(b.id);
  });

  const priorRank = new Map<string, number>();
  prior.forEach((student, index) => priorRank.set(student.id, index + 1));

  return students.map((student) => {
    const now = currentRank.get(student.student_id) ?? 0;
    const ago = priorRank.get(student.student_id) ?? 0;
    return { ...student, rank_delta: ago && now ? ago - now : 0, trend: 'flat' as const };
  });
}

function getSelectedArchiveYear(archiveYears: number[]) {
  if (typeof window === 'undefined') {
    return null;
  }

  const year = window.location.search ? new URLSearchParams(window.location.search).get('year') : null;
  return year && archiveYears.includes(Number(year)) ? year : null;
}

export default function HomepageView({
  locale,
  archiveYears,
  fallbackSchoolName,
  fallbackAcademicYear,
}: Props) {
  const [activeLocale, setActiveLocale] = useState<Locale>(() => resolveRuntimeLocale(locale));
  const m = getMessages(activeLocale);
  const [selectedYear, setSelectedYear] = useState<string | null>(() => getSelectedArchiveYear(archiveYears));
  const [schoolName, setSchoolName] = useState(fallbackSchoolName);
  const [academicYear, setAcademicYear] = useState(fallbackAcademicYear);
  const [leaderboardData, setLeaderboardData] = useState<StudentRank[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);

  useEffect(() => {
    const syncFromLocation = () => {
      setActiveLocale(resolveRuntimeLocale(locale));
      setSelectedYear(getSelectedArchiveYear(archiveYears));
    };

    syncFromLocation();
    window.addEventListener('popstate', syncFromLocation);
    return () => window.removeEventListener('popstate', syncFromLocation);
  }, [archiveYears, locale]);

  const loadHomepageData = useCallback(async (signal?: AbortSignal, options?: { preserveVisibleData?: boolean }) => {
    const preserveVisibleData = options?.preserveVisibleData ?? false;
    const isCancelled = () => signal?.aborted ?? false;
    const markRefreshed = () => {
      if (!isCancelled()) {
        setLastRefreshedAt(new Date().toISOString());
      }
    };
    if (preserveVisibleData) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const loadSettings = async () => {
      if (isPlaceholderMode()) {
        if (!isCancelled()) {
          setSchoolName(MOCK_ADMIN_SETTINGS.school_name || fallbackSchoolName);
          setAcademicYear(MOCK_ADMIN_SETTINGS.current_academic_year || fallbackAcademicYear);
        }
        return;
      }

      const data = await fetchPublicSettingsDirect();
      if (!isCancelled() && data) {
        setSchoolName(data.school_name || fallbackSchoolName);
        setAcademicYear(data.current_academic_year || fallbackAcademicYear);
      }
    };

    const loadLeaderboard = async () => {
      if (selectedYear) {
        try {
          const response = await fetch(withBasePath(`/archives/${selectedYear}_archive.json`));
          const archive = response.ok ? ((await response.json()) as ArchiveSnapshot) : null;
          if (!isCancelled()) {
            setLeaderboardData(buildArchiveRankingData(archive));
            markRefreshed();
          }
        } catch {
          if (!isCancelled()) {
            setLeaderboardData([]);
          }
        } finally {
          if (!isCancelled()) {
            setLoading(false);
            setRefreshing(false);
          }
        }
        return;
      }

      if (isPlaceholderMode()) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 7);
        const last7d = new Map<string, number>();
        for (const qualification of MOCK_QUALIFICATIONS) {
          const createdAt = new Date(qualification.created_at);
          if (createdAt >= cutoff) {
            last7d.set(
              qualification.student_id,
              (last7d.get(qualification.student_id) ?? 0) + qualification.value
            );
          }
        }

        if (!isCancelled()) {
          setLeaderboardData(withRankDelta(MOCK_RANKINGS as StudentRank[], last7d));
          markRefreshed();
          setLoading(false);
          setRefreshing(false);
        }
        return;
      }

      const result = await supabase.from('live_ranking').select('*').order('total_score', { ascending: false });
      if (result.error || !result.data) {
        if (!isCancelled()) {
          setLeaderboardData([]);
          setLoading(false);
          setRefreshing(false);
        }
        return;
      }

      const students: StudentRank[] = result.data.map((row: any) => ({ ...row, trend: 'flat' }));
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      const cutoffIso = cutoff.toISOString();

      const last7Result = await supabase
        .from('qualifications')
        .select('student_id,value,created_at')
        .gt('created_at', cutoffIso);

      const last7d = new Map<string, number>();
      if (!last7Result.error && last7Result.data) {
        for (const row of last7Result.data as any[]) {
          last7d.set(row.student_id, (last7d.get(row.student_id) ?? 0) + (row.value ?? 0));
        }
      }

      if (!isCancelled()) {
        setLeaderboardData(withRankDelta(students, last7d));
        markRefreshed();
        setLoading(false);
        setRefreshing(false);
      }
    };

    void loadSettings();
    void loadLeaderboard();
  }, [fallbackAcademicYear, fallbackSchoolName, selectedYear]);

  useEffect(() => {
    const controller = new AbortController();
    void loadHomepageData(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadHomepageData]);

  const handleRefresh = () => {
    void loadHomepageData(undefined, { preserveVisibleData: true });
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-indigo-950 py-12 eboard:py-3">
      <div className="max-w-5xl eboard:max-w-[90rem] mx-auto px-4 eboard:px-3 text-center mb-8 eboard:mb-3">
        <a href={buildLocaleHref('/access', activeLocale)} className="inline-block group">
          <h1 className="text-4xl md:text-6xl eboard:text-[2.1rem] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 mb-4 eboard:mb-1 tracking-tight transition-transform group-hover:scale-[1.01]">
            {schoolName}
          </h1>
        </a>
        <p className="text-lg eboard:text-[0.9rem] text-gray-600 dark:text-gray-300 max-w-2xl eboard:max-w-[60rem] mx-auto">
          {selectedYear ? `${m.public.archiveLabel} ${selectedYear}` : academicYear} {m.public.homepageSubtitle}
        </p>
        <div className="mt-6 eboard:mt-2 inline-flex flex-wrap items-center justify-center gap-2 eboard:gap-1 rounded-full border border-white/10 bg-slate-950/35 p-1.5 eboard:p-[0.2rem] shadow-[0_12px_30px_rgba(15,23,42,0.2)] backdrop-blur">
          <span className="px-3 py-2 eboard:px-2 eboard:py-1 text-xs eboard:text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-slate-300">
            {m.public.leaderboardSwitch}
          </span>
          <span className="rounded-full bg-indigo-500 px-4 py-2 eboard:px-2.5 eboard:py-1 text-sm eboard:text-[0.72rem] font-semibold text-white shadow-sm">
            {m.public.studentLeaderboard}
          </span>
          <a
            href={buildLocaleHref(buildTeacherLeaderboardHref(selectedYear), activeLocale)}
            className="rounded-full px-4 py-2 eboard:px-2.5 eboard:py-1 text-sm eboard:text-[0.72rem] font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white"
            title={m.public.teacherLeaderboardHint}
          >
            {m.public.teacherLeaderboard}
          </a>
        </div>
        {selectedYear && (
          <p className="mt-4 text-sm font-medium text-amber-700 dark:text-amber-300">
            {m.public.viewingArchive} {selectedYear}. {m.public.archiveHint}
          </p>
        )}
      </div>

      {loading ? (
        <div className="max-w-5xl mx-auto p-4 eboard:px-3 eboard:pt-1">
          <div className="rounded-3xl border border-gray-200/70 bg-white/60 px-6 py-16 eboard:px-4 eboard:py-7 text-center shadow-lg backdrop-blur-md dark:border-gray-800 dark:bg-black/40">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-indigo-500/30 border-t-indigo-500" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{m.public.leaderboard}</p>
          </div>
        </div>
      ) : (
        <Leaderboard
          initialData={leaderboardData}
          locale={activeLocale}
          selectedYear={selectedYear}
          enableHover={!selectedYear}
          currentAcademicYear={academicYear}
          archiveYears={archiveYears}
          lastRefreshedAt={lastRefreshedAt}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}
    </main>
  );
}
