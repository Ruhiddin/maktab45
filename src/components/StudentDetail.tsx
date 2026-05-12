import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
  BarChart, Bar, Cell
} from 'recharts';
import { ArrowLeft, Star, TrendingUp, TrendingDown, Minus, Zap, ChevronDown, ChevronUp, BookOpen, BarChart3, Activity } from 'lucide-react';
import { buildYearHref, formatGradeSection } from '../lib/utils';
import { computeBadges } from '../lib/badges';
import { getMessages, type Locale } from '../lib/i18n';
import { fetchPublicTeacherName } from '../lib/publicData';
import BadgePill from './BadgePill';
import type { StudentDetail as StudentDetailType, Qualification, StudentRank } from '../types';

interface Props {
  locale: Locale;
  student: StudentDetailType;
  qualifications: Qualification[];
  ranking: StudentRank | null;
  classmates: StudentRank[];
  selectedYear?: string | null;
  isArchiveView?: boolean;
}

type Period = '7d' | '30d' | 'all';

export default function StudentDetail({ locale, student, qualifications, ranking, classmates, selectedYear = null, isArchiveView = false }: Props) {
  const m = getMessages(locale);
  const [period, setPeriod] = useState<Period>('30d');
  const [teacherCache, setTeacherCache] = useState<Record<string, string>>({});
  const [activityPage, setActivityPage] = useState(1);
  const ACTIVITY_PAGE_SIZE = 10;

  // Fetch teacher names for qualifications
  const fetchTeacherName = async (teacherId: string | null) => {
    if (!teacherId || teacherCache[teacherId]) return;
    try {
      const data = await fetchPublicTeacherName(teacherId);
      if (data) {
        setTeacherCache(prev => ({ ...prev, [teacherId]: data.full_name }));
      }
    } catch (err) {
      console.error('Failed to fetch teacher:', err);
    }
  };

  // Fetch all teacher names
  useEffect(() => {
    const uniqueTeacherIds = [...new Set(qualifications
      .filter(q => q.teacher_id)
      .map(q => q.teacher_id) as string[])];

    uniqueTeacherIds.forEach(id => {
      if (!teacherCache[id]) {
        fetchTeacherName(id);
      }
    });
  }, [qualifications, teacherCache]);

  // Calculate ranking context
  const rankingContext = useMemo(() => {
    if (!ranking) return null;

    // Find rank in class (grade + section)
    const classmates_sorted = classmates
      .filter(s => s.grade === student.grade && s.section === student.section)
      .sort((a, b) => b.total_score - a.total_score);

    const rank = classmates_sorted.findIndex(s => s.student_id === student.id) + 1;
    const totalInClass = classmates_sorted.length;

    return { rank, totalInClass };
  }, [ranking, student, classmates]);
  const radarData = useMemo(() => {
    const categories = ['Academic', 'Behavior', 'Extracurricular', 'Attendance'] as const;
    return categories.map(cat => {
      const total = qualifications
        .filter(q => q.category === cat)
        .reduce((acc, q) => acc + q.value, 0);
      return {
        category: cat,
        score: Math.max(total, 0), // floor at 0 for visual clarity
        fullMark: 20,
      };
    });
  }, [qualifications]);

  const subjectRadarData = useMemo(() => {
    const subjectMap = new Map<string, { score: number; count: number }>();

    for (const qualification of qualifications) {
      const subjectName = qualification.subject?.trim() || (qualification.category === 'Academic' ? 'General' : null);
      if (!subjectName) continue;

      const entry = subjectMap.get(subjectName) || { score: 0, count: 0 };
      entry.score += qualification.value;
      entry.count += 1;
      subjectMap.set(subjectName, entry);
    }

    return [...subjectMap.entries()]
      .map(([subjectName, entry]) => ({
        subject: subjectName,
        score: Math.max(entry.score, 0),
        fullMark: 15,
        updates: entry.count,
      }))
      .sort((a, b) => b.score - a.score || b.updates - a.updates || a.subject.localeCompare(b.subject))
      .slice(0, 6);
  }, [qualifications]);

  const categoryBalanceData = useMemo(() => {
    const categories = ['Academic', 'Behavior', 'Extracurricular', 'Attendance'] as const;

    return categories.map((category) => {
      const categoryQualifications = qualifications.filter((qualification) => qualification.category === category);
      const positive = categoryQualifications
        .filter((qualification) => qualification.value > 0)
        .reduce((sum, qualification) => sum + qualification.value, 0);
      const negative = categoryQualifications
        .filter((qualification) => qualification.value < 0)
        .reduce((sum, qualification) => sum + Math.abs(qualification.value), 0);

      return {
        category,
        net: positive - negative,
        positive,
        negative,
      };
    });
  }, [qualifications]);

  const monthlyMomentumData = useMemo(() => {
    const monthMap = new Map<string, { label: string; total: number; positive: number; negative: number }>();

    for (const qualification of qualifications) {
      const date = new Date(qualification.created_at);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      const label = date.toLocaleDateString(locale, { month: 'short', year: '2-digit' });
      const entry = monthMap.get(monthKey) || { label, total: 0, positive: 0, negative: 0 };
      entry.total += qualification.value;
      if (qualification.value > 0) {
        entry.positive += qualification.value;
      } else if (qualification.value < 0) {
        entry.negative += Math.abs(qualification.value);
      }
      monthMap.set(monthKey, entry);
    }

    return [...monthMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([, entry]) => entry);
  }, [qualifications]);

  // --- Progress Line Data ---
  const progressData = useMemo(() => {
    const now = new Date();
    let cutoff = new Date(0); // 'all'
    if (period === '7d') {
      cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 7);
    } else if (period === '30d') {
      cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 30);
    }

    const filtered = qualifications
      .filter(q => new Date(q.created_at) >= cutoff)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    // Accumulate score over time
    let cumulative = 0;
    const points: { date: string; score: number; label: string }[] = [];

    // Group by day
    const dayMap = new Map<string, number>();
    for (const q of filtered) {
      const day = new Date(q.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      dayMap.set(day, (dayMap.get(day) || 0) + q.value);
    }

    // Get baseline from qualifications before cutoff
    const priorQuals = qualifications.filter(q => new Date(q.created_at) < cutoff);
    cumulative = priorQuals.reduce((acc, q) => acc + q.value, 0);

    for (const [day, delta] of dayMap) {
      cumulative += delta;
      points.push({ date: day, score: cumulative, label: `${day}: ${cumulative}` });
    }

    return points;
  }, [qualifications, period]);

  // --- Milestones (updates of +3 or higher) ---
  const milestones = useMemo(() => {
    return qualifications
      .filter(q => q.value >= 3)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);
  }, [qualifications]);

  const totalScore = ranking?.total_score ?? qualifications.reduce((acc, q) => acc + q.value, 0);
  const badges = useMemo(() => {
    const computed = computeBadges(
      ranking ? { ...ranking, created_at: student.created_at } : ({ student_id: student.id, created_at: student.created_at } as any),
      { qualifications, allStudentsInClass: classmates, createdAt: student.created_at }
    );
    return computed;
  }, [ranking, student.created_at, student.id, qualifications, classmates]);

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-8 eboard:space-y-5">
      {/* Back button */}
      <a href={buildYearHref('/', selectedYear)} className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 transition-colors font-medium">
        <ArrowLeft className="w-4 h-4" />
        {m.studentDetail.back}
      </a>

      {isArchiveView && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
          {m.studentDetail.viewingArchive} {selectedYear}.
        </div>
      )}

      {/* Student Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row items-center gap-6 eboard:gap-4 p-8 eboard:p-5 rounded-2xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-lg border border-gray-100 dark:border-gray-800 shadow-xl"
      >
        <div className="w-28 h-28 eboard:w-20 eboard:h-20 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-4xl eboard:text-3xl font-black shadow-lg flex-shrink-0">
          {student.avatar_url ? (
            <img src={student.avatar_url} alt={student.full_name} className="w-full h-full rounded-full object-cover" />
          ) : (
            student.full_name.charAt(0)
          )}
        </div>
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl eboard:text-2xl md:text-4xl eboard:md:text-3xl font-extrabold text-gray-900 dark:text-white">{student.full_name}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{m.public.gradeSingle} {formatGradeSection(student.grade, student.section)} · {student.gender === 'male' ? m.public.male : m.public.female}</p>
        </div>
        <div className="flex flex-col items-center gap-1 px-8 eboard:px-5 py-4 eboard:py-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
          <span className="text-sm font-medium opacity-80">{m.studentDetail.totalScore}</span>
          <span className="text-4xl eboard:text-3xl font-black">{totalScore > 0 ? `+${totalScore}` : totalScore}</span>
          {ranking?.trend === 'up' && <TrendingUp className="w-5 h-5 text-green-300" />}
          {ranking?.trend === 'down' && <TrendingDown className="w-5 h-5 text-red-300" />}
          {ranking?.trend === 'flat' && <Minus className="w-5 h-5 text-gray-300" />}
        </div>
      </motion.div>

      {/* Ranking Context */}
      {rankingContext && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50 text-center"
        >
          <p className="text-indigo-900 dark:text-indigo-100 font-medium">
            {m.studentDetail.ranked} <span className="font-black text-lg">#{rankingContext.rank}</span> {formatGradeSection(student.grade, student.section)}
            <span className="text-indigo-700 dark:text-indigo-300 ml-2">({rankingContext.totalInClass} {m.studentDetail.studentsCount})</span>
          </p>
        </motion.div>
      )}

      {/* Badges */}
      {badges.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 eboard:p-4 rounded-2xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-lg border border-gray-100 dark:border-gray-800 shadow-xl"
        >
          <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-3">{m.studentDetail.badges}</h2>
          <div className="flex flex-wrap gap-2">
            {badges.map(b => (
              <BadgePill key={`${student.id}-${b}`} type={b} />
            ))}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 eboard:gap-5">
        {/* Radar Chart — Skill Web */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 eboard:p-4 rounded-2xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-lg border border-gray-100 dark:border-gray-800 shadow-xl"
        >
          <h2 className="text-xl eboard:text-lg font-bold text-gray-800 dark:text-white mb-4 eboard:mb-3 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            {m.studentDetail.skillWeb}
          </h2>
          <div className="w-full h-72 eboard:h-56">
            <ResponsiveContainer>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="category" tick={{ fill: '#64748b', fontSize: 13, fontWeight: 600 }} />
                <PolarRadiusAxis angle={30} domain={[0, 20]} tick={false} axisLine={false} />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Progress Line */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 eboard:p-4 rounded-2xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-lg border border-gray-100 dark:border-gray-800 shadow-xl"
        >
          <div className="flex items-center justify-between gap-3 mb-4 eboard:mb-3">
            <h2 className="text-xl eboard:text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              {m.studentDetail.progress}
            </h2>
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 eboard:p-0.5">
              {(['7d', '30d', 'all'] as Period[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 eboard:px-3 py-2 eboard:py-1.5 rounded-xl text-sm eboard:text-[13px] font-semibold transition-all ${
                    period === p
                      ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {p === 'all' ? m.studentDetail.all : p.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="w-full h-64 eboard:h-52">
            <ResponsiveContainer>
              <AreaChart data={progressData}>
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  }}
                />
                <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2.5} fill="url(#scoreGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 eboard:gap-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="p-6 eboard:p-4 rounded-2xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-lg border border-gray-100 dark:border-gray-800 shadow-xl"
        >
          <h2 className="text-xl eboard:text-lg font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-sky-500" />
            {m.studentDetail.subjectWeb}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {m.studentDetail.strongestSubjects}
          </p>
          {subjectRadarData.length === 0 ? (
            <p className="text-gray-500 text-center py-16 eboard:py-10">{m.studentDetail.noSubjectActivity}</p>
          ) : (
            <div className="w-full h-72 eboard:h-56">
              <ResponsiveContainer>
                <RadarChart data={subjectRadarData} cx="50%" cy="50%" outerRadius="72%">
                  <PolarGrid stroke="#dbeafe" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 15]} tick={false} axisLine={false} />
                  <Radar
                    name={m.studentDetail.subjectWeb}
                    dataKey="score"
                    stroke="#0ea5e9"
                    fill="#38bdf8"
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 eboard:p-4 rounded-2xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-lg border border-gray-100 dark:border-gray-800 shadow-xl"
        >
          <h2 className="text-xl eboard:text-lg font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-500" />
            {m.studentDetail.categoryBalance}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {m.studentDetail.categoryBalanceHint}
          </p>
          <div className="w-full h-72 eboard:h-56">
            <ResponsiveContainer>
              <BarChart data={categoryBalanceData} layout="vertical" barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 12, fill: '#64748b' }} width={110} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === 'positive' ? `+${value}` : name === 'negative' ? `-${value}` : value,
                    name === 'positive' ? m.studentDetail.positive : name === 'negative' ? m.studentDetail.negative : m.studentDetail.net,
                  ]}
                  contentStyle={{
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  }}
                />
                <Bar dataKey="positive" radius={[0, 6, 6, 0]} fill="#22c55e" />
                <Bar dataKey="negative" radius={[0, 6, 6, 0]} fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="p-6 eboard:p-4 rounded-2xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-lg border border-gray-100 dark:border-gray-800 shadow-xl"
        >
          <h2 className="text-xl eboard:text-lg font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
            <Activity className="w-5 h-5 text-violet-500" />
            {m.studentDetail.monthlyMomentum}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {m.studentDetail.monthlyMomentumHint}
          </p>
          {monthlyMomentumData.length === 0 ? (
            <p className="text-gray-500 text-center py-16 eboard:py-10">{m.studentDetail.noMonthlyActivity}</p>
          ) : (
            <div className="w-full h-72 eboard:h-56">
              <ResponsiveContainer>
                <BarChart data={monthlyMomentumData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      name === 'positive' ? `+${value}` : name === 'negative' ? `-${value}` : value,
                      name === 'positive' ? m.studentDetail.positive : name === 'negative' ? m.studentDetail.negative : m.studentDetail.net,
                    ]}
                    contentStyle={{
                      backgroundColor: 'rgba(255,255,255,0.95)',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                    {monthlyMomentumData.map((entry) => (
                      <Cell key={entry.label} fill={entry.total >= 0 ? '#8b5cf6' : '#f97316'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>
      </div>

      {/* Milestones */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-6 eboard:p-4 rounded-2xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-lg border border-gray-100 dark:border-gray-800 shadow-xl"
      >
        <h2 className="text-xl eboard:text-lg font-bold text-gray-800 dark:text-white mb-4 eboard:mb-3 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          {m.studentDetail.recentMilestones}
          <span className="text-sm font-normal text-gray-500">{m.studentDetail.milestoneHint}</span>
        </h2>
        {milestones.length === 0 ? (
          <p className="text-gray-500 text-center py-6">{m.studentDetail.noMilestones}</p>
        ) : (
          <div className="space-y-3">
            {milestones.map((milestone, i) => (
              <motion.div
                key={milestone.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i }}
                className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border border-amber-100 dark:border-amber-900/50"
              >
                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-black text-lg ${
                  milestone.value === 5 ? 'bg-green-500 text-white' : 'bg-amber-400 text-white'
                }`}>
                  +{milestone.value}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-800 dark:text-gray-100">
                    {milestone.category} — {milestone.subject || m.studentDetail.general}
                  </div>
                  {milestone.teacher_note && (
                    <div className="text-sm text-gray-600 dark:text-gray-300">{milestone.teacher_note}</div>
                  )}
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {m.studentDetail.givenBy}: <span className="font-medium">{milestone.teacher_id && teacherCache[milestone.teacher_id] ? teacherCache[milestone.teacher_id] : m.studentDetail.loading}</span>
                  </div>
                </div>
                <div className="text-sm text-gray-400 flex-shrink-0">
                  {new Date(milestone.created_at).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Full Activity Feed */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="p-6 rounded-2xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-lg border border-gray-100 dark:border-gray-800 shadow-xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">{m.studentDetail.allActivity}</h2>
          <span className="text-sm text-gray-500">{m.studentDetail.total}: {qualifications.length}</span>
        </div>

        {qualifications.length === 0 ? (
          <p className="text-gray-500 text-center py-6">{m.studentDetail.noActivity}</p>
        ) : (
          <>
            <div className="space-y-2 mb-4">
              {qualifications
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice((activityPage - 1) * ACTIVITY_PAGE_SIZE, activityPage * ACTIVITY_PAGE_SIZE)
                .map((q) => {
                  const isPositive = q.value > 0;
                  const isNeutral = q.value === 0;
                  return (
                    <motion.div
                      key={q.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border border-gray-100 dark:border-gray-800/30"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold text-white ${
                            isPositive ? 'bg-green-500' : isNeutral ? 'bg-gray-400' : 'bg-red-500'
                          }`}>
                            {isPositive ? '+' : ''}{q.value}
                          </span>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{q.category}</span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">{q.subject || m.studentDetail.general}</span>
                        </div>
                        {q.teacher_note && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{q.teacher_note}</p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {m.studentDetail.givenBy}: <span className="font-medium text-gray-600 dark:text-gray-300">
                            {q.teacher_id && teacherCache[q.teacher_id] ? teacherCache[q.teacher_id] : m.studentDetail.unknown}
                          </span>
                        </p>
                      </div>
                      <div className="text-xs text-gray-400 flex-shrink-0 ml-4">
                        {new Date(q.created_at).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: '2-digit' })}
                      </div>
                    </motion.div>
                  );
                })}
            </div>

            {/* Pagination */}
            {Math.ceil(qualifications.length / ACTIVITY_PAGE_SIZE) > 1 && (
              <div className="flex items-center justify-center gap-4 mt-6 pt-5 border-t border-gray-200 dark:border-gray-800">
                <button
                  onClick={() => setActivityPage(prev => Math.max(1, prev - 1))}
                  disabled={activityPage === 1}
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronUp className="w-5 h-5" />
                  {m.studentDetail.newer}
                </button>
                <span className="px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 text-sm font-semibold text-indigo-700 dark:text-indigo-200">
                  {m.studentDetail.page} {activityPage} {m.studentDetail.of} {Math.ceil(qualifications.length / ACTIVITY_PAGE_SIZE)}
                </span>
                <button
                  onClick={() => setActivityPage(prev => Math.min(Math.ceil(qualifications.length / ACTIVITY_PAGE_SIZE), prev + 1))}
                  disabled={activityPage === Math.ceil(qualifications.length / ACTIVITY_PAGE_SIZE)}
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {m.studentDetail.older}
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
