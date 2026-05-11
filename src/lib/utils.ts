import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

const BASE_URL = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '') || '';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function withBasePath(pathname: string): string {
  if (!pathname) return BASE_URL || '/';
  if (/^(?:[a-z]+:)?\/\//i.test(pathname)) return pathname;

  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
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
