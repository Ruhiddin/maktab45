import { createClient } from 'npm:@supabase/supabase-js@2.57.2';
import { getAcademicYearFallback, getPublicSchoolNameFallback, getPublicSupabaseUrl, getSupabaseServiceRoleKey } from './env.ts';
import type { PublicSettings } from './types.ts';

export function getFallbackPublicSettings(): PublicSettings {
  return {
    school_name: getPublicSchoolNameFallback(),
    current_academic_year: getAcademicYearFallback(),
  };
}

export function createServiceClient() {
  const supabaseUrl = getPublicSupabaseUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

export async function getPublicSettings(): Promise<PublicSettings> {
  const fallback = getFallbackPublicSettings();
  const serviceClient = createServiceClient();

  try {
    const { data, error } = await serviceClient
      .from('admin_settings')
      .select('school_name, current_academic_year')
      .eq('id', 1)
      .single();

    if (error || !data) {
      return fallback;
    }

    return {
      school_name: data.school_name || fallback.school_name,
      current_academic_year: data.current_academic_year || fallback.current_academic_year,
    };
  } catch (error) {
    console.error('Error fetching public settings:', error);
    return fallback;
  }
}
