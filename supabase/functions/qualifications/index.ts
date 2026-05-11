import { authMiddleware, getBearerToken } from '../_shared/auth.ts';
import { handleOptions, withCors } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/publicSettings.ts';
import { isRateLimited } from '../_shared/rateLimit.ts';
import { json, jsonError } from '../_shared/response.ts';
import { isTeacherAllowedSubject, normalizeSubjectName, normalizeTeacherSubjects } from '../_shared/teacherSubjects.ts';

const VALID_CATEGORIES = ['Academic', 'Behavior', 'Extracurricular', 'Attendance'] as const;
const VALID_VALUES = [-5, -3, -1, 0, 1, 3, 5] as const;

function getQualificationIdFromPath(request: Request) {
  const pathname = new URL(request.url).pathname.replace(/\/+$/, '');
  const parts = pathname.split('/');
  const lastPart = parts[parts.length - 1];

  if (!lastPart || lastPart === 'qualifications') {
    return null;
  }

  return decodeURIComponent(lastPart);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }

  if (request.method === 'GET') {
    const { response } = await authMiddleware(request, ['teacher']);
    if (response) {
      return withCors(request, response);
    }

    const serviceClient = createServiceClient();
    const { data, error } = await serviceClient
      .from('students')
      .select('*')
      .order('full_name');

    if (error) {
      return withCors(request, jsonError(500, error.message));
    }

    return withCors(request, json(data || []));
  }

  if (request.method === 'POST') {
    const { auth, response } = await authMiddleware(request, ['teacher']);
    if (response) {
      return withCors(request, response);
    }

    const teacherId = auth?.teacher_id;
    const token = getBearerToken(request);
    if (!teacherId || !token) {
      return withCors(request, jsonError(401, 'Invalid teacher token'));
    }

    if (isRateLimited({ key: `qualification-write:${token}`, limit: 1, windowMs: 1_000 })) {
      return withCors(
        request,
        jsonError(429, 'Rate limited. Please wait 1 second between updates.')
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return withCors(request, jsonError(400, 'Invalid JSON body'));
    }

    const { student_id, category, subject, value, teacher_note } = body;

    if (!student_id || !category || value === undefined) {
      return withCors(
        request,
        jsonError(400, 'student_id, category, and value are required')
      );
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return withCors(
        request,
        jsonError(400, `category must be one of: ${VALID_CATEGORIES.join(', ')}`)
      );
    }

    const requestedSubject = normalizeSubjectName(subject);
    if (!requestedSubject) {
      return withCors(request, jsonError(400, 'subject is required'));
    }

    const numericValue = Number(value);
    if (!VALID_VALUES.includes(numericValue as typeof VALID_VALUES[number])) {
      return withCors(
        request,
        jsonError(400, 'value must be one of: -5, -3, -1, 0, 1, 3, 5')
      );
    }

    const serviceClient = createServiceClient();
    const { data: teacher, error: teacherError } = await serviceClient
      .from('teachers')
      .select('subjects')
      .eq('id', teacherId)
      .single();

    if (teacherError || !teacher) {
      return withCors(request, jsonError(404, 'Teacher account not found'));
    }

    const allowedSubjects = normalizeTeacherSubjects(teacher.subjects);
    if (allowedSubjects.length === 0) {
      return withCors(
        request,
        jsonError(403, 'No subjects are assigned to this teacher account. Contact an administrator.')
      );
    }

    if (!isTeacherAllowedSubject(allowedSubjects, requestedSubject)) {
      return withCors(
        request,
        jsonError(403, 'You can only submit qualifications for subjects assigned to you.')
      );
    }

    const { data, error } = await serviceClient
      .from('qualifications')
      .insert({
        student_id,
        category,
        subject: requestedSubject,
        value: numericValue,
        teacher_note: teacher_note || null,
        teacher_id: teacherId,
      })
      .select()
      .single();

    if (error) {
      return withCors(request, jsonError(500, error.message));
    }

    await serviceClient.from('audit_log').insert({
      actor_type: 'teacher',
      actor_id: teacherId,
      action: 'qualification.create',
      target_type: 'student',
      target_id: student_id,
      details: { category, subject: requestedSubject, value: numericValue, teacher_note },
    });

    return withCors(request, json(data, { status: 201 }));
  }

  if (request.method === 'DELETE') {
    const { auth, response } = await authMiddleware(request, ['teacher']);
    if (response) {
      return withCors(request, response);
    }

    const teacherId = auth?.teacher_id;
    if (!teacherId) {
      return withCors(request, jsonError(401, 'Invalid teacher token'));
    }

    const qualificationId = getQualificationIdFromPath(request);
    if (!qualificationId) {
      return withCors(request, jsonError(400, 'Qualification ID is required'));
    }

    const serviceClient = createServiceClient();
    const { data: qualification, error: fetchError } = await serviceClient
      .from('qualifications')
      .select('*')
      .eq('id', qualificationId)
      .single();

    if (fetchError || !qualification) {
      return withCors(request, jsonError(404, 'Qualification not found'));
    }

    if (qualification.teacher_id !== teacherId) {
      return withCors(request, jsonError(403, 'You can only undo your own qualifications'));
    }

    const ageMs = Date.now() - new Date(qualification.created_at).getTime();
    if (ageMs > 60_000) {
      return withCors(request, jsonError(403, 'Undo window expired (60 seconds)'));
    }

    const { error: deleteError } = await serviceClient
      .from('qualifications')
      .delete()
      .eq('id', qualificationId);

    if (deleteError) {
      return withCors(request, jsonError(500, deleteError.message));
    }

    await serviceClient.from('audit_log').insert({
      actor_type: 'teacher',
      actor_id: teacherId,
      action: 'qualification.delete',
      target_type: 'student',
      target_id: qualification.student_id,
      details: {
        category: qualification.category,
        subject: qualification.subject,
        value: qualification.value,
        teacher_note: qualification.teacher_note,
      },
    });

    return withCors(request, json({ success: true }));
  }

  return withCors(request, jsonError(405, 'Method not allowed'));
});
