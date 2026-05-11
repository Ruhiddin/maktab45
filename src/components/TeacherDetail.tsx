import React, { useId, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import { motion } from 'framer-motion';
import { ArrowLeft, BarChart3, CalendarDays, GraduationCap, Radar, ShieldCheck, Sparkles, Users } from 'lucide-react';
import TeacherBadgePill from './TeacherBadgePill';
import { computeTeacherLeaderboardBadges } from '../lib/teacherRanking';
import { buildLocaleHref, getMessages, type Locale } from '../lib/i18n';
import { formatGradeSection } from '../lib/utils';
import type { TeacherPublicProfile } from '../types';

type Props = {
  locale: Locale;
  profile: TeacherPublicProfile;
  rankPosition: number | null;
  selectedYear?: string | null;
};

const CATEGORY_COLORS = ['#818cf8', '#34d399', '#f59e0b', '#38bdf8'];
const CHART_AXIS_TICK = { fill: '#cbd5e1', fontSize: 12, fontWeight: 500 } as const;
const CHART_AXIS_SUBTLE_TICK = { fill: '#94a3b8', fontSize: 12, fontWeight: 500 } as const;
const CHART_GRID_STROKE = 'rgba(148, 163, 184, 0.18)';
const CHART_LEGEND_STYLE = { color: '#e2e8f0', fontSize: '12px' } as const;

export default function TeacherDetail({ locale, profile, rankPosition, selectedYear = null }: Props) {
  const m = getMessages(locale);
  const badges = useMemo(
    () => computeTeacherLeaderboardBadges({ ranking: profile, profile }),
    [profile]
  );

  const hasActivity = profile.qualification_count > 0;
  const summaryHref = buildLocaleHref('/teachers', locale, selectedYear ? `year=${selectedYear}` : null);

  const valueBalanceData = [
    { name: m.teacherDetail.positive, value: profile.value_balance.positive_count, color: '#22c55e' },
    { name: m.teacherDetail.corrective, value: profile.value_balance.negative_count, color: '#f97316' },
    { name: m.teacherDetail.neutral, value: profile.value_balance.neutral_count, color: '#94a3b8' },
  ].filter((entry) => entry.value > 0);

  const classReachData = profile.class_reach.slice(0, 6);
  const subjectData = profile.subjects_breakdown.slice(0, 6);
  const monthlyData = profile.monthly_activity.map((entry) => ({
    ...entry,
    label: formatMonthLabel(entry.month, locale),
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 space-y-8">
      <a
        href={summaryHref}
        className="inline-flex items-center gap-2 text-indigo-200 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        {m.teacherDetail.back}
      </a>

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[2rem] border border-white/10 bg-slate-900/82 px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.32)] backdrop-blur sm:px-8 sm:py-10"
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-indigo-300">
              {m.teacherDetail.eyebrow}
            </p>
            <h1 className="mt-4 break-words text-3xl font-black text-white md:text-5xl">{profile.full_name}</h1>
            <p className="mt-3 break-words text-sm leading-7 text-slate-300 md:text-base">
              {profile.subjects.length ? profile.subjects.join(', ') : m.teacherDetail.generalSupport}
            </p>
            {selectedYear ? (
              <p className="mt-4 text-sm font-medium text-amber-200">
                {m.teacherDetail.viewingArchive} {selectedYear}.
              </p>
            ) : null}
            {badges.length > 0 ? (
              <div className="mt-6 flex flex-wrap gap-2">
                {badges.map((badge) => (
                  <TeacherBadgePill key={badge} type={badge} />
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid min-w-full gap-4 sm:grid-cols-2 lg:min-w-[340px] lg:max-w-[360px]">
            <StatCard label={m.teacherDetail.publicRank} value={rankPosition ? `#${rankPosition}` : m.teacherDetail.rankUnavailable} tone="indigo" />
            <StatCard label={m.teacherDetail.activityScore} value={profile.activity_score.toFixed(2)} tone="emerald" />
            <StatCard label={m.teacherDetail.qualifications} value={profile.qualification_count} tone="amber" />
            <StatCard label={m.teacherDetail.studentsReached} value={profile.unique_students_count} tone="sky" />
          </div>
        </div>
      </motion.section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={m.teacherDetail.activeDays} value={profile.active_days_count} icon={<CalendarDays className="h-4 w-4" />} />
        <MetricCard label={m.teacherDetail.categoryCoverage} value={m.teacherDetail.categoryCoverageValue.replace('{count}', String(profile.category_coverage_count))} icon={<Radar className="h-4 w-4" />} />
        <MetricCard label={m.teacherDetail.recentActivity} value={profile.recent_activity_count} icon={<Sparkles className="h-4 w-4" />} />
        <MetricCard label={m.teacherDetail.topCategory} value={profile.most_used_category ?? m.teacherDetail.none} icon={<ShieldCheck className="h-4 w-4" />} />
      </section>

      <section className="rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-6 shadow-[0_16px_60px_rgba(15,23,42,0.25)] backdrop-blur">
        <h2 className="text-2xl font-bold text-white">{m.teacherDetail.profileSummary}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
          {m.teacherDetail.profileSummaryHint}
        </p>
      </section>

      {!hasActivity ? (
        <section className="rounded-[1.75rem] border border-dashed border-white/10 bg-slate-900/65 px-8 py-14 text-center shadow-[0_16px_60px_rgba(15,23,42,0.25)]">
          <h2 className="text-2xl font-bold text-white">{m.teacherDetail.noActivityTitle}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300 md:text-base">{m.teacherDetail.noActivityHint}</p>
        </section>
      ) : (
        <>
          <div className="grid gap-8 lg:grid-cols-2">
            <ChartCard
              locale={locale}
              title={m.teacherDetail.categoryBreakdown}
              hint={m.teacherDetail.categoryBreakdownHint}
              icon={<BarChart3 className="h-5 w-5 text-indigo-300" />}
            >
              {profile.categories.length > 0 ? (
                <ResponsiveContainer>
                  <BarChart data={profile.categories}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} vertical={false} />
                    <XAxis dataKey="name" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
                    <YAxis tick={CHART_AXIS_SUBTLE_TICK} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="weighted_score" radius={[10, 10, 0, 0]}>
                      {profile.categories.map((entry, index) => (
                        <Cell key={`${entry.name}-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartLabel label={m.teacherDetail.noChartData} />
              )}
            </ChartCard>

            <ChartCard
              locale={locale}
              title={m.teacherDetail.subjectActivity}
              hint={m.teacherDetail.subjectActivityHint}
              icon={<GraduationCap className="h-5 w-5 text-amber-300" />}
            >
              {subjectData.length > 0 ? (
                <ResponsiveContainer>
                  <BarChart data={subjectData} layout="vertical" margin={{ left: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} horizontal={false} />
                    <XAxis type="number" tick={CHART_AXIS_SUBTLE_TICK} axisLine={false} tickLine={false} />
                    <YAxis
                      dataKey="subject"
                      type="category"
                      width={104}
                      tick={CHART_AXIS_TICK}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill="#f59e0b" radius={[0, 10, 10, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartLabel label={m.teacherDetail.noChartData} />
              )}
            </ChartCard>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            <ChartCard
              locale={locale}
              title={m.teacherDetail.monthlyTrend}
              hint={m.teacherDetail.monthlyTrendHint}
              icon={<CalendarDays className="h-5 w-5 text-emerald-300" />}
            >
              {monthlyData.length > 0 ? (
                <ResponsiveContainer>
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="teacher-monthly-score" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.9} />
                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} vertical={false} />
                    <XAxis dataKey="label" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
                    <YAxis tick={CHART_AXIS_SUBTLE_TICK} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area
                      type="monotone"
                      dataKey="weighted_score"
                      stroke="#818cf8"
                      strokeWidth={3}
                      fill="url(#teacher-monthly-score)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartLabel label={m.teacherDetail.noChartData} />
              )}
            </ChartCard>

            <ChartCard
              locale={locale}
              title={m.teacherDetail.classReach}
              hint={m.teacherDetail.classReachHint}
              icon={<Users className="h-5 w-5 text-sky-300" />}
            >
              {classReachData.length > 0 ? (
                <ResponsiveContainer>
                  <BarChart data={classReachData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} vertical={false} />
                    <XAxis dataKey="class_label" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
                    <YAxis tick={CHART_AXIS_SUBTLE_TICK} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="students_reached" fill="#38bdf8" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartLabel label={m.teacherDetail.noChartData} />
              )}
            </ChartCard>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <ChartCard
              locale={locale}
              title={m.teacherDetail.valueBalance}
              hint={m.teacherDetail.valueBalanceHint}
              icon={<ShieldCheck className="h-5 w-5 text-rose-300" />}
            >
              {valueBalanceData.length > 0 ? (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={valueBalanceData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={62}
                      outerRadius={94}
                      paddingAngle={3}
                    >
                      {valueBalanceData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={CHART_LEGEND_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartLabel label={m.teacherDetail.noChartData} />
              )}
            </ChartCard>

            <section className="rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-6 shadow-[0_16px_60px_rgba(15,23,42,0.25)] backdrop-blur">
              <h2 className="flex items-center gap-2 text-2xl font-bold text-white">
                <Users className="h-5 w-5 text-indigo-300" />
                {m.teacherDetail.topClasses}
              </h2>
              <div className="mt-5 space-y-3">
                {profile.top_supported_classes.length > 0 ? (
                  profile.top_supported_classes.map((entry) => (
                    <div
                      key={`${entry.class_label}-${entry.qualification_count}`}
                      className="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                        <div className="min-w-0">
                          <div className="text-lg font-bold text-white">
                            {formatGradeSection(entry.grade, entry.section)}
                          </div>
                          <p className="mt-1 text-sm text-slate-300">
                            {entry.students_reached} {m.teacherDetail.studentsSupported}
                          </p>
                        </div>
                        <div className="self-start rounded-full bg-indigo-500/15 px-3 py-1 text-sm font-semibold text-indigo-200">
                          {entry.qualification_count} {m.teacherDetail.events}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyChartLabel label={m.teacherDetail.noChartData} />
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: 'indigo' | 'emerald' | 'amber' | 'sky';
}) {
  const tones = {
    indigo: 'from-indigo-500/20 to-violet-500/20 text-indigo-100 border-indigo-400/20',
    emerald: 'from-emerald-500/20 to-teal-500/20 text-emerald-100 border-emerald-400/20',
    amber: 'from-amber-500/20 to-orange-500/20 text-amber-100 border-amber-400/20',
    sky: 'from-sky-500/20 to-cyan-500/20 text-sky-100 border-sky-400/20',
  } as const;

  return (
    <div className={`rounded-[1.5rem] border bg-gradient-to-br px-5 py-5 shadow-[0_16px_60px_rgba(15,23,42,0.22)] ${tones[tone]}`}>
      <div className="text-[11px] uppercase tracking-[0.24em] text-slate-300">{label}</div>
      <div className="mt-3 text-3xl font-black text-white">{value}</div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 px-5 py-5 shadow-[0_16px_60px_rgba(15,23,42,0.25)] backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400">{label}</div>
        <div className="text-slate-400">{icon}</div>
      </div>
      <div className="mt-3 text-2xl font-black text-white">{value}</div>
    </div>
  );
}

function ChartCard({
  locale,
  title,
  hint,
  icon,
  children,
}: {
  locale: Locale;
  title: string;
  hint: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const m = getMessages(locale);
  const titleId = useId();
  const hintId = useId();
  const summaryId = useId();

  return (
    <section
      className="rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-5 shadow-[0_16px_60px_rgba(15,23,42,0.25)] backdrop-blur sm:p-6"
      aria-labelledby={titleId}
      aria-describedby={`${hintId} ${summaryId}`}
    >
      <h2 id={titleId} className="flex items-center gap-2 text-2xl font-bold text-white">
        {icon}
        {title}
      </h2>
      <p id={hintId} className="mt-2 text-sm leading-6 text-slate-300">{hint}</p>
      <p id={summaryId} className="sr-only">{m.teacherDetail.chartSummaryLabel}: {title}. {hint}</p>
      <div className="mt-6 h-[18rem] sm:h-80" role="img" aria-labelledby={titleId} aria-describedby={`${hintId} ${summaryId}`}>
        {children}
      </div>
    </section>
  );
}

function EmptyChartLabel({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-950/35 text-center text-sm font-medium text-slate-400">
      {label}
    </div>
  );
}

function formatMonthLabel(month: string, locale: Locale) {
  const date = new Date(`${month}-01T00:00:00Z`);
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  }).format(date);
}

const tooltipStyle = {
  backgroundColor: 'rgba(15, 23, 42, 0.98)',
  border: '1px solid rgba(129, 140, 248, 0.25)',
  borderRadius: '16px',
  boxShadow: '0 20px 45px rgba(15, 23, 42, 0.35)',
  color: '#fff',
};
