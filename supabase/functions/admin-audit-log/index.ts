import { authMiddleware } from '../_shared/auth.ts';
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

  const { response } = await authMiddleware(request, ['admin']);
  if (response) {
    return withCors(request, response);
  }

  const url = new URL(request.url);
  const teacherId = url.searchParams.get('teacher_id');
  const action = url.searchParams.get('action');
  const fromDate = url.searchParams.get('from_date');
  const toDate = url.searchParams.get('to_date');
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const perPage = parseInt(url.searchParams.get('per_page') || '50', 10);

  const serviceClient = createServiceClient();
  let query = serviceClient
    .from('audit_log')
    .select('*', { count: 'exact' });

  if (teacherId) {
    query = query.eq('actor_id', teacherId);
  }
  if (action) {
    query = query.eq('action', action);
  }
  if (fromDate) {
    query = query.gte('created_at', fromDate);
  }
  if (toDate) {
    query = query.lte('created_at', toDate);
  }

  const start = (page - 1) * perPage;
  query = query.order('created_at', { ascending: false }).range(start, start + perPage - 1);

  const { data, count, error } = await query;
  if (error) {
    return withCors(request, jsonError(500, error.message));
  }

  const teacherActorIds = Array.from(
    new Set(
      (data || [])
        .filter((log: any) => log.actor_type === 'teacher' && log.actor_id)
        .map((log: any) => log.actor_id as string)
    )
  );

  const teacherNameMap = new Map<string, string>();
  if (teacherActorIds.length > 0) {
    const { data: teacherRows, error: teacherError } = await serviceClient
      .from('teachers')
      .select('id, full_name')
      .in('id', teacherActorIds);

    if (teacherError) {
      return withCors(request, jsonError(500, teacherError.message));
    }

    for (const teacher of teacherRows || []) {
      teacherNameMap.set(teacher.id, teacher.full_name);
    }
  }

  const formattedData = (data || []).map((log: any) => ({
    ...log,
    actor_name:
      log.actor_type === 'admin'
        ? 'Admin'
        : (log.actor_id ? teacherNameMap.get(log.actor_id) : null) ?? null,
  }));

  return withCors(request, json({ data: formattedData, total: count || 0 }));
});
