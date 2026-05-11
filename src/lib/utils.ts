import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

const BASE_URL = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '') || '';

function stripBasePrefix(pathname: string) {
  if (!BASE_URL || BASE_URL === '/') return pathname;
  if (pathname === BASE_URL) return '/';
  if (pathname.startsWith(`${BASE_URL}/`)) {
    return pathname.slice(BASE_URL.length) || '/';
  }
  return pathname;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function withBasePath(pathname: string): string {
  if (!pathname) return BASE_URL || '/';
  if (/^(?:[a-z]+:)?\/\//i.test(pathname)) return pathname;

  const normalizedPath = stripBasePrefix(pathname.startsWith('/') ? pathname : `/${pathname}`);
  if (!BASE_URL) return normalizedPath;
  if (normalizedPath === '/') return `${BASE_URL}/`;
  return `${BASE_URL}${normalizedPath}`;
}

export function formatGradeSection(grade: number, section?: string | null): string {
  const normalizedSection = section?.trim();
  if (!normalizedSection) return String(grade);
  return `${grade}-${normalizedSection.toUpperCase()}`;
}

export function buildYearHref(pathname: string, selectedYear?: string | null): string {
  const basePath = withBasePath(pathname);
  if (!selectedYear) {
    return basePath;
  }

  const params = new URLSearchParams({ year: selectedYear });
  return `${basePath}?${params.toString()}`;
}

export function buildStudentHref(studentId: string, selectedYear?: string | null): string {
  const params = new URLSearchParams({ id: studentId });
  if (selectedYear) {
    params.set('year', selectedYear);
  }
  return `${withBasePath('/student')}?${params.toString()}`;
}
