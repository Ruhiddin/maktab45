import React, { useEffect, useMemo, useState } from 'react';
import ClassDetail from './ClassDetail';
import ClientStudyYearPicker from './ClientStudyYearPicker';
import { buildArchiveRankingData, type ArchiveSnapshot } from '../lib/archiveSnapshot';
import { isPlaceholderMode, MOCK_RANKINGS } from '../lib/mockData';
import { supabase } from '../lib/supabase';
import { withBasePath } from '../lib/utils';
import type { StudentRank } from '../types';
import { resolveRuntimeLocale, type Locale } from '../lib/i18n';

type Props = {
  locale: Locale;
  pathname: string;
  gradeSection: string;
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

export default function ClassDetailView({
  locale,
  pathname,
  gradeSection,
  archiveYears,
  currentAcademicYear,
}: Props) {
  const [activeLocale, setActiveLocale] = useState<Locale>(() => resolveRuntimeLocale(locale));
  const [selectedYear, setSelectedYear] = useState<string | null>(() => getSelectedArchiveYear(archiveYears));
  const [allStudents, setAllStudents] = useState<StudentRank[]>([]);
  const [loading, setLoading] = useState(true);

  const { gradeNum, section } = useMemo(() => {
    const parts = gradeSection.split('-');
    return {
      gradeNum: Number(parts[0]),
      section: parts.length > 1 ? parts[1] : null,
    };
  }, [gradeSection]);

  useEffect(() => {
    const syncFromLocation = () => {
      setActiveLocale(resolveRuntimeLocale(locale));
      setSelectedYear(getSelectedArchiveYear(archiveYears));
    };
    syncFromLocation();
    window.addEventListener('popstate', syncFromLocation);
    return () => window.removeEventListener('popstate', syncFromLocation);
  }, [archiveYears, locale]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      if (selectedYear) {
        try {
          const response = await fetch(withBasePath(`/archives/${selectedYear}_archive.json`));
          const archive = response.ok ? ((await response.json()) as ArchiveSnapshot) : null;
          if (!cancelled) {
            setAllStudents(buildArchiveRankingData(archive));
          }
        } catch {
          if (!cancelled) {
            setAllStudents([]);
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
        return;
      }

      if (isPlaceholderMode()) {
        if (!cancelled) {
          setAllStudents(MOCK_RANKINGS);
          setLoading(false);
        }
        return;
      }

      const { data } = await supabase.from('live_ranking').select('*').order('total_score', { ascending: false });
      if (!cancelled) {
        setAllStudents(((data || []) as any[]).map((row) => ({ ...row, trend: 'flat' })));
        setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [selectedYear]);

  const gradeStudents = useMemo(
    () => allStudents.filter((student) => student.grade === gradeNum && (!section || student.section === section)),
    [allStudents, gradeNum, section]
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-indigo-950 py-12">
      <div className="max-w-5xl mx-auto px-4 mb-6 flex justify-center">
        <ClientStudyYearPicker
          pathname={pathname}
          locale={activeLocale}
          currentAcademicYear={currentAcademicYear}
          archiveYears={archiveYears}
          selectedYear={selectedYear}
        />
      </div>

      {loading ? (
        <div className="max-w-5xl mx-auto px-4">
          <div className="rounded-3xl border border-gray-200/70 bg-white/60 px-6 py-16 text-center shadow-lg backdrop-blur-md dark:border-gray-800 dark:bg-black/40">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-indigo-500/30 border-t-indigo-500" />
          </div>
        </div>
      ) : (
        <ClassDetail
          grade={gradeNum}
          section={section}
          students={gradeStudents}
          allStudents={allStudents}
          selectedYear={selectedYear}
          isArchiveView={Boolean(selectedYear)}
        />
      )}
    </main>
  );
}
