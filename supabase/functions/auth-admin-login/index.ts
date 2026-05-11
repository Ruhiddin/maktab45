import { createServiceClient } from '../_shared/publicSettings.ts';
import { createToken, hashPassword, validatePasswordLength, verifyPassword } from '../_shared/auth.ts';
import { handleOptions, withCors } from '../_shared/cors.ts';
import { getAdminPassword } from '../_shared/env.ts';
import { isRateLimited } from '../_shared/rateLimit.ts';
import { json, jsonError } from '../_shared/response.ts';

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
  if (isRateLimited({ key: `admin-login:${ip}`, limit: 5, windowMs: 60_000 })) {
    return withCors(
      request,
      jsonError(429, 'Too many login attempts. Please try again in a minute.')
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || !body.password) {
    return withCors(request, jsonError(400, 'Password is required'));
  }

  const { password } = body;
  const serviceClient = createServiceClient();

  const { data: settings, error: fetchError } = await serviceClient
    .from('admin_settings')
    .select('admin_password_hash')
    .eq('id', 1)
    .single();

  if (fetchError) {
    return withCors(request, jsonError(500, 'Failed to fetch admin settings'));
  }

  let valid = false;

  if (!settings.admin_password_hash) {
    const envPassword = getAdminPassword();
    if (!envPassword) {
      return withCors(
        request,
        jsonError(500, 'ADMIN_PASSWORD environment variable is not set for first boot.')
      );
    }

    const passwordLengthError = validatePasswordLength(envPassword);
    if (passwordLengthError) {
      return withCors(
        request,
        jsonError(500, `ADMIN_PASSWORD is invalid: ${passwordLengthError}`)
      );
    }

    if (password === envPassword) {
      valid = true;
      const newHash = await hashPassword(password);
      await serviceClient
        .from('admin_settings')
        .update({ admin_password_hash: newHash, updated_at: new Date().toISOString() })
        .eq('id', 1);
    }
  } else {
    valid = await verifyPassword(password, settings.admin_password_hash);
  }

  if (!valid) {
    return withCors(request, jsonError(401, 'Invalid password'));
  }

  await serviceClient.from('audit_log').insert({
    actor_type: 'admin',
    action: 'admin.login',
    details: { ip },
  });

  const token = await createToken({ role: 'admin' });
  return withCors(request, json({ token }));
});
