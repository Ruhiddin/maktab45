import { createServiceClient } from '../_shared/publicSettings.ts';
import { createToken, verifyPassword } from '../_shared/auth.ts';
import { handleOptions, withCors } from '../_shared/cors.ts';
import { isRateLimited } from '../_shared/rateLimit.ts';
import { json, jsonError } from '../_shared/response.ts';
import { normalizeTeacherSubjects } from '../_shared/teacherSubjects.ts';

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown';
  }

  return request.headers.get('x-real-ip') || 'unknown';
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }

  if (request.method !== 'POST') {
    return withCors(request, jsonError(405, 'Method not allowed'));
  }

  const ip = getClientIp(request);
  if (isRateLimited({ key: `teacher-login:${ip}`, limit: 5, windowMs: 60_000 })) {
    return withCors(
      request,
      jsonError(429, 'Too many login attempts. Please try again in a minute.')
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || !body.teacher_id || !body.password) {
    return withCors(request, jsonError(400, 'teacher_id and password are required'));
  }

  const { teacher_id, password } = body;
  const serviceClient = createServiceClient();

  const { data: teacher, error: fetchError } = await serviceClient
    .from('teachers')
    .select('id, full_name, subjects, is_password_changed, password_hash, is_active')
    .eq('id', teacher_id)
    .single();

  if (fetchError || !teacher) {
    return withCors(request, jsonError(401, 'Invalid login credentials'));
  }

  if (!teacher.is_active) {
    return withCors(
      request,
      jsonError(403, 'This teacher account has been deactivated. Contact an administrator.')
    );
  }

  const valid = await verifyPassword(password, teacher.password_hash);
  if (!valid) {
    return withCors(request, jsonError(401, 'Invalid login credentials'));
  }

  await serviceClient.from('audit_log').insert({
    actor_type: 'teacher',
    actor_id: teacher.id,
    action: 'teacher.login',
    details: { ip },
  });

  const token = await createToken({ role: 'teacher', teacher_id: teacher.id });
  return withCors(
    request,
    json({
      token,
      teacher: {
        id: teacher.id,
        full_name: teacher.full_name,
        subjects: normalizeTeacherSubjects(teacher.subjects),
        is_password_changed: teacher.is_password_changed,
      },
    })
  );
});
