import { handleOptions, withCors } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/publicSettings.ts';
import { json, jsonError } from '../_shared/response.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }

  if (request.method !== 'GET') {
    return withCors(request, jsonError(405, 'Method not allowed'));
  }

  const serviceClient = createServiceClient();

  const { data: teachers, error } = await serviceClient
    .from('teachers')
    .select('id, full_name')
    .eq('is_active', true)
    .order('full_name');

  if (error) {
    return withCors(request, jsonError(500, 'Failed to fetch teachers'));
  }

  return withCors(request, json(teachers || []));
});
