import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatGradeSection(grade: number, section?: string | null): string {
  const normalizedSection = section?.trim();
  if (!normalizedSection) return String(grade);
  return `${grade}-${normalizedSection.toUpperCase()}`;
}

export function buildYearHref(pathname: string, selectedYear?: string | null): string {
  if (!selectedYear) {
    return pathname;
  }

  const params = new URLSearchParams({ year: selectedYear });
  return `${pathname}?${params.toString()}`;
}
