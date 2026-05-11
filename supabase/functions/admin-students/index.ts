import { authMiddleware } from '../_shared/auth.ts';
import { handleOptions, withCors } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/publicSettings.ts';
import { json, jsonError } from '../_shared/response.ts';

function getStudentIdFromPath(request: Request) {
  const pathname = new URL(request.url).pathname.replace(/\/+$/, '');
  const parts = pathname.split('/');
  const lastPart = parts[parts.length - 1];

  if (!lastPart || lastPart === 'admin-students') {
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
      .from('students')
      .select('*')
      .order('full_name');

    if (error) {
      return withCors(request, jsonError(500, error.message));
    }

    return withCors(request, json(data || []));
  }

  if (request.method === 'PUT') {
    const id = getStudentIdFromPath(request);
    if (!id) {
      return withCors(request, jsonError(400, 'Missing ID'));
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return withCors(request, jsonError(400, 'Invalid body'));
    }

    const { full_name, gender, grade, section, is_active } = body;
    const updates: Record<string, unknown> = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (gender !== undefined) updates.gender = gender;
    if (grade !== undefined) updates.grade = grade;
    if (section !== undefined) updates.section = section;
    if (is_active !== undefined) updates.is_active = is_active;

    const { data, error } = await serviceClient
      .from('students')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return withCors(request, jsonError(500, error.message));
    }

    await serviceClient.from('audit_log').insert({
      actor_type: 'admin',
      action: 'student.update',
      target_type: 'student',
      target_id: id,
      details: { updates },
    });

    return withCors(request, json(data));
  }

  if (request.method === 'DELETE') {
    const id = getStudentIdFromPath(request);
    if (!id) {
      return withCors(request, jsonError(400, 'Missing ID'));
    }

    const { error } = await serviceClient
      .from('students')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      return withCors(request, jsonError(500, error.message));
    }

    await serviceClient.from('audit_log').insert({
      actor_type: 'admin',
      action: 'student.deactivate',
      target_type: 'student',
      target_id: id,
      details: {},
    });

    return withCors(request, json({ success: true }));
  }

  return withCors(request, jsonError(405, 'Method not allowed'));
});
