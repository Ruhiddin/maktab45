import { listArchiveYears, loadArchiveSnapshot } from './archiveData';
import { buildArchiveRankingData, normalizeArchiveStudent } from './archiveSnapshot';
import { isPlaceholderMode, MOCK_RANKINGS, MOCK_STUDENTS } from './mockData';
import { supabase } from './supabase';
import { formatGradeSection } from './utils';

export async function getStaticClassRouteParams() {
  const gradeSections = new Set<string>();

  if (isPlaceholderMode()) {
    for (const student of MOCK_RANKINGS) {
      gradeSections.add(formatGradeSection(student.grade, student.section));
    }
  } else {
    const { data } = await supabase.from('live_ranking').select('grade, section');
    for (const student of data || []) {
      gradeSections.add(formatGradeSection(Number(student.grade), student.section ?? null));
    }
  }

  for (const year of listArchiveYears()) {
    const archive = loadArchiveSnapshot(year);
    for (const student of buildArchiveRankingData(archive)) {
      gradeSections.add(formatGradeSection(student.grade, student.section));
    }
  }

  return [...gradeSections]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((grade) => ({ params: { grade } }));
}

export async function getStaticStudentRouteParams() {
  const ids = new Set<string>();

  if (isPlaceholderMode()) {
    for (const student of MOCK_STUDENTS) {
      ids.add(student.id);
    }
  } else {
    const { data } = await supabase.from('students').select('id');
    for (const student of data || []) {
      ids.add(String(student.id));
    }
  }

  for (const year of listArchiveYears()) {
    const archive = loadArchiveSnapshot(year);
    for (const student of (archive?.students ?? []).map(normalizeArchiveStudent)) {
      ids.add(student.id);
    }
  }

  return [...ids].sort().map((id) => ({ params: { id } }));
}
