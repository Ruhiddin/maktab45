import React, { useEffect, useMemo, useState } from 'react';
import StudentDetail from './StudentDetail';
import ClientStudyYearPicker from './ClientStudyYearPicker';
import { buildArchiveRankingData, normalizeArchiveQualification, normalizeArchiveStudent, type ArchiveSnapshot } from '../lib/archiveSnapshot';
import { isPlaceholderMode, MOCK_QUALIFICATIONS, MOCK_RANKINGS, MOCK_STUDENTS } from '../lib/mockData';
import { supabase } from '../lib/supabase';
import { buildYearHref } from '../lib/utils';
import { getMessages, type Locale } from '../lib/i18n';
import type { Qualification, StudentDetail as StudentDetailType, StudentRank } from '../types';

type Props = {
  locale: Locale;
  pathname: string;
  studentId: string;
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

export default function StudentDetailView({
  locale,
  pathname,
  studentId,
  archiveYears,
  currentAcademicYear,
}: Props) {
  const m = getMessages(locale);
  const [selectedYear, setSelectedYear] = useState<string | null>(() => getSelectedArchiveYear(archiveYears));
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<StudentDetailType | null>(null);
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [ranking, setRanking] = useState<StudentRank | null>(null);
  const [classmates, setClassmates] = useState<StudentRank[]>([]);

  useEffect(() => {
    const syncFromLocation = () => setSelectedYear(getSelectedArchiveYear(archiveYears));
    syncFromLocation();
    window.addEventListener('popstate', syncFromLocation);
    return () => window.removeEventListener('popstate', syncFromLocation);
  }, [archiveYears]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      if (selectedYear) {
        try {
          const response = await fetch(`/archives/${selectedYear}_archive.json`);
          const archive = response.ok ? ((await response.json()) as ArchiveSnapshot) : null;
          const archiveStudents = (archive?.students ?? []).map(normalizeArchiveStudent);
          const archiveQualifications = (archive?.qualifications ?? []).map(normalizeArchiveQualification);
          const archiveRankings = buildArchiveRankingData(archive);
          const nextStudent = archiveStudents.find((entry) => entry.id === studentId) || null;

          if (!cancelled) {
            setStudent(nextStudent);
            setQualifications(
              archiveQualifications
                .filter((qualification) => qualification.student_id === studentId)
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            );
            setRanking(archiveRankings.find((entry) => entry.student_id === studentId) || null);
            setClassmates(
              nextStudent
                ? archiveRankings.filter(
                    (entry) =>
                      entry.grade === nextStudent.grade &&
                      (nextStudent.section ? entry.section === nextStudent.section : true)
                  )
                : []
            );
          }
        } catch {
          if (!cancelled) {
            setStudent(null);
            setQualifications([]);
            setRanking(null);
            setClassmates([]);
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
        return;
      }

      if (isPlaceholderMode()) {
        const nextStudent = MOCK_STUDENTS.find((entry) => entry.id === studentId) || null;
        if (!cancelled) {
          setStudent(nextStudent);
          setQualifications(MOCK_QUALIFICATIONS.filter((qualification) => qualification.student_id === studentId));
          setRanking(MOCK_RANKINGS.find((entry) => entry.student_id === studentId) || null);
          setClassmates(
            nextStudent
              ? MOCK_RANKINGS.filter(
                  (entry) =>
                    entry.grade === nextStudent.grade &&
                    (nextStudent.section ? entry.section === nextStudent.section : true)
                )
              : []
          );
          setLoading(false);
        }
        return;
      }

      const { data: studentData } = await supabase.from('students').select('*').eq('id', studentId).single();
      const nextStudent = (studentData as StudentDetailType | null) ?? null;

      const { data: qualificationData } = await supabase
        .from('qualifications')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      const { data: rankingData } = await supabase.from('live_ranking').select('*').eq('student_id', studentId).single();

      let nextClassmates: StudentRank[] = [];
      if (nextStudent) {
        let query = supabase
          .from('live_ranking')
          .select('*')
          .eq('grade', nextStudent.grade)
          .order('total_score', { ascending: false });

        if (nextStudent.section) {
          query = query.eq('section', nextStudent.section);
        }

        const { data: classmateData } = await query;
        nextClassmates = ((classmateData || []) as any[]).map((row) => ({ ...row, trend: 'flat' }));
      }

      if (!cancelled) {
        setStudent(nextStudent);
        setQualifications((qualificationData || []) as Qualification[]);
        setRanking(rankingData ? ({ ...rankingData, trend: 'flat' } as StudentRank) : null);
        setClassmates(nextClassmates);
        setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [selectedYear, studentId]);

  const backHref = useMemo(() => buildYearHref('/', selectedYear), [selectedYear]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-indigo-950 py-12">
      <div className="max-w-5xl mx-auto px-4 mb-6 flex justify-center">
        <ClientStudyYearPicker
          pathname={pathname}
          locale={locale}
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
      ) : student ? (
        <StudentDetail
          locale={locale}
          student={student}
          qualifications={qualifications}
          ranking={ranking}
          classmates={classmates}
          selectedYear={selectedYear}
          isArchiveView={Boolean(selectedYear)}
        />
      ) : (
        <div className="max-w-4xl mx-auto px-4">
          <div className="rounded-3xl border border-gray-200/70 bg-white/60 px-6 py-14 text-center shadow-lg backdrop-blur-md dark:border-gray-800 dark:bg-black/40">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{m.public.noFilteredStudents}</p>
            <a href={backHref} className="mt-4 inline-flex text-sm font-medium text-indigo-600 hover:underline">
              {m.studentDetail.back}
            </a>
          </div>
        </div>
      )}
    </main>
  );
}
