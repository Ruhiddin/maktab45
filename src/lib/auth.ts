import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import type { AuthToken, AuthRole } from '../types';

export const MIN_PASSWORD_LENGTH = 6;

const JWT_SECRET = new TextEncoder().encode(
  import.meta.env.JWT_SECRET || 'fallback_development_secret_do_not_use_in_prod_12345'
);

/**
 * Creates a signed JWT token valid for 24 hours.
 */
export async function createToken(payload: { role: AuthRole; teacher_id?: string }): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
  return token;
}

/**
 * Verifies and decodes a JWT token. Returns null if invalid or expired.
 */
export async function verifyToken(token: string): Promise<AuthToken | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as AuthToken;
  } catch (error) {
    return null;
  }
}

/**
 * Middleware helper: Validates request token and role.
 * Expects the token in the Authorization header: `Bearer <token>`
 */
export async function requireRole(request: Request, role: AuthRole): Promise<AuthToken | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  const payload = await verifyToken(token);
  
  if (!payload || payload.role !== role) {
    return null;
  }
  return payload;
}

/**
 * Hashes a plaintext password using bcrypt with cost factor 10.
 */
export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

export function validatePasswordLength(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`;
  }

  return null;
}

/**
 * Timing-safe comparison of plaintext password against a bcrypt hash.
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
