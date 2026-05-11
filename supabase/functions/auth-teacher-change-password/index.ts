import { authMiddleware, hashPassword, validatePasswordLength, verifyPassword } from '../_shared/auth.ts';
import { handleOptions, withCors } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/publicSettings.ts';
import { json, jsonError } from '../_shared/response.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }

  if (request.method !== 'POST') {
    return withCors(request, jsonError(405, 'Method not allowed'));
  }

  const { auth, response } = await authMiddleware(request, ['teacher']);
  if (response) {
    return withCors(request, response);
  }

  const teacherId = auth?.teacher_id;
  const body = await request.json().catch(() => null);
  if (!body || !body.old_password || !body.new_password) {
    return withCors(request, jsonError(400, 'old_password and new_password are required'));
  }

  const { old_password, new_password } = body;
  const passwordLengthError = validatePasswordLength(new_password);
  if (passwordLengthError) {
    return withCors(request, jsonError(400, passwordLengthError));
  }

  const serviceClient = createServiceClient();

  const { data: teacher, error: fetchError } = await serviceClient
    .from('teachers')
    .select('password_hash')
    .eq('id', teacherId)
    .single();

  if (fetchError || !teacher) {
    return withCors(request, jsonError(500, 'Failed to fetch teacher details'));
  }

  const validOldPassword = await verifyPassword(old_password, teacher.password_hash);
  if (!validOldPassword) {
    return withCors(request, jsonError(403, 'Incorrect old password'));
  }

  const newHash = await hashPassword(new_password);

  const { error: updateError } = await serviceClient
    .from('teachers')
    .update({
      password_hash: newHash,
      is_password_changed: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', teacherId);

  if (updateError) {
    return withCors(request, jsonError(500, 'Failed to update password'));
  }

  await serviceClient.from('audit_log').insert({
    actor_type: 'teacher',
    actor_id: teacherId,
    action: 'teacher.password_change',
    details: {},
  });

  return withCors(
    request,
    json({ success: true, message: 'Password changed successfully' })
  );
});
