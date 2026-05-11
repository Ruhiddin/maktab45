import { authMiddleware } from '../_shared/auth.ts';
import { handleOptions, withCors } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/publicSettings.ts';
import { json, jsonError } from '../_shared/response.ts';
import { normalizeTeacherSubjects } from '../_shared/teacherSubjects.ts';

function getTeacherIdFromPath(request: Request) {
  const pathname = new URL(request.url).pathname.replace(/\/+$/, '');
  const parts = pathname.split('/');
  const lastPart = parts[parts.length - 1];

  if (!lastPart || lastPart === 'admin-teachers') {
    return null;
  }

  return decodeURIComponent(lastPart);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }

  const { response } = await authMiddleware(request, ['admin']);
  if (response) {
    return withCors(request, response);
  }

  const serviceClient = createServiceClient();

  if (request.method === 'GET') {
    const { data, error } = await serviceClient
      .from('teachers')
      .select('id, full_name, subjects, is_password_changed, is_active, created_at, updated_at')
      .order('full_name');

    if (error) {
      return withCors(request, jsonError(500, error.message));
    }

    return withCors(request, json(data || []));
  }

  if (request.method === 'PUT') {
    const id = getTeacherIdFromPath(request);
    if (!id) {
      return withCors(request, jsonError(400, 'Missing ID'));
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return withCors(request, jsonError(400, 'Invalid body'));
    }

    const { full_name, subjects, is_active } = body;
    const updates: Record<string, unknown> = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (subjects !== undefined) updates.subjects = normalizeTeacherSubjects(subjects);
    if (is_active !== undefined) updates.is_active = is_active;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await serviceClient
      .from('teachers')
      .update(updates)
      .eq('id', id)
      .select('id, full_name, subjects, is_password_changed, is_active, created_at, updated_at')
      .single();

    if (error) {
      return withCors(request, jsonError(500, error.message));
    }

    await serviceClient.from('audit_log').insert({
      actor_type: 'admin',
      action: 'teacher.update',
      target_type: 'teacher',
      target_id: id,
      details: { updates },
    });

    return withCors(request, json(data));
  }

  if (request.method === 'DELETE') {
    const id = getTeacherIdFromPath(request);
    if (!id) {
      return withCors(request, jsonError(400, 'Missing ID'));
    }

    const { error } = await serviceClient
      .from('teachers')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      return withCors(request, jsonError(500, error.message));
    }

    await serviceClient.from('audit_log').insert({
      actor_type: 'admin',
      action: 'teacher.deactivate',
      target_type: 'teacher',
      target_id: id,
      details: {},
    });

    return withCors(request, json({ success: true }));
  }

  return withCors(request, jsonError(405, 'Method not allowed'));
});
