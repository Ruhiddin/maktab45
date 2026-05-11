type ApiRouteDefinition = string;

const API_ROUTES = {
  authAdminLogin: '/auth-admin-login',
  authTeacherLogin: '/auth-teacher-login',
  authTeacherChangePassword: '/auth-teacher-change-password',
  authTeachersList: '/auth-teachers-list',
  teacherActivity: '/teacher-activity',
  qualifications: '/qualifications',
  qualificationById: '/qualifications/:id',
  adminStudents: '/admin-students',
  adminStudentById: '/admin-students/:id',
  adminStudentsImport: '/admin-students-import',
  adminTeachers: '/admin-teachers',
  adminTeacherById: '/admin-teachers/:id',
  adminTeacherResetPassword: '/admin-teacher-reset-password/:id',
  adminTeachersImport: '/admin-teachers-import',
  adminSettings: '/admin-settings',
  adminArchive: '/admin-archive',
  adminAuditLog: '/admin-audit-log',
  adminImportParse: '/admin-import-parse',
} satisfies Record<string, ApiRouteDefinition>;

export type ApiRouteKey = keyof typeof API_ROUTES;

type Primitive = string | number | boolean;
type PathParams = Record<string, Primitive | null | undefined>;
type SearchParams = Record<string, Primitive | null | undefined>;

const configuredApiBaseUrl = (import.meta.env.PUBLIC_API_BASE_URL || '').trim().replace(/\/+$/, '');
const PROTECTED_API_ERROR =
  'Protected backend is not configured. Set PUBLIC_API_BASE_URL to your Supabase Edge Functions base URL.';

function applyPathParams(template: string, params?: PathParams) {
  if (!params) return template;

  return template.replace(/:([A-Za-z0-9_]+)/g, (_, key: string) => {
    const value = params[key];
    if (value === undefined || value === null) {
      throw new Error(`Missing path param: ${key}`);
    }
    return encodeURIComponent(String(value));
  });
}

function withSearchParams(path: string, searchParams?: SearchParams) {
  if (!searchParams) return path;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }

  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function getApiBaseUrl() {
  return configuredApiBaseUrl || null;
}

export function hasProtectedApiBaseUrl() {
  return Boolean(configuredApiBaseUrl);
}

export function getProtectedApiConfigError() {
  return PROTECTED_API_ERROR;
}

export function buildApiUrl(
  route: ApiRouteKey,
  options?: {
    pathParams?: PathParams;
    searchParams?: SearchParams;
  }
) {
  if (!configuredApiBaseUrl) {
    throw new Error(PROTECTED_API_ERROR);
  }

  const definition = API_ROUTES[route];
  const rawPath = applyPathParams(definition, options?.pathParams);
  const withQuery = withSearchParams(rawPath, options?.searchParams);

  return `${configuredApiBaseUrl}${withQuery}`;
}
