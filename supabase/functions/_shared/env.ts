const DEFAULT_JWT_SECRET = 'fallback_development_secret_do_not_use_in_prod_12345';
const DEFAULT_SCHOOL_NAME = 'School Leaderboard';
const DEFAULT_ACADEMIC_YEAR = '2025-2026';
const DEFAULT_LOCAL_ALLOWED_ORIGINS = [
  'http://localhost:4321',
  'http://127.0.0.1:4321',
];

function readEnv(name: string) {
  return Deno.env.get(name)?.trim() || '';
}

export function getPublicSupabaseUrl() {
  return readEnv('PUBLIC_SUPABASE_URL');
}

export function getSupabaseServiceRoleKey() {
  return readEnv('SUPABASE_SERVICE_ROLE_KEY');
}

export function getAdminPassword() {
  return readEnv('ADMIN_PASSWORD');
}

export function getJwtSecret() {
  return readEnv('JWT_SECRET') || DEFAULT_JWT_SECRET;
}

export function getPublicSchoolNameFallback() {
  return readEnv('PUBLIC_SCHOOL_NAME') || DEFAULT_SCHOOL_NAME;
}

export function getAcademicYearFallback() {
  return DEFAULT_ACADEMIC_YEAR;
}

export function getAllowedOrigins() {
  const raw = readEnv('ALLOWED_ORIGINS');
  if (!raw) return DEFAULT_LOCAL_ALLOWED_ORIGINS;

  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}
