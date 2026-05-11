import React, { useEffect, useState } from 'react';
import Leaderboard from './Leaderboard';
import { buildArchiveRankingData, type ArchiveSnapshot } from '../lib/archiveSnapshot';
import { buildLocaleHref, getMessages, type Locale } from '../lib/i18n';
import { isPlaceholderMode, MOCK_QUALIFICATIONS, MOCK_RANKINGS, MOCK_ADMIN_SETTINGS } from '../lib/mockData';
import { fetchPublicSettingsDirect } from '../lib/publicData';
import { supabase } from '../lib/supabase';
import type { StudentRank } from '../types';

type Props = {
  locale: Locale;
  archiveYears: number[];
  fallbackSchoolName: string;
  fallbackAcademicYear: string;
};

function withRankDelta(students: StudentRank[], last7dByStudent: Map<string, number>) {
  const current = [...students].sort((a, b) => b.total_score - a.total_score);
  const currentRank = new Map<string, number>();
  current.forEach((student, index) => currentRank.set(student.student_id, index + 1));

  const prior = [...students].map((student) => ({
    id: student.student_id,
    score7: student.total_score - (last7dByStudent.get(student.student_id) ?? 0),
  }));
  prior.sort((a, b) => (b.score7 - a.score7) || a.id.localeCompare(b.id));

  const priorRank = new Map<string, number>();
  prior.forEach((student, index) => priorRank.set(student.id, index + 1));

  return students.map((student) => {
    const now = currentRank.get(student.student_id) ?? 0;
    const ago = priorRank.get(student.student_id) ?? 0;
    return { ...student, rank_delta: ago && now ? ago - now : 0 };
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
  const m = getMessages(locale);
  const [selectedYear, setSelectedYear] = useState<string | null>(() => getSelectedArchiveYear(archiveYears));
  const [schoolName, setSchoolName] = useState(fallbackSchoolName);
  const [academicYear, setAcademicYear] = useState(fallbackAcademicYear);
  const [leaderboardData, setLeaderboardData] = useState<StudentRank[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncFromLocation = () => {
      setSelectedYear(getSelectedArchiveYear(archiveYears));
    };

    syncFromLocation();
    window.addEventListener('popstate', syncFromLocation);
    return () => window.removeEventListener('popstate', syncFromLocation);
  }, [archiveYears]);

  useEffect(() => {
    let cancelled = false;

    const loadSettings = async () => {
      if (isPlaceholderMode()) {
        if (!cancelled) {
          setSchoolName(MOCK_ADMIN_SETTINGS.school_name || fallbackSchoolName);
          setAcademicYear(MOCK_ADMIN_SETTINGS.current_academic_year || fallbackAcademicYear);
        }
        return;
      }

      const data = await fetchPublicSettingsDirect();
      if (!cancelled && data) {
        setSchoolName(data.school_name || fallbackSchoolName);
        setAcademicYear(data.current_academic_year || fallbackAcademicYear);
      }
    };

    const loadLeaderboard = async () => {
      setLoading(true);

      if (selectedYear) {
        try {
          const response = await fetch(`/archives/${selectedYear}_archive.json`);
          const archive = response.ok ? ((await response.json()) as ArchiveSnapshot) : null;
          if (!cancelled) {
            setLeaderboardData(buildArchiveRankingData(archive));
          }
        } catch {
          if (!cancelled) {
            setLeaderboardData([]);
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
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

        if (!cancelled) {
          setLeaderboardData(withRankDelta(MOCK_RANKINGS as StudentRank[], last7d));
          setLoading(false);
        }
        return;
      }

      const result = await supabase.from('live_ranking').select('*').order('total_score', { ascending: false });
      if (result.error || !result.data) {
        if (!cancelled) {
          setLeaderboardData([]);
          setLoading(false);
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

      if (!cancelled) {
        setLeaderboardData(withRankDelta(students, last7d));
        setLoading(false);
      }
    };

    void loadSettings();
    void loadLeaderboard();

    return () => {
      cancelled = true;
    };
  }, [selectedYear, fallbackAcademicYear, fallbackSchoolName]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-indigo-950 py-12">
      <div className="max-w-5xl mx-auto px-4 text-center mb-8">
        <a href={buildLocaleHref('/access', locale)} className="inline-block group">
          <h1 className="text-4xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 mb-4 tracking-tight transition-transform group-hover:scale-[1.01]">
            {schoolName}
          </h1>
        </a>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          {selectedYear ? `${m.public.archiveLabel} ${selectedYear}` : academicYear} {m.public.homepageSubtitle}
        </p>
        {selectedYear && (
          <p className="mt-4 text-sm font-medium text-amber-700 dark:text-amber-300">
            {m.public.viewingArchive} {selectedYear}. {m.public.archiveHint}
          </p>
        )}
      </div>

      {loading ? (
        <div className="max-w-5xl mx-auto p-4">
          <div className="rounded-3xl border border-gray-200/70 bg-white/60 px-6 py-16 text-center shadow-lg backdrop-blur-md dark:border-gray-800 dark:bg-black/40">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-indigo-500/30 border-t-indigo-500" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{m.public.leaderboard}</p>
          </div>
        </div>
      ) : (
        <Leaderboard
          initialData={leaderboardData}
          locale={locale}
          selectedYear={selectedYear}
          enableHover={!selectedYear}
          currentAcademicYear={academicYear}
          archiveYears={archiveYears}
        />
      )}
    </main>
  );
}
