import { SignJWT, jwtVerify } from 'npm:jose@6.1.2';
import bcrypt from 'npm:bcryptjs@3.0.3';
import { getJwtSecret } from './env.ts';
import { jsonError } from './response.ts';
import type { AuthRole, AuthToken } from './types.ts';

export const MIN_PASSWORD_LENGTH = 6;

const JWT_SECRET = new TextEncoder().encode(getJwtSecret());

const ROLE_ROUTE_SCOPES: Record<AuthRole, string[]> = {
  admin: [
    '/admin-',
    '/admin/',
    '/auth-admin-',
    '/functions/v1/admin-',
    '/functions/v1/admin/',
    '/functions/v1/auth-admin-',
  ],
  teacher: [
    '/qualifications',
    '/teacher-',
    '/auth-teacher-',
    '/functions/v1/qualifications',
    '/functions/v1/teacher-',
    '/functions/v1/auth-teacher-',
  ],
};

export async function createToken(payload: { role: AuthRole; teacher_id?: string }): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<AuthToken | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as AuthToken;
  } catch {
    return null;
  }
}

export function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice(7);
}

function isRouteAllowedForRole(pathname: string, role: AuthRole): boolean {
  return ROLE_ROUTE_SCOPES[role].some((scope) => pathname === scope || pathname.startsWith(scope));
}

export async function authMiddleware(
  request: Request,
  allowedRoles: AuthRole[]
): Promise<{ auth: AuthToken | null; response: Response | null }> {
  const token = getBearerToken(request);
  if (!token) {
    return {
      auth: null,
      response: jsonError(401, 'Missing bearer token'),
    };
  }

  const payload = await verifyToken(token);
  if (!payload || !payload.role) {
    return {
      auth: null,
      response: jsonError(401, 'Invalid or expired token'),
    };
  }

  if (payload.role === 'teacher' && !payload.teacher_id) {
    return {
      auth: null,
      response: jsonError(401, 'Invalid teacher token'),
    };
  }

  if (!allowedRoles.includes(payload.role)) {
    return {
      auth: null,
      response: jsonError(403, 'Forbidden'),
    };
  }

  const pathname = new URL(request.url).pathname;
  if (!isRouteAllowedForRole(pathname, payload.role)) {
    return {
      auth: null,
      response: jsonError(403, 'Forbidden'),
    };
  }

  return {
    auth: payload,
    response: null,
  };
}

export function validatePasswordLength(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`;
  }

  return null;
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
