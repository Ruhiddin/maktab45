import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, LogIn } from 'lucide-react';
import { apiJson } from '../../lib/apiClient';
import { getProtectedApiConfigError, hasProtectedApiBaseUrl } from '../../lib/apiBase';
import { buildLocaleHref, getMessages, type Locale } from '../../lib/i18n';

export default function AdminLogin({ locale }: { locale: Locale }) {
  const m = getMessages(locale);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hasProtectedApiBaseUrl()) {
      setError(getProtectedApiConfigError());
      return;
    }

    // Redirect if already logged in
    const token = localStorage.getItem('admin_token');
    if (token) {
      window.location.href = buildLocaleHref('/admin/dashboard', locale);
    }
  }, [locale]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await apiJson<{ token: string }>('authAdminLogin', {
        method: 'POST',
        json: { password },
        fallbackError: 'Login failed',
      });

      localStorage.setItem('admin_token', data.token);
      window.location.href = buildLocaleHref('/admin/dashboard', locale);
    } catch (err) {
      setError(err instanceof Error ? err.message : m.admin.networkError);
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
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">{m.admin.signInTitle}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm text-center">{m.admin.signInSubtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {m.admin.adminPassword}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={m.admin.enterPassword}
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              autoFocus
            />
          </div>

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
            disabled={loading || !password || !hasProtectedApiBaseUrl()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                {m.admin.signIn}
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href={buildLocaleHref('/', locale)} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            ← {m.public.backToLeaderboard}
          </a>
        </div>
      </motion.div>
    </div>
  );
}
