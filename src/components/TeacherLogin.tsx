import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Lock, LogIn, ChevronDown } from 'lucide-react';
import { apiJson } from '../lib/apiClient';
import { getProtectedApiConfigError, hasProtectedApiBaseUrl } from '../lib/apiBase';
import { buildLocaleHref, getMessages, type Locale } from '../lib/i18n';

interface TeacherProfile {
  id: string;
  full_name: string;
  subjects: string[];
  is_password_changed: boolean;
}

interface Props {
  locale: Locale;
  onLogin: (token: string, profile: TeacherProfile) => void;
}

export default function TeacherLogin({ locale, onLogin }: Props) {
  const m = getMessages(locale);
  const [teachers, setTeachers] = useState<{id: string, full_name: string}[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [teachersLoadError, setTeachersLoadError] = useState('');
  
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const noTeachersConfigured = !loadingTeachers && !teachersLoadError && teachers.length === 0;

  useEffect(() => {
    const fetchTeachers = async () => {
      if (!hasProtectedApiBaseUrl()) {
        setTeachersLoadError(getProtectedApiConfigError());
        setLoadingTeachers(false);
        return;
      }

      try {
        const data = await apiJson<{id: string, full_name: string}[]>('authTeachersList', {
          fallbackError: m.teacher.loadTeachersError,
        });
        setTeachers(data);
        setTeachersLoadError('');
      } catch (err) {
        console.error('Failed to load teachers list', err);
        setTeachersLoadError(err instanceof Error ? err.message : m.teacher.loadTeachersNetworkError);
      } finally {
        setLoadingTeachers(false);
      }
    };
    fetchTeachers();
  }, [m.teacher.loadTeachersError, m.teacher.loadTeachersNetworkError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherId) {
      setError(m.teacher.selectNameError);
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      const data = await apiJson<{ token: string; teacher: TeacherProfile }>('authTeacherLogin', {
        method: 'POST',
        json: { teacher_id: selectedTeacherId, password },
        fallbackError: 'Login failed',
      });

      localStorage.setItem('teacher_token', data.token);
      localStorage.setItem('teacher_profile', JSON.stringify(data.teacher));
      
      onLogin(data.token, data.teacher);
    } catch (err) {
      setError(err instanceof Error ? err.message : m.teacher.networkError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md p-8 rounded-2xl bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-gray-200 dark:border-gray-800 shadow-2xl"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">{m.teacher.signInTitle}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm text-center">
            {m.teacher.signInSubtitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="teacher" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {m.teacher.selectTeacher}
            </label>
            <div className="relative">
              <select
                id="teacher"
                value={selectedTeacherId}
                onChange={(e) => {
                  setSelectedTeacherId(e.target.value);
                  setError('');
                }}
                disabled={loadingTeachers}
                className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                <option value="" disabled>
                  {loadingTeachers
                    ? m.teacher.loadingTeachers
                    : noTeachersConfigured
                      ? m.teacher.noTeachersConfigured
                      : m.teacher.selectYourName}
                </option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.full_name}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-gray-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          {teachersLoadError && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm"
            >
              {teachersLoadError}
            </motion.div>
          )}

          {noTeachersConfigured && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm"
            >
              <div className="font-medium">{m.teacher.noTeachersConfigured}</div>
              <div className="mt-1 opacity-90">{m.teacher.noTeachersConfiguredHint}</div>
            </motion.div>
          )}

          <AnimatePresence>
            {selectedTeacherId && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-2">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {m.teacher.password}
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={m.teacher.enterPassword}
                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm"
            >
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading || loadingTeachers || !selectedTeacherId || !password || Boolean(teachersLoadError) || noTeachersConfigured}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5 mt-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                {m.teacher.signIn}
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href={buildLocaleHref('/', locale)} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
            ← {m.public.backToLeaderboard}
          </a>
        </div>
      </motion.div>
    </div>
  );
}
