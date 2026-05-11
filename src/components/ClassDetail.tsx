import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { ArrowLeft, Users, Award, TrendingUp, Zap, PieChart as PieChartIcon, Layers3 } from 'lucide-react';
import { fetchMostActiveTeacherForClass } from '../lib/publicData';
import { buildYearHref, formatGradeSection } from '../lib/utils';
import type { StudentRank } from '../types';

interface Props {
  grade: number;
  section?: string | null;
  students: StudentRank[];
  allStudents: StudentRank[];
  selectedYear?: string | null;
  isArchiveView?: boolean;
}

export default function ClassDetail({ grade, section, students, allStudents, selectedYear = null, isArchiveView = false }: Props) {
  const [selectedSection, setSelectedSection] = useState<string | null>(section || null);
  const [mostActiveTeacher, setMostActiveTeacher] = useState<{ id: string; full_name: string } | null>(null);
  const [mostActiveTeacherCount, setMostActiveTeacherCount] = useState(0);

  // Get unique sections for this grade
  const sections = useMemo(() => {
    const uniqueSections = new Set(
      students
        .filter(s => s.section)
        .map(s => s.section)
    );
    return Array.from(uniqueSections).sort();
  }, [students]);

  // Filter students based on selected section
  const displayStudents = useMemo(() => {
    if (!selectedSection) return students;
    return students.filter(s => s.section === selectedSection);
  }, [students, selectedSection]);

  // Fetch most active teacher for this class
  useEffect(() => {
    if (isArchiveView) {
      setMostActiveTeacher(null);
      setMostActiveTeacherCount(0);
      return;
    }

    const fetchMostActiveTeacher = async () => {
      try {
        const data = await fetchMostActiveTeacherForClass(grade, selectedSection);
        setMostActiveTeacher(data.teacher || null);
        setMostActiveTeacherCount(data.qualification_count || 0);
      } catch (err) {
        console.error('Failed to fetch most active teacher:', err);
      }
    };

    fetchMostActiveTeacher();
  }, [grade, selectedSection, isArchiveView]);
  // Aggregated stats
  const classAvg = useMemo(() => {
    if (displayStudents.length === 0) return 0;
    return Math.round((displayStudents.reduce((a, s) => a + s.total_score, 0) / displayStudents.length) * 10) / 10;
  }, [displayStudents]);

  const schoolAvg = useMemo(() => {
    if (allStudents.length === 0) return 0;
    return Math.round((allStudents.reduce((a, s) => a + s.total_score, 0) / allStudents.length) * 10) / 10;
  }, [allStudents]);

  const comparisonData = [
    { name: `Grade ${formatGradeSection(grade, selectedSection)}`, avg: classAvg, fill: '#6366f1' },
    { name: 'School Avg', avg: schoolAvg, fill: '#94a3b8' },
  ];

  // Category breakdown
  const categoryData = useMemo(() => {
    if (displayStudents.length === 0) return [];
    const len = displayStudents.length;
    return [
      { name: 'Academic', avg: Math.round((displayStudents.reduce((a, s) => a + s.academic_score, 0) / len) * 10) / 10 },
      { name: 'Behavior', avg: Math.round((displayStudents.reduce((a, s) => a + s.behavior_score, 0) / len) * 10) / 10 },
      { name: 'Extra', avg: Math.round((displayStudents.reduce((a, s) => a + s.extracurricular_score, 0) / len) * 10) / 10 },
      { name: 'Attendance', avg: Math.round((displayStudents.reduce((a, s) => a + s.attendance_score, 0) / len) * 10) / 10 },
    ];
  }, [displayStudents]);

  const sectionComparisonData = useMemo(() => {
    if (selectedSection || sections.length === 0) return [];

    return sections.map((sec) => {
      const sectionStudents = students.filter((student) => student.section === sec);
      const avgScore = sectionStudents.length === 0
        ? 0
        : Math.round((sectionStudents.reduce((sum, student) => sum + student.total_score, 0) / sectionStudents.length) * 10) / 10;

      return {
        name: `Section ${sec}`,
        avg: avgScore,
        students: sectionStudents.length,
      };
    });
  }, [sections, selectedSection, students]);

  const scoreDistributionData = useMemo(() => {
    const buckets = [
      { name: '< 0', min: Number.NEGATIVE_INFINITY, max: -1, color: '#ef4444' },
      { name: '0 - 4', min: 0, max: 4, color: '#f59e0b' },
      { name: '5 - 9', min: 5, max: 9, color: '#22c55e' },
      { name: '10+', min: 10, max: Number.POSITIVE_INFINITY, color: '#6366f1' },
    ];

    return buckets.map((bucket) => ({
      name: bucket.name,
      students: displayStudents.filter((student) => student.total_score >= bucket.min && student.total_score <= bucket.max).length,
      color: bucket.color,
    }));
  }, [displayStudents]);

  const classHealthData = useMemo(() => {
    const positive = displayStudents.filter((student) => student.total_score > 0).length;
    const steady = displayStudents.filter((student) => student.total_score === 0).length;
    const needsSupport = displayStudents.filter((student) => student.total_score < 0).length;

    return [
      { name: 'Positive', value: positive, color: '#22c55e' },
      { name: 'Steady', value: steady, color: '#94a3b8' },
      { name: 'Needs Support', value: needsSupport, color: '#f97316' },
    ].filter((entry) => entry.value > 0);
  }, [displayStudents]);

  // Top 5
  const top5 = useMemo(() => {
    return [...displayStudents].sort((a, b) => b.total_score - a.total_score).slice(0, 5);
  }, [displayStudents]);

  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-8">
      {/* Back button */}
      <a href={buildYearHref('/', selectedYear)} className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 transition-colors font-medium">
        <ArrowLeft className="w-4 h-4" />
        Back to Leaderboard
      </a>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col md:flex-row items-center gap-6 p-8 rounded-2xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-lg border border-gray-100 dark:border-gray-800 shadow-xl">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-black shadow-lg flex-shrink-0">
            {grade}
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white">
              Grade {formatGradeSection(grade, selectedSection)}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{displayStudents.length} students</p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex gap-4">
              <div className="flex flex-col items-center px-6 py-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900">
                <span className="text-xs font-medium text-indigo-500">Class Avg</span>
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{classAvg}</span>
              </div>
              <div className="flex flex-col items-center px-6 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                <span className="text-xs font-medium text-gray-500">School Avg</span>
                <span className="text-2xl font-black text-gray-600 dark:text-gray-300">{schoolAvg}</span>
              </div>
            </div>
            {mostActiveTeacher && !isArchiveView && (
              <div className="flex flex-col items-center px-6 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
                <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Most Active</span>
                <span className="text-sm font-bold text-amber-900 dark:text-amber-100 truncate">{mostActiveTeacher.full_name}</span>
                <span className="text-xs text-amber-600 dark:text-amber-400">{mostActiveTeacherCount} qualifications</span>
              </div>
            )}
          </div>
        </div>

        {/* Section Tabs */}
        {sections.length > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-white/40 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 overflow-x-auto">
            <button
              onClick={() => setSelectedSection(null)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                selectedSection === null
                  ? 'bg-indigo-500 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              All Sections
            </button>
            {sections.map((sec) => (
              <button
                key={sec}
                onClick={() => setSelectedSection(sec)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                  selectedSection === sec
                    ? 'bg-indigo-500 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                Section {sec}
              </button>
            ))}
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Comparison Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-2xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-lg border border-gray-100 dark:border-gray-800 shadow-xl"
        >
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Class vs School Average
          </h2>
          <div className="w-full h-64">
            <ResponsiveContainer>
              <BarChart data={comparisonData} layout="vertical" barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 13, fill: '#64748b', fontWeight: 600 }} width={100} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  }}
                />
                <Bar dataKey="avg" radius={[0, 8, 8, 0]} barSize={32}>
                  {comparisonData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Category Breakdown */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-2xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-lg border border-gray-100 dark:border-gray-800 shadow-xl"
        >
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" />
            Category Breakdown
          </h2>
          <div className="w-full h-64">
            <ResponsiveContainer>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  }}
                />
                <Bar dataKey="avg" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25 }}
          className="p-6 rounded-2xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-lg border border-gray-100 dark:border-gray-800 shadow-xl"
        >
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <Layers3 className="w-5 h-5 text-sky-500" />
            Score Distribution
          </h2>
          <div className="w-full h-64">
            <ResponsiveContainer>
              <BarChart data={scoreDistributionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  }}
                />
                <Bar dataKey="students" radius={[8, 8, 0, 0]} barSize={42}>
                  {scoreDistributionData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 rounded-2xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-lg border border-gray-100 dark:border-gray-800 shadow-xl"
        >
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-emerald-500" />
            Class Health Split
          </h2>
          <div className="w-full h-64">
            {classHealthData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
                No student scores available yet.
              </div>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={classHealthData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={84}
                    innerRadius={42}
                    paddingAngle={3}
                  >
                    {classHealthData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255,255,255,0.95)',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>
      </div>

      {sectionComparisonData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="p-6 rounded-2xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-lg border border-gray-100 dark:border-gray-800 shadow-xl"
        >
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-violet-500" />
            Section Comparison
          </h2>
          <div className="w-full h-72">
            <ResponsiveContainer>
              <BarChart data={sectionComparisonData} barCategoryGap="22%">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis yAxisId="right" orientation="right" allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="avg" name="Average score" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                <Bar yAxisId="right" dataKey="students" name="Student count" fill="#38bdf8" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Top 5 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-6 rounded-2xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-lg border border-gray-100 dark:border-gray-800 shadow-xl"
      >
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-yellow-500" />
          Top 5 in Grade {formatGradeSection(grade, selectedSection)}
        </h2>
        {top5.length === 0 ? (
          <p className="text-gray-500 text-center py-6">No students in this grade.</p>
        ) : (
          <div className="space-y-3">
            {top5.map((s, i) => (
              <motion.a
                key={s.student_id}
                href={buildYearHref(`/student/${s.student_id}`, selectedYear)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i }}
                className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow cursor-pointer no-underline"
              >
                <span className="text-2xl flex-shrink-0">{medals[i]}</span>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {s.avatar_url ? (
                    <img src={s.avatar_url} alt={s.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    s.name.charAt(0)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-800 dark:text-gray-100 truncate">
                    {s.name} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({formatGradeSection(s.grade, s.section)})</span>
                  </div>
                  <div className="text-sm text-gray-500">{s.gender === 'male' ? 'Male' : 'Female'}</div>
                </div>
                <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                  {s.total_score > 0 ? `+${s.total_score}` : s.total_score}
                </div>
              </motion.a>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
