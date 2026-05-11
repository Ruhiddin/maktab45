import { authMiddleware, getBearerToken } from '../_shared/auth.ts';
import { handleOptions, withCors } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/publicSettings.ts';
import { isRateLimited } from '../_shared/rateLimit.ts';
import { json, jsonError } from '../_shared/response.ts';

type StudentImportRow = {
  full_name?: unknown;
  gender?: unknown;
  grade?: unknown;
  section?: unknown;
};

function normalizeStudentGender(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'male' || normalized === 'erkak' || normalized === 'o‘g‘il' || normalized === "o'g'il") {
    return 'male' as const;
  }

  if (normalized === 'female' || normalized === 'ayol' || normalized === 'qiz') {
    return 'female' as const;
  }

  return normalized;
}

function normalizeStudentRow(row: StudentImportRow) {
  return {
    full_name: typeof row.full_name === 'string' ? row.full_name.trim() : '',
    gender: normalizeStudentGender(row.gender),
    grade: typeof row.grade === 'number' ? row.grade : Number(row.grade),
    section: typeof row.section === 'string' ? row.section.trim() || null : null,
  };
}

function studentDedupKey(row: { full_name: string; grade: number; section: string | null }) {
  return `${row.full_name}::${row.grade}::${row.section ?? ''}`;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }

  if (request.method !== 'POST') {
    return withCors(request, jsonError(405, 'Method not allowed'));
  }

  const { response } = await authMiddleware(request, ['admin']);
  if (response) {
    return withCors(request, response);
  }

  const sessionToken = getBearerToken(request);
  if (!sessionToken) {
    return withCors(request, jsonError(401, 'Missing bearer token'));
  }

  if (isRateLimited({ key: `student-import:${sessionToken}`, limit: 1, windowMs: 60_000 })) {
    return withCors(
      request,
      jsonError(429, 'Rate limited. Only 1 student import is allowed per minute per admin session.')
    );
  }

  const body = await request.json().catch(() => null);
  const students = Array.isArray(body) ? body : body?.students;
  if (!Array.isArray(students)) {
    return withCors(
      request,
      jsonError(400, 'Expected either an array of students or an object with a students array')
    );
  }

  const serviceClient = createServiceClient();
  const { data: existingStudents, error: existingError } = await serviceClient
    .from('students')
    .select('full_name, grade, section');

  if (existingError) {
    return withCors(request, jsonError(500, existingError.message));
  }

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];
  const toInsert: Array<{
    full_name: string;
    gender: 'male' | 'female';
    grade: number;
    section: string | null;
    is_active: true;
  }> = [];

  const existingKeys = new Set(
    (existingStudents ?? []).map((student) =>
      studentDedupKey({
        full_name: student.full_name,
        grade: student.grade,
        section: student.section ?? null,
      })
    )
  );
  const pendingKeys = new Set<string>();

  for (const rawRow of students as StudentImportRow[]) {
    const row = normalizeStudentRow(rawRow);
    const validGender = row.gender === 'male' || row.gender === 'female';
    const validGrade = Number.isInteger(row.grade) && row.grade >= 1 && row.grade <= 11;

    if (!row.full_name || !validGender || !validGrade) {
      errors.push(`Invalid row: ${JSON.stringify(rawRow)}`);
      continue;
    }

    const key = studentDedupKey({
      full_name: row.full_name,
      grade: row.grade,
      section: row.section,
    });

    if (existingKeys.has(key) || pendingKeys.has(key)) {
      skipped += 1;
      continue;
    }

    pendingKeys.add(key);
    toInsert.push({
      full_name: row.full_name,
      gender: row.gender,
      grade: row.grade,
      section: row.section,
      is_active: true,
    });
  }

  if (toInsert.length > 0) {
    const { error: insertError } = await serviceClient.from('students').insert(toInsert);
    if (insertError) {
      return withCors(request, jsonError(500, insertError.message));
    }

    created = toInsert.length;

    await serviceClient.from('audit_log').insert({
      actor_type: 'admin',
      action: 'student.import',
      details: { count: created },
    });
  }

  return withCors(request, json({ created, skipped, errors }));
});
