import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Send, LogOut, User } from 'lucide-react';
import { apiJson } from '../lib/apiClient';
import { formatGradeSection } from '../lib/utils';
import { normalizeTeacherSubjects } from '../lib/teacherSubjects';
import { buildLocaleHref, getMessages, type Locale } from '../lib/i18n';
import MyActivity from './MyActivity';
import { useToast } from './toast/ToastProvider';

interface Student {
  id: string;
  name: string;
  gender: string;
  grade: number;
  section: string | null;
  avatar_url: string | null;
}

interface RecentEntry {
  id: string;
  student_name: string;
  category: string;
  subject: string;
  value: number;
  created_at: string;
  undoExpiry: number; // timestamp when undo expires
}

interface TeacherProfile {
  id: string;
  full_name: string;
  subjects: string[];
  is_password_changed: boolean;
}

interface Props {
  locale: Locale;
  token: string;
  profile: TeacherProfile;
  onLogout: () => void;
}

const STEP_VALUES = [-5, -3, -1, 0, 1, 3, 5] as const;
const CATEGORIES = ['Academic', 'Behavior', 'Extracurricular', 'Attendance'] as const;

export default function TeacherDashboard({ locale, token, profile, onLogout }: Props) {
  const m = getMessages(locale);
  const { showToast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const assignedSubjects = useMemo(() => normalizeTeacherSubjects(profile?.subjects), [profile?.subjects]);

  // Form state
  const [value, setValue] = useState<number>(0);
  const [category, setCategory] = useState<typeof CATEGORIES[number]>('Academic');
  const [subject, setSubject] = useState('');
  const [teacherNote, setTeacherNote] = useState('');

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Profile dropdown state
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);

  // Fetch students on mount
  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (assignedSubjects.length === 0) {
      setSubject('');
      return;
    }

    setSubject((currentSubject) => (
      assignedSubjects.includes(currentSubject) ? currentSubject : assignedSubjects[0]
    ));
  }, [assignedSubjects]);

  const fetchStudents = async () => {
    try {
      const data = await apiJson<any[]>('qualifications', {
        token,
        fallbackError: 'Failed to fetch students',
      });
      setStudents(
        data.map((student: any) => ({
          id: student.id,
          name: student.full_name ?? student.name ?? 'Unknown Student',
          gender: student.gender,
          grade: student.grade,
          section: student.section ?? null,
          avatar_url: student.avatar_url ?? null,
        }))
      );
    } catch {
      // silent fail
    }
  };

  const filteredStudents = search.length > 0
    ? students.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
    : [];

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setSearch('');
    try {
      localStorage.setItem('teacher_my_class_grade', String(student.grade));
      localStorage.setItem('teacher_my_class_section', student.section ?? '');
    } catch {
      // ignore (storage might be unavailable)
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    if (assignedSubjects.length === 0 || !subject) {
      showToast({
        type: 'error',
        title: 'No assigned subjects',
        message: 'This teacher account cannot rate students until an admin assigns at least one subject.',
      });
      return;
    }

    setSubmitting(true);

    try {
      await apiJson('qualifications', {
        method: 'POST',
        token,
        json: {
          student_id: selectedStudent.id,
          category,
          subject,
          value,
          teacher_note: teacherNote || null,
        },
        fallbackError: 'Failed to submit',
      });

      showToast({
        type: 'success',
        title: 'Qualification added',
        message: `${value > 0 ? '+' : ''}${value} applied to ${selectedStudent.name}.`,
      });

      // Trigger MyActivity refresh
      setRefreshTrigger(prev => prev + 1);

      // Reset form
      setValue(0);
      setTeacherNote('');
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Qualification failed',
        message: err instanceof Error ? err.message : 'Network error. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    onLogout();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div className="relative z-40 rounded-3xl border border-white/10 bg-white/6 backdrop-blur-xl shadow-[0_18px_60px_rgba(15,23,42,0.45)] px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">Teacher Workspace</p>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">{m.teacher.workspace}</p>
            <h1 className="mt-2 text-3xl font-extrabold text-white">{m.teacher.dashboard}</h1>
            <p className="mt-1 text-sm text-slate-200">{m.teacher.welcome}, {profile?.full_name || m.teacher.signInTitle}</p>
            <p className="mt-2 text-sm text-slate-400">
              {m.teacher.workspaceHint}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 items-center relative z-50">
            <a
              href={buildLocaleHref('/', locale)}
              className="px-4 py-2.5 rounded-xl bg-white/10 text-white text-sm font-semibold hover:bg-white/15 transition-colors"
            >
              {m.teacher.viewLeaderboard}
            </a>
            
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center justify-center w-11 h-11 rounded-full bg-indigo-400/15 text-indigo-200 font-bold transition-colors hover:bg-indigo-400/25"
            >
              {profile?.full_name?.charAt(0) || 'T'}
            </button>

            <AnimatePresence>
              {showProfileMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-14 w-64 bg-slate-950/95 rounded-2xl shadow-xl border border-white/10 overflow-hidden z-50"
                >
                  <div className="p-4 border-b border-white/10">
                    <p className="font-bold text-white">{profile?.full_name}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {m.teacher.subjects}: {assignedSubjects.join(', ') || m.teacher.noSubjectsAssigned}
                    </p>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-white/5 rounded-xl flex items-center gap-2"
                    >
                      <User className="w-4 h-4" /> {m.teacher.myProfile}
                    </button>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        handleLogout();
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-300 hover:bg-red-500/10 rounded-xl flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" /> {m.teacher.logout}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)] gap-6 items-start">
        {/* Left column: Search + Form */}
        <div className="space-y-6">
          {/* Search to Select */}
          <div className="relative z-30 xl:z-10 p-6 rounded-3xl bg-white/8 backdrop-blur-xl border border-white/10 shadow-[0_18px_40px_rgba(15,23,42,0.35)]">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Search className="w-5 h-5 text-indigo-500" />
              {m.teacher.selectStudent}
            </h2>

            {/* Selected student badge */}
            {selectedStudent && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-3 p-3 mb-4 rounded-xl bg-slate-900/55 border border-indigo-400/30"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {selectedStudent.avatar_url ? (
                    <img src={selectedStudent.avatar_url} alt={selectedStudent.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    selectedStudent.name.charAt(0)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-100">{selectedStudent.name}</div>
                  <div className="text-xs text-slate-400">Grade {formatGradeSection(selectedStudent.grade, selectedStudent.section)} · {selectedStudent.gender === 'male' ? 'Male' : 'Female'}</div>
                </div>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="text-slate-400 hover:text-slate-200 transition-colors text-sm"
                >
                  {m.teacher.change}
                </button>
              </motion.div>
            )}

            {/* Search input */}
            {!selectedStudent && (
              <div className="relative z-40">
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={m.teacher.typeStudentName}
                  className="w-full px-4 py-3 pl-10 rounded-2xl bg-slate-950/70 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  autoFocus
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />

                {/* Dropdown */}
                {filteredStudents.length > 0 && (
                  <div className="absolute z-[70] left-0 right-0 mt-2 bg-slate-950 border border-white/10 rounded-2xl shadow-xl max-h-60 overflow-y-auto">
                    {filteredStudents.map(s => (
                      <button
                        key={s.id}
                        onClick={() => handleSelectStudent(s)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-950/30 transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {s.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-slate-100">{s.name}</div>
                          <div className="text-xs text-slate-400">Grade {formatGradeSection(s.grade, s.section)}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {search.length > 0 && filteredStudents.length === 0 && (
                  <div className="absolute z-[70] left-0 right-0 mt-2 p-4 bg-slate-950 border border-white/10 rounded-2xl shadow-xl text-center text-slate-400 text-sm">
                    {m.teacher.noStudentsMatch} "{search}"
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Qualification Form */}
          {selectedStudent && (
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleSubmit}
              className="p-6 rounded-3xl bg-white/8 backdrop-blur-xl border border-white/10 shadow-[0_18px_40px_rgba(15,23,42,0.35)] space-y-6"
            >
              {/* The Stepper */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Point Value
                </label>
                <div className="flex flex-wrap gap-2 justify-center">
                  {STEP_VALUES.map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setValue(v)}
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl text-base sm:text-lg font-bold transition-all ${
                        value === v
                          ? v > 0
                            ? 'bg-green-500 text-white shadow-lg shadow-green-500/30 scale-110'
                            : v < 0
                              ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 scale-110'
                              : 'bg-gray-500 text-white shadow-lg scale-110'
                          : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                      }`}
                    >
                      {v > 0 ? `+${v}` : v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        category === cat
                          ? 'bg-indigo-500 text-white shadow-sm'
                          : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Subject</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={assignedSubjects.length === 0}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-white/10 text-white disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                >
                  {assignedSubjects.length === 0 ? (
                    <option value="">No subjects assigned</option>
                  ) : (
                    assignedSubjects.map((assignedSubject) => (
                      <option key={assignedSubject} value={assignedSubject}>{assignedSubject}</option>
                    ))
                  )}
                </select>
                {assignedSubjects.length === 0 && (
                  <p className="mt-2 text-sm text-amber-300">
                    An administrator must assign this teacher at least one subject before qualifications can be submitted.
                  </p>
                )}
              </div>

              {/* Teacher Note */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Note <span className="text-slate-500 font-normal">(optional)</span>
                </label>
                <textarea
                  value={teacherNote}
                  onChange={(e) => setTeacherNote(e.target.value)}
                  placeholder="Brief reason for the point change..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || value === 0 || assignedSubjects.length === 0 || !subject}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Submit Update
                  </>
                )}
              </button>
            </motion.form>
          )}
        </div>
        {/* Right column: Recent Entries / Undo Log */}
        <div className="relative z-0 xl:sticky xl:top-6">
          <MyActivity locale={locale} token={token} refreshTrigger={refreshTrigger} />
        </div>
      </div>
    </div>
  );
}
