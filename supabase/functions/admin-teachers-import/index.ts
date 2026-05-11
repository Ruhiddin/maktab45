import { authMiddleware, getBearerToken, hashPassword, validatePasswordLength } from '../_shared/auth.ts';
import { handleOptions, withCors } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/publicSettings.ts';
import { isRateLimited } from '../_shared/rateLimit.ts';
import { json, jsonError } from '../_shared/response.ts';
import { normalizeTeacherSubjects } from '../_shared/teacherSubjects.ts';

type TeacherImportRow = {
  full_name?: unknown;
  subjects?: unknown;
  default_password?: unknown;
};

function describeTeacherImportRow(row: TeacherImportRow, index: number) {
  const name =
    typeof row.full_name === 'string' && row.full_name.trim().length > 0
      ? row.full_name.trim()
      : `row ${index + 1}`;
  return `${name} (row ${index + 1})`;
}

function getTeacherSubjects(subjects: unknown) {
  if (typeof subjects === 'string') {
    return normalizeTeacherSubjects(
      subjects
        .split(',')
        .map((subject) => subject.trim())
        .filter(Boolean)
    );
  }

  if (Array.isArray(subjects)) {
    return normalizeTeacherSubjects(subjects);
  }

  return [] as string[];
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

  if (isRateLimited({ key: `teacher-import:${sessionToken}`, limit: 1, windowMs: 60_000 })) {
    return withCors(
      request,
      jsonError(429, 'Rate limited. Only 1 teacher import is allowed per minute per admin session.')
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.teachers)) {
    return withCors(request, jsonError(400, 'Expected an object with a teachers array'));
  }

  const serviceClient = createServiceClient();
  const { data: existingData, error: existingError } = await serviceClient
    .from('teachers')
    .select('id, full_name');

  if (existingError) {
    return withCors(request, jsonError(500, existingError.message));
  }

  const existingTeachers = existingData ?? [];
  const existingTeachersByName = new Map(
    existingTeachers.map((teacher) => [teacher.full_name, teacher] as const)
  );
  const newlyImportedTeacherNames = new Set<string>();
  const passwordHashCache = new Map<string, string>();
  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const [index, rawRow] of (body.teachers as TeacherImportRow[]).entries()) {
    const fullName = typeof rawRow.full_name === 'string' ? rawRow.full_name.trim() : '';
    const defaultPassword =
      rawRow.default_password === undefined || rawRow.default_password === null
        ? ''
        : String(rawRow.default_password);

    if (!fullName || !defaultPassword) {
      errors.push(
        `Missing required full_name or default_password for ${describeTeacherImportRow(rawRow, index)}`
      );
      continue;
    }

    const passwordLengthError = validatePasswordLength(defaultPassword);
    if (passwordLengthError) {
      errors.push(`${describeTeacherImportRow(rawRow, index)}: ${passwordLengthError}`);
      continue;
    }

    const subjects = getTeacherSubjects(rawRow.subjects);
    let passwordHash = passwordHashCache.get(defaultPassword);
    if (!passwordHash) {
      passwordHash = await hashPassword(defaultPassword);
      passwordHashCache.set(defaultPassword, passwordHash);
    }

    const existingTeacher = existingTeachersByName.get(fullName);
    const updatedAt = new Date().toISOString();

    if (!existingTeacher && newlyImportedTeacherNames.has(fullName)) {
      errors.push(`Duplicate full_name in import file: ${describeTeacherImportRow(rawRow, index)}`);
      continue;
    }

    if (existingTeacher) {
      const { error: updateError } = await serviceClient
        .from('teachers')
        .update({
          subjects,
          password_hash: passwordHash,
          is_password_changed: false,
          updated_at: updatedAt,
        })
        .eq('id', existingTeacher.id);

      if (updateError) {
        errors.push(`Failed to update ${fullName}: ${updateError.message}`);
        continue;
      }

      updated += 1;
      continue;
    }

    const { error: insertError } = await serviceClient.from('teachers').insert({
      full_name: fullName,
      subjects,
      password_hash: passwordHash,
      is_password_changed: false,
      is_active: true,
      updated_at: updatedAt,
    });

    if (insertError) {
      errors.push(`Failed to insert ${fullName}: ${insertError.message}`);
      continue;
    }

    created += 1;
    newlyImportedTeacherNames.add(fullName);
  }

  if (created > 0 || updated > 0) {
    await serviceClient.from('audit_log').insert({
      actor_type: 'admin',
      action: 'teacher.import',
      details: { created, updated, errors_count: errors.length },
    });
  }

  return withCors(request, json({ created, updated, errors }));
});
