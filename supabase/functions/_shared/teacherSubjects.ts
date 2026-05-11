export function normalizeSubjectName(subject: unknown): string | null {
  if (typeof subject !== 'string') {
    return null;
  }

  const trimmed = subject.trim();
  return trimmed ? trimmed : null;
}

export function normalizeTeacherSubjects(subjects: unknown): string[] {
  if (!Array.isArray(subjects)) {
    return [];
  }

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const subject of subjects) {
    const cleanSubject = normalizeSubjectName(subject);
    if (!cleanSubject) {
      continue;
    }

    const key = cleanSubject.toLocaleLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(cleanSubject);
  }

  return normalized;
}

export function isTeacherAllowedSubject(subjects: unknown, subject: unknown): boolean {
  const requestedSubject = normalizeSubjectName(subject);
  if (!requestedSubject) {
    return false;
  }

  const allowedSubjects = normalizeTeacherSubjects(subjects);
  return allowedSubjects.some(
    (allowedSubject) => allowedSubject.toLocaleLowerCase() === requestedSubject.toLocaleLowerCase()
  );
}
