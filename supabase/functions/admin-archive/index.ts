import { authMiddleware } from '../_shared/auth.ts';
import { handleOptions, withCors } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/publicSettings.ts';
import { json, jsonError } from '../_shared/response.ts';

const ARCHIVE_BUCKET = 'archives';

async function promoteGradesFallback(serviceClient: ReturnType<typeof createServiceClient>) {
  for (let grade = 10; grade >= 1; grade -= 1) {
    const { error } = await serviceClient
      .from('students')
      .update({ grade: grade + 1 })
      .eq('grade', grade);

    if (error) {
      throw new Error(error.message);
    }
  }
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

  const currentYear = new Date().getFullYear();
  const serviceClient = createServiceClient();

  try {
    const { data: students, error: studentsError } = await serviceClient
      .from('students')
      .select('*')
      .order('full_name');
    if (studentsError) {
      throw new Error(studentsError.message);
    }

    const { data: qualifications, error: qualificationsError } = await serviceClient
      .from('qualifications')
      .select('*')
      .order('created_at', { ascending: false });
    if (qualificationsError) {
      throw new Error(qualificationsError.message);
    }

    const { data: teachers, error: teachersError } = await serviceClient
      .from('teachers')
      .select('id, full_name, subjects, is_active, created_at, updated_at')
      .order('full_name');
    if (teachersError) {
      throw new Error(teachersError.message);
    }

    const { data: rankings, error: rankingsError } = await serviceClient
      .from('live_ranking')
      .select('*')
      .order('total_score', { ascending: false });
    if (rankingsError) {
      throw new Error(rankingsError.message);
    }

    const { data: teacherRanking, error: teacherRankingError } = await serviceClient
      .from('live_teacher_ranking')
      .select('*')
      .order('activity_score', { ascending: false })
      .order('unique_students_count', { ascending: false })
      .order('category_coverage_count', { ascending: false })
      .order('recent_activity_count', { ascending: false })
      .order('full_name', { ascending: true });
    if (teacherRankingError) {
      throw new Error(teacherRankingError.message);
    }

    const archive = {
      year: currentYear,
      created_at: new Date().toISOString(),
      students: students ?? [],
      teachers: teachers ?? [],
      qualifications: qualifications ?? [],
      rankings: rankings ?? [],
      teacher_ranking: teacherRanking ?? [],
    };

    const archivePath = `${currentYear}/${currentYear}_archive.json`;
    const archivePayload = new TextEncoder().encode(JSON.stringify(archive, null, 2));
    const { error: uploadError } = await serviceClient.storage
      .from(ARCHIVE_BUCKET)
      .upload(archivePath, archivePayload, {
        contentType: 'application/json',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(
        `Failed to write archive snapshot to Supabase Storage bucket "${ARCHIVE_BUCKET}": ${uploadError.message}`
      );
    }

    const { error: wipeError } = await serviceClient
      .from('qualifications')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (wipeError) {
      throw new Error(wipeError.message);
    }

    const { error: promoteError } = await serviceClient.rpc('promote_grades');
    if (promoteError) {
      await promoteGradesFallback(serviceClient);
    }

    await serviceClient.from('audit_log').insert({
      actor_type: 'admin',
      action: 'archive.create',
      details: {
        year: currentYear,
        storage_bucket: ARCHIVE_BUCKET,
        storage_path: archivePath,
      },
    });

    return withCors(
      request,
      json(
        {
          success: true,
          message: `Archive for ${currentYear} created successfully.`,
          archive_bucket: ARCHIVE_BUCKET,
          archive_path: archivePath,
        },
        { status: 201 }
      )
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error during archiving';
    return withCors(request, jsonError(500, message));
  }
});
