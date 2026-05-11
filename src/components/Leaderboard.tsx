import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatGradeSection } from '../lib/utils';
import { computeBadges } from '../lib/badges';
import { getMessages, type Locale } from '../lib/i18n';
import { fetchStudentHoverData } from '../lib/publicData';
import BadgePill from './BadgePill';
import RankDeltaChip from './RankDeltaChip';
import FilterBar from './FilterBar';
import Podium from './Podium';
import StudentRow from './StudentRow';
import StudentCard from './StudentCard';
import HoverPreviewCard from './HoverPreviewCard';
import type { StudentRank, Gender, Category } from '../types';

interface LeaderboardProps {
  initialData: StudentRank[];
  locale: Locale;
  selectedYear?: string | null;
  enableHover?: boolean;
  currentAcademicYear?: string;
  archiveYears?: number[];
}

export default function Leaderboard({
  initialData,
  locale,
  selectedYear = null,
  enableHover = true,
  currentAcademicYear,
  archiveYears = [],
}: LeaderboardProps) {
  const m = getMessages(locale);
  const [gradeFilter, setGradeFilter] = useState<number | 'All'>('All');
  const [sectionFilter, setSectionFilter] = useState<string | 'All'>('All');
  const [genderFilter, setGenderFilter] = useState<Gender | 'All'>('All');
  const [categoryFilter, setCategoryFilter] = useState<Category>('All');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [view, setView] = useState<'list' | 'cards'>('list');
  const [hasTeacherSession, setHasTeacherSession] = useState(false);
  const [myClassEnabled, setMyClassEnabled] = useState(false);
  const [flashMap, setFlashMap] = useState<Record<string, 'up' | 'down' | null>>({});
  const prevRankRef = React.useRef<Map<string, number>>(new Map());

  const hoverTimerRef = React.useRef<number | null>(null);
  const [hover, setHover] = useState<{ id: string; name: string; rect: DOMRect } | null>(null);
  const [hoverLoading, setHoverLoading] = useState(false);
  const [hoverData, setHoverData] = useState<any | null>(null);
  const [badgeMap, setBadgeMap] = useState<Record<string, string[]>>({});
  const [badgesLoading, setBadgesLoading] = useState(false);
  const hoverCacheRef = React.useRef<Map<string, any>>(new Map());
  const gradePillClass = (grade: number) => {
    const palette = [
      'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900/60',
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60',
      'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200 border-amber-200 dark:border-amber-900/60',
      'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-900/60',
      'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200 dark:border-sky-900/60',
      'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border-violet-200 dark:border-violet-900/60',
    ];
    return palette[(Math.max(1, grade) - 1) % palette.length];
  };
  
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    try {
      const token = localStorage.getItem('teacher_token');
      setHasTeacherSession(Boolean(token));
      const g = localStorage.getItem('teacher_my_class_grade');
      setMyClassEnabled(Boolean(token && g));
    } catch {
      setHasTeacherSession(false);
      setMyClassEnabled(false);
    }
  }, []);

  const availableSections = useMemo(() => {
    if (gradeFilter === 'All') return [];
    const set = new Set<string>();
    for (const s of initialData) {
      if (s.grade !== gradeFilter) continue;
      const sec = s.section?.trim();
      if (sec) set.add(sec.toUpperCase());
    }
    return [...set].sort();
  }, [initialData, gradeFilter]);

  const filteredData = useMemo(() => {
    let data = [...initialData];
    if (gradeFilter !== 'All') data = data.filter(s => s.grade === gradeFilter);
    if (gradeFilter !== 'All' && sectionFilter !== 'All') {
      data = data.filter(s => (s.section ?? '').toUpperCase() === sectionFilter.toUpperCase());
    }
    if (genderFilter !== 'All') data = data.filter(s => s.gender === genderFilter);
    if (debouncedSearch.length > 0) {
      const q = debouncedSearch.toLowerCase();
      data = data.filter(s => s.name.toLowerCase().includes(q));
    }

    // Sort descending based on selected category
    data.sort((a, b) => {
      if (categoryFilter === 'All') return b.total_score - a.total_score;
      if (categoryFilter === 'Academic') return b.academic_score - a.academic_score;
      if (categoryFilter === 'Behavior') return b.behavior_score - a.behavior_score;
      if (categoryFilter === 'Extracurricular') return b.extracurricular_score - a.extracurricular_score;
      if (categoryFilter === 'Attendance') return b.attendance_score - a.attendance_score;
      return 0;
    });
    return data;
  }, [initialData, gradeFilter, sectionFilter, genderFilter, categoryFilter, debouncedSearch]);
  const deferredFilteredData = useDeferredValue(filteredData);
  const isFilterSettling = deferredFilteredData !== filteredData;

  const top3 = deferredFilteredData.slice(0, 3);
  const rest = deferredFilteredData.slice(3);
  const hasNoActiveStudents = initialData.length === 0;
  const hasNoFilteredStudents = deferredFilteredData.length === 0;

  const classStats = useMemo(() => {
    const map = new Map<string, { students: StudentRank[]; topScore: number }>();
    for (const s of deferredFilteredData) {
      const key = `${s.grade}::${s.section ?? ''}`;
      const existing = map.get(key);
      if (existing) {
        existing.students.push(s);
        existing.topScore = Math.max(existing.topScore, s.total_score);
      } else {
        map.set(key, { students: [s], topScore: s.total_score });
      }
    }
    return map;
  }, [deferredFilteredData]);

  useEffect(() => {
    if (deferredFilteredData.length === 0) {
      setBadgeMap({});
      setBadgesLoading(false);
      return;
    }

    setBadgesLoading(true);
    const timer = window.setTimeout(() => {
      const nextBadgeMap: Record<string, string[]> = {};
      for (const student of deferredFilteredData) {
        const classKey = `${student.grade}::${student.section ?? ''}`;
        const stats = classStats.get(classKey);
        nextBadgeMap[student.student_id] = computeBadges(student, {
          allStudentsInClass: stats?.students ?? [],
          topScoreInClass: stats?.topScore ?? null,
        });
      }
      setBadgeMap(nextBadgeMap);
      setBadgesLoading(false);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [deferredFilteredData, classStats]);

  // Rank change flash (relative to previous render of the same filtered list)
  useEffect(() => {
    const next = new Map<string, number>();
    deferredFilteredData.forEach((s, i) => next.set(s.student_id, i + 1));

    const prev = prevRankRef.current;
    const flashes: Record<string, 'up' | 'down' | null> = {};
    for (const [id, nowRank] of next.entries()) {
      const oldRank = prev.get(id);
      if (!oldRank) continue;
      if (nowRank < oldRank) flashes[id] = 'up';
      else if (nowRank > oldRank) flashes[id] = 'down';
    }

    if (Object.keys(flashes).length > 0) {
      setFlashMap(flashes);
      window.setTimeout(() => setFlashMap({}), 800);
    }

    prevRankRef.current = next;
  }, [deferredFilteredData]);

  const placeHoverCard = (rect: DOMRect) => {
    const gap = 12;
    const w = 360;
    const h = 230;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = Math.min(vw - w - 12, rect.right + gap);
    if (left < 12) left = 12;
    let top = Math.min(vh - h - 12, rect.top);
    if (top < 12) top = 12;
    return { left, top };
  };

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-8">
      <FilterBar
        locale={locale}
        gradeFilter={gradeFilter}
        sectionFilter={sectionFilter}
        genderFilter={genderFilter}
        categoryFilter={categoryFilter}
        search={search}
        view={view}
        currentAcademicYear={currentAcademicYear}
        archiveYears={archiveYears}
        selectedYear={selectedYear}
        availableSections={availableSections}
        showMyClass={hasTeacherSession}
        myClassEnabled={myClassEnabled}
        onChangeGrade={(g) => {
          setGradeFilter(g);
          setSectionFilter('All');
        }}
        onChangeSection={(s) => setSectionFilter(s)}
        onChangeGender={setGenderFilter}
        onChangeCategory={setCategoryFilter}
        onChangeSearch={setSearch}
        onToggleView={setView}
          onMyClass={() => {
          try {
            const g = localStorage.getItem('teacher_my_class_grade');
            const s = localStorage.getItem('teacher_my_class_section');
            if (!g) return;
            setGradeFilter(Number(g));
            setSectionFilter(s && s.trim().length > 0 ? s.trim().toUpperCase() : 'All');
          } catch {
            // ignore
          }
        }}
      />

      {hasNoActiveStudents ? (
        <div className="rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 bg-white/50 dark:bg-black/40 px-6 py-14 text-center shadow-lg">
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{m.public.noActiveStudents}</p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{m.public.noActiveStudentsHint}</p>
        </div>
      ) : hasNoFilteredStudents ? (
        <div className="rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 bg-white/50 dark:bg-black/40 px-6 py-14 text-center shadow-lg">
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{m.public.noFilteredStudents}</p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{m.public.noFilteredStudentsHint}</p>
        </div>
      ) : (
        <>
      {/* Podium */}
      <Podium top3={top3} category={categoryFilter} selectedYear={selectedYear} />

      {/* List / Cards */}
      {isFilterSettling || badgesLoading ? (
        view === 'list' ? (
          <LeaderboardListSkeleton />
        ) : (
          <LeaderboardCardSkeleton />
        )
      ) : view === 'list' ? (
      <div className="bg-white/50 dark:bg-black/50 backdrop-blur-sm rounded-2xl p-2 sm:p-4 shadow-xl border border-gray-100 dark:border-gray-800 overflow-x-auto">
        <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-3 text-sm font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800 min-w-0">
          <div className="col-span-1 text-center">Rank</div>
          <div className="col-span-6">Student</div>
          <div className="col-span-2 text-center">Grade</div>
          <div className="col-span-2 text-center">Score</div>
          <div className="col-span-1 text-center">Trend</div>
        </div>
        
        <div className="flex flex-col gap-2 mt-4 relative">
          <AnimatePresence>
            {rest.map((student, index) => {
              const actualRank = index + 4; // since top 3 are extracted
              return (
                <StudentRow
                  key={student.student_id}
                  student={student}
                  actualRank={actualRank}
                  categoryFilter={categoryFilter}
                  gradePillClass={gradePillClass}
                  badges={badgeMap[student.student_id] ?? []}
                  searchQuery={debouncedSearch}
                  flash={flashMap[student.student_id] ?? null}
                  selectedYear={selectedYear}
                  onHoverAnchor={(id, name, rect) => {
                    if (!enableHover) {
                      return;
                    }
                    if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
                    hoverTimerRef.current = window.setTimeout(async () => {
                      setHover({ id, name, rect });

                      const cached = hoverCacheRef.current.get(id);
                      if (cached) {
                        setHoverData(cached);
                        setHoverLoading(false);
                        return;
                      }

                      setHoverLoading(true);
                      setHoverData(null);
                      try {
                        const json = await fetchStudentHoverData(id);
                        hoverCacheRef.current.set(id, json);
                        setHoverData(json);
                      } catch {
                        // ignore
                      } finally {
                        setHoverLoading(false);
                      }
                    }, 500) as unknown as number;
                  }}
                  onHoverLeave={() => {
                    if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
                    hoverTimerRef.current = null;
                    setHover(null);
                    setHoverLoading(false);
                    setHoverData(null);
                  }}
                />
              );
            })}
          </AnimatePresence>
          {rest.length === 0 && filteredData.length <= 3 && (
            <div className="text-center py-8 text-gray-500">No more students found.</div>
          )}
        </div>
      </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {deferredFilteredData.map((student, index) => {
            const actualRank = index + 1;
            return (
              <StudentCard
                key={student.student_id}
                student={student}
                rank={actualRank}
                gradePillClass={gradePillClass}
                badges={badgeMap[student.student_id] ?? []}
                selectedYear={selectedYear}
              />
            );
          })}
          {deferredFilteredData.length === 0 && (
            <div className="col-span-full text-center py-10 text-gray-500">No students match these filters.</div>
          )}
        </div>
      )}
        </>
      )}

      {enableHover && hover && (
        <HoverPreviewCard
          studentName={hover.name}
          loading={hoverLoading}
          data={hoverData}
          style={placeHoverCard(hover.rect)}
        />
      )}
    </div>
  );
}

function LeaderboardListSkeleton() {
  return (
    <div className="bg-white/50 dark:bg-black/50 backdrop-blur-sm rounded-2xl p-2 sm:p-4 shadow-xl border border-gray-100 dark:border-gray-800 overflow-x-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Calculating badges...</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Preparing leaderboard highlights for the current filters.</p>
        </div>
        <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
      <div className="space-y-3 mt-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center rounded-2xl border border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/60 px-4 py-4"
          >
            <div className="hidden sm:block sm:col-span-1 h-5 w-10 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <div className="sm:col-span-6 space-y-2">
              <div className="h-4 w-40 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
              <div className="flex gap-2">
                <div className="h-5 w-16 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
                <div className="h-5 w-16 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
              </div>
            </div>
            <div className="hidden sm:block sm:col-span-2 h-6 w-20 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
            <div className="hidden sm:block sm:col-span-2 h-5 w-14 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <div className="hidden sm:block sm:col-span-1 h-5 w-10 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

function LeaderboardCardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-black/50 backdrop-blur-sm px-4 py-3 shadow-xl flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Calculating badges...</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Preparing student highlights for the current view.</p>
        </div>
        <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white/70 dark:bg-gray-900/60 p-4 shadow-lg space-y-3"
          >
            <div className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
            <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <div className="h-5 w-20 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
            <div className="flex gap-2">
              <div className="h-5 w-14 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
              <div className="h-5 w-14 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
