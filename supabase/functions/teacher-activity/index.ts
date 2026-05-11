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

  const { auth, response } = await authMiddleware(request, ['teacher']);
  if (response) {
    return withCors(request, response);
  }

  const teacherId = auth?.teacher_id;
  if (!teacherId) {
    return withCors(request, jsonError(401, 'Invalid teacher token'));
  }

  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from('qualifications')
    .select(`
      id,
      category,
      subject,
      value,
      teacher_note,
      created_at,
      students (
        full_name
      )
    `)
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return withCors(request, jsonError(500, error.message));
  }

  const formattedData = (data || []).map((qualification: any) => ({
    id: qualification.id,
    student_name: qualification.students?.full_name || 'Unknown Student',
    category: qualification.category,
    subject: qualification.subject,
    value: qualification.value,
    teacher_note: qualification.teacher_note,
    created_at: qualification.created_at,
    undoExpiry: new Date(qualification.created_at).getTime() + 60_000,
  }));

  return withCors(request, json(formattedData));
});
