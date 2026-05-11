import { authMiddleware, hashPassword, validatePasswordLength } from '../_shared/auth.ts';
import { handleOptions, withCors } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/publicSettings.ts';
import { json, jsonError } from '../_shared/response.ts';

function normalizeAvailableSections(value: unknown) {
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry).trim())
      .filter(Boolean);
  }

  return undefined;
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
      .from('admin_settings')
      .select('school_name, available_sections, current_academic_year')
      .eq('id', 1)
      .single();

    if (error) {
      return withCors(request, jsonError(500, error.message));
    }

    return withCors(request, json(data));
  }

  if (request.method === 'PUT') {
    const body = await request.json().catch(() => null);
    if (!body) {
      return withCors(request, jsonError(400, 'Invalid body'));
    }

    const { school_name, available_sections, current_academic_year, new_password } = body;

    if (new_password !== undefined && new_password !== null && new_password !== '') {
      const passwordLengthError = validatePasswordLength(String(new_password));
      if (passwordLengthError) {
        return withCors(request, jsonError(400, passwordLengthError));
      }
    }

    const updates: Record<string, unknown> = {};
    if (school_name !== undefined) updates.school_name = school_name;

    const normalizedSections = normalizeAvailableSections(available_sections);
    if (normalizedSections !== undefined) {
      updates.available_sections = normalizedSections;
    }

    if (current_academic_year !== undefined) {
      updates.current_academic_year = current_academic_year;
    }

    if (new_password) {
      updates.admin_password_hash = await hashPassword(String(new_password));
    }

    updates.updated_at = new Date().toISOString();

    const { error } = await serviceClient
      .from('admin_settings')
      .update(updates)
      .eq('id', 1);

    if (error) {
      return withCors(request, jsonError(500, error.message));
    }

    await serviceClient.from('audit_log').insert({
      actor_type: 'admin',
      action: 'settings.update',
      details: {
        updates: { ...updates, admin_password_hash: undefined },
        password_changed: !!new_password,
      },
    });

    return withCors(request, json({ success: true }));
  }

  return withCors(request, jsonError(405, 'Method not allowed'));
});
