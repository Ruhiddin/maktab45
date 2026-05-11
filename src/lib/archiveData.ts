import fs from 'node:fs';
import path from 'node:path';
import {
  buildArchiveRankingData,
  buildArchiveTeacherPublicProfile,
  buildArchiveTeacherRankingData,
  normalizeArchiveQualification,
  normalizeArchiveStudent,
  normalizeArchiveTeacher,
  normalizeArchiveTeacherRank,
  type ArchiveSnapshot,
} from './archiveSnapshot';

export interface ArchiveSummary {
  year: number;
  filename: string;
  created_at: string;
  student_count: number;
  teacher_count: number;
  qualification_count: number;
}

function getArchivesDir() {
  return path.resolve('public/archives');
}

export function listArchiveSummaries(): ArchiveSummary[] {
  const archivesDir = getArchivesDir();
  if (!fs.existsSync(archivesDir)) {
    return [];
  }

  const archives: ArchiveSummary[] = [];
  const files = fs.readdirSync(archivesDir).filter((file) => file.endsWith('_archive.json'));

  for (const file of files) {
    try {
      const content = JSON.parse(fs.readFileSync(path.join(archivesDir, file), 'utf-8')) as ArchiveSnapshot;
      archives.push({
        year: Number(content.year),
        filename: file,
        created_at: content.created_at,
        student_count: content.students?.length || 0,
        teacher_count: content.teachers?.length || 0,
        qualification_count: content.qualifications?.length || 0,
      });
    } catch {
      // Skip malformed archives.
    }
  }

  return archives.sort((a, b) => b.year - a.year);
}

export function listArchiveYears(): number[] {
  return listArchiveSummaries().map((archive) => archive.year);
}

export function loadArchiveSnapshot(year: number | string): ArchiveSnapshot | null {
  const normalizedYear = Number(year);
  if (!Number.isInteger(normalizedYear)) {
    return null;
  }

  const filePath = path.join(getArchivesDir(), `${normalizedYear}_archive.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as ArchiveSnapshot;
  } catch {
    return null;
  }
}

export {
  buildArchiveRankingData,
  buildArchiveTeacherPublicProfile,
  buildArchiveTeacherRankingData,
  normalizeArchiveQualification,
  normalizeArchiveStudent,
  normalizeArchiveTeacher,
  normalizeArchiveTeacherRank,
};
