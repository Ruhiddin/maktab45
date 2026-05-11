import { authMiddleware, hashPassword, validatePasswordLength } from '../_shared/auth.ts';
import { handleOptions, withCors } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/publicSettings.ts';
import { json, jsonError } from '../_shared/response.ts';

function getTeacherIdFromPath(request: Request) {
  const pathname = new URL(request.url).pathname.replace(/\/+$/, '');
  const parts = pathname.split('/');
  const lastPart = parts[parts.length - 1];

  if (!lastPart || lastPart === 'admin-teacher-reset-password') {
    return null;
  }

  return decodeURIComponent(lastPart);
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

  const id = getTeacherIdFromPath(request);
  if (!id) {
    return withCors(request, jsonError(400, 'Missing ID'));
  }

  const body = await request.json().catch(() => null);
  if (!body || !body.new_password) {
    return withCors(request, jsonError(400, 'new_password is required'));
  }

  const newPassword = String(body.new_password);
  const passwordLengthError = validatePasswordLength(newPassword);
  if (passwordLengthError) {
    return withCors(request, jsonError(400, passwordLengthError));
  }

  const hashedPassword = await hashPassword(newPassword);
  const serviceClient = createServiceClient();

  const { error } = await serviceClient
    .from('teachers')
    .update({
      password_hash: hashedPassword,
      is_password_changed: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    return withCors(request, jsonError(500, error.message));
  }

  await serviceClient.from('audit_log').insert({
    actor_type: 'admin',
    action: 'teacher.reset_password',
    target_type: 'teacher',
    target_id: id,
    details: {},
  });

  return withCors(request, json({ success: true }));
});
