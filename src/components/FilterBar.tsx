import React from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { buildLocaleHref, getMessages, type Locale } from '../lib/i18n';
import type { Category, Gender } from '../types';

type ViewMode = 'list' | 'cards';

type Props = {
  locale: Locale;
  classFilter: string | 'All';
  gradeFilter: number | 'All';
  sectionFilter: string | 'All';
  genderFilter: Gender | 'All';
  categoryFilter: Category;
  search: string;
  view: ViewMode;
  currentAcademicYear?: string;
  archiveYears?: number[];
  selectedYear?: string | null;
  lastRefreshedAt?: string | null;
  refreshing?: boolean;

  availableClasses: Array<{ label: string; grade: number; section: string }>;
  availableSections: string[];
  showMyClass: boolean;
  myClassEnabled: boolean;

  onChangeClass: (value: string | 'All') => void;
  onChangeGrade: (grade: number | 'All') => void;
  onChangeSection: (section: string | 'All') => void;
  onChangeGender: (gender: Gender | 'All') => void;
  onChangeCategory: (category: Category) => void;
  onChangeSearch: (search: string) => void;
  onToggleView: (view: ViewMode) => void;
  onMyClass: () => void;
  onRefresh: () => void;
};

export default function FilterBar({
  locale,
  classFilter,
  gradeFilter,
  sectionFilter,
  genderFilter,
  categoryFilter,
  search,
  view,
  currentAcademicYear,
  archiveYears = [],
  selectedYear = null,
  lastRefreshedAt = null,
  refreshing = false,
  availableClasses,
  availableSections,
  showMyClass,
  myClassEnabled,
  onChangeClass,
  onChangeGrade,
  onChangeSection,
  onChangeGender,
  onChangeCategory,
  onChangeSearch,
  onToggleView,
  onMyClass,
  onRefresh,
}: Props) {
  const m = getMessages(locale);
  const showSection = gradeFilter !== 'All' && availableSections.length > 0;
  const yearOptions = currentAcademicYear
    ? [
        { label: `${currentAcademicYear}`, year: null as string | null },
        ...archiveYears.map((year) => ({ label: `${m.public.archiveLabel} ${year}`, year: String(year) })),
      ]
    : [];
  const localeMap = { uz: 'uz-UZ', en: 'en-US', ru: 'ru-RU' } as const;
  const formattedRefreshTime = lastRefreshedAt
    ? new Date(lastRefreshedAt).toLocaleString(localeMap[locale], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : m.public.neverRefreshed;

  const navigateToYear = (year: string | null) => {
    if (typeof window === 'undefined') {
      return;
    }

    const pathname = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    if (year) params.set('year', year);
    else params.delete('year');
    window.location.href = buildLocaleHref(pathname, locale, params);
  };

  return (
    <div
      className="sticky top-4 eboard:top-1 z-30 p-4 eboard:p-2 rounded-2xl bg-white/30 dark:bg-black/30 backdrop-blur-md border border-white/20 shadow-lg flex flex-wrap gap-3 eboard:gap-1.5 items-center"
      role="region"
      aria-label={m.public.filters}
    >
      <div className="flex items-center gap-3 eboard:gap-1.5 mr-auto flex-wrap">
        <h2 className="text-lg eboard:text-[0.9rem] font-bold text-gray-800 dark:text-gray-100">{m.public.filters}</h2>
        {showMyClass && (
          <button
            type="button"
            onClick={onMyClass}
            disabled={!myClassEnabled}
            title={myClassEnabled ? m.public.myClassHint : m.public.myClassDisabled}
            className={cn(
              'px-3 py-1 eboard:px-2 eboard:py-[0.2rem] rounded-full text-xs eboard:text-[0.62rem] font-semibold border transition-colors',
              myClassEnabled
                ? 'bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-200 dark:border-indigo-900/60 dark:hover:bg-indigo-950/70'
                : 'bg-gray-100 text-gray-400 border-gray-200 dark:bg-gray-900/40 dark:text-gray-500 dark:border-gray-800 cursor-not-allowed'
            )}
          >
            {m.public.myClass}
          </button>
        )}
        {yearOptions.length > 0 && (
          <div className="flex items-center gap-1 rounded-full border border-gray-200/80 bg-white/55 p-1 eboard:p-[0.2rem] shadow-sm dark:border-white/10 dark:bg-black/25">
            {yearOptions.map((option) => {
              const isActive = (selectedYear ?? null) === option.year;
              return (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => navigateToYear(option.year)}
                  aria-pressed={isActive}
                  className={cn(
                    'rounded-full px-3 py-1.5 eboard:px-2 eboard:py-[0.45rem] text-xs eboard:text-[0.62rem] font-semibold transition-colors whitespace-nowrap',
                    isActive
                      ? 'bg-indigo-500 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-white/70 dark:text-gray-300 dark:hover:bg-white/10'
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        )}
        <div className="flex items-center gap-2 eboard:gap-1 rounded-2xl border border-gray-200/80 bg-white/55 px-3 py-2 eboard:px-2 eboard:py-1 text-xs eboard:text-[0.62rem] shadow-sm dark:border-white/10 dark:bg-black/25">
          <div className="min-w-0">
            <p className="font-semibold text-gray-700 dark:text-gray-200">{m.public.lastRefresh}</p>
            <p className="truncate text-gray-500 dark:text-gray-400">{formattedRefreshTime}</p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-3 py-1.5 eboard:px-2 eboard:py-[0.45rem] font-semibold transition-colors',
              refreshing
                ? 'cursor-wait bg-indigo-100 text-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-300'
                : 'bg-indigo-500 text-white hover:bg-indigo-600 dark:hover:bg-indigo-400'
            )}
            aria-label={refreshing ? m.public.refreshing : m.public.refreshNow}
            title={refreshing ? m.public.refreshing : m.public.refreshNow}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
            <span>{refreshing ? m.public.refreshing : m.public.refreshNow}</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 eboard:gap-1 w-full">
        <select
          aria-label={`${m.public.gradeSingle} ${m.public.sectionSingle}`}
          className="p-2 eboard:px-2.5 eboard:py-1 rounded-lg bg-white/50 dark:bg-black/50 border border-gray-200 dark:border-gray-700 outline-none flex-1 sm:flex-none text-sm eboard:text-[0.72rem] text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-indigo-400/60"
          value={classFilter}
          onChange={(e) => onChangeClass(e.target.value as string | 'All')}
        >
          <option value="All">{`${m.public.allGrades} / ${m.public.allSections}`}</option>
          {availableClasses.map((entry) => (
            <option key={`${entry.grade}::${entry.section}`} value={`${entry.grade}::${entry.section}`}>
              {entry.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by grade"
          className="p-2 eboard:px-2.5 eboard:py-1 rounded-lg bg-white/50 dark:bg-black/50 border border-gray-200 dark:border-gray-700 outline-none flex-1 sm:flex-none text-sm eboard:text-[0.72rem] text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-indigo-400/60"
          value={gradeFilter}
          onChange={(e) => onChangeGrade(e.target.value === 'All' ? 'All' : Number(e.target.value))}
        >
          <option value="All">{m.public.allGrades}</option>
          {[...Array(11)].map((_, i) => (
            <option key={i + 1} value={i + 1}>{`${m.public.gradeSingle} ${i + 1}`}</option>
          ))}
        </select>

        {showSection && (
          <select
            aria-label="Filter by section"
            className="p-2 eboard:px-2.5 eboard:py-1 rounded-lg bg-white/50 dark:bg-black/50 border border-gray-200 dark:border-gray-700 outline-none flex-1 sm:flex-none text-sm eboard:text-[0.72rem] text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-indigo-400/60"
            value={sectionFilter}
            onChange={(e) => onChangeSection(e.target.value as string)}
          >
            <option value="All">{m.public.allSections}</option>
            {availableSections.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}

        <select
          aria-label="Filter by gender"
          className="p-2 eboard:px-2.5 eboard:py-1 rounded-lg bg-white/50 dark:bg-black/50 border border-gray-200 dark:border-gray-700 outline-none flex-1 sm:flex-none text-sm eboard:text-[0.72rem] text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-indigo-400/60"
          value={genderFilter}
          onChange={(e) => onChangeGender(e.target.value as Gender | 'All')}
        >
          <option value="All">{m.public.allGenders}</option>
          <option value="male">{m.public.male}</option>
          <option value="female">{m.public.female}</option>
        </select>

        <select
          aria-label="Filter by category"
          className="p-2 eboard:px-2.5 eboard:py-1 rounded-lg bg-white/50 dark:bg-black/50 border border-gray-200 dark:border-gray-700 outline-none flex-1 sm:flex-none text-sm eboard:text-[0.72rem] text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-indigo-400/60"
          value={categoryFilter}
          onChange={(e) => onChangeCategory(e.target.value as Category)}
        >
          <option value="All">{m.public.allCategories}</option>
          <option value="Academic">{m.public.academic}</option>
          <option value="Behavior">{m.public.behavior}</option>
          <option value="Extracurricular">{m.public.extracurricular}</option>
          <option value="Attendance">{m.public.attendance}</option>
        </select>

        <input
          aria-label="Search students"
          value={search}
          onChange={(e) => onChangeSearch(e.target.value)}
          placeholder={m.public.searchStudent}
          className="p-2 eboard:px-2.5 eboard:py-1 rounded-lg bg-white/50 dark:bg-black/50 border border-gray-200 dark:border-gray-700 outline-none flex-[2] eboard:flex-[1] text-sm eboard:text-[0.72rem] min-w-[180px] eboard:min-w-[140px] text-gray-800 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-400/60"
        />

        <div className="flex items-center gap-1 ml-auto bg-white/40 dark:bg-black/40 border border-gray-200 dark:border-gray-700 rounded-lg p-1 eboard:p-[0.2rem]">
          <button
            type="button"
            aria-pressed={view === 'list'}
            onClick={() => onToggleView('list')}
            className={cn(
              'px-3 py-1 eboard:px-2 eboard:py-[0.35rem] eboard:text-[0.72rem] rounded-md text-sm font-semibold transition-colors',
              view === 'list'
                ? 'bg-indigo-500 text-white shadow-sm'
                : 'text-gray-700 dark:text-gray-200 hover:bg-white/50 dark:hover:bg-black/30'
            )}
          >
            {m.public.list}
          </button>
          <button
            type="button"
            aria-pressed={view === 'cards'}
            onClick={() => onToggleView('cards')}
            className={cn(
              'px-3 py-1 eboard:px-2 eboard:py-[0.35rem] eboard:text-[0.72rem] rounded-md text-sm font-semibold transition-colors',
              view === 'cards'
                ? 'bg-indigo-500 text-white shadow-sm'
                : 'text-gray-700 dark:text-gray-200 hover:bg-white/50 dark:hover:bg-black/30'
            )}
          >
            {m.public.cards}
          </button>
        </div>
      </div>
    </div>
  );
}
