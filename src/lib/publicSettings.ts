import { createClient } from '@supabase/supabase-js';
import { isPlaceholderMode, MOCK_ADMIN_SETTINGS } from './mockData';

export interface PublicSettings {
  school_name: string;
  current_academic_year: string;
}

const DEFAULT_SCHOOL_NAME = 'School Leaderboard';
const DEFAULT_ACADEMIC_YEAR = '2025-2026';

export function getFallbackPublicSettings(): PublicSettings {
  return {
    school_name: import.meta.env.PUBLIC_SCHOOL_NAME || DEFAULT_SCHOOL_NAME,
    current_academic_year: DEFAULT_ACADEMIC_YEAR,
  };
}

export async function getPublicSettings(): Promise<PublicSettings> {
  if (isPlaceholderMode()) {
    return {
      school_name: MOCK_ADMIN_SETTINGS.school_name || getFallbackPublicSettings().school_name,
      current_academic_year:
        MOCK_ADMIN_SETTINGS.current_academic_year || getFallbackPublicSettings().current_academic_year,
    };
  }

  const fallback = getFallbackPublicSettings();
  const serviceClient = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY
  );

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
