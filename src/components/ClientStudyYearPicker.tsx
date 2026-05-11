import React from 'react';
import { buildLocaleHref, getMessages, type Locale } from '../lib/i18n';

type Props = {
  pathname: string;
  locale: Locale;
  currentAcademicYear: string;
  archiveYears: number[];
  selectedYear?: string | null;
};

export default function ClientStudyYearPicker({
  pathname,
  locale,
  currentAcademicYear,
  archiveYears,
  selectedYear = null,
}: Props) {
  const m = getMessages(locale);
  const options = [
    {
      href: buildLocaleHref(pathname, locale),
      label: `${currentAcademicYear} (${m.public.currentYear})`,
      active: !selectedYear,
    },
    ...archiveYears.map((year) => ({
      href: buildLocaleHref(pathname, locale, `year=${year}`),
      label: `${m.public.archiveLabel} ${year}`,
      active: selectedYear === String(year),
    })),
  ];

  return (
    <div className="rounded-2xl border border-gray-200/80 bg-white/75 px-4 py-3 shadow-lg shadow-indigo-100/40 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-black/20">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-500 dark:text-indigo-300">
        {m.public.studyYear}
      </p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{m.public.studyYearHint}</p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {options.map((option) => (
          <a
            key={option.label}
            href={option.href}
            aria-current={option.active ? 'page' : undefined}
            className={[
              'rounded-xl px-3 py-2 text-sm font-medium transition-colors',
              option.active
                ? 'bg-indigo-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-900/70 dark:text-gray-200 dark:hover:bg-slate-800',
            ].join(' ')}
          >
            {option.label}
          </a>
        ))}
      </div>
    </div>
  );
}
