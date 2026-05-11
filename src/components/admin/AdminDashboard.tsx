import React, { useState, useEffect } from 'react';
import { LogOut, Users, GraduationCap, Activity, Settings, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { hasProtectedApiBaseUrl } from '../../lib/apiBase';
import { buildLocaleHref, getMessages, resolveRuntimeLocale, type Locale } from '../../lib/i18n';
import StudentsTable from './StudentsTable';
import TeachersTable from './TeachersTable';
import AuditLog from './AuditLog';
import SettingsForm from './SettingsForm';
import { ToastProvider } from '../toast/ToastProvider';

type Tab = 'students' | 'teachers' | 'activity' | 'settings';
type AuthState = 'checking' | 'allowed' | 'denied' | 'backend';

export default function AdminDashboard({ locale }: { locale: Locale }) {
  const [activeLocale, setActiveLocale] = useState<Locale>(() => resolveRuntimeLocale(locale));
  const m = getMessages(activeLocale);
  const [activeTab, setActiveTab] = useState<Tab>('students');
  const [authState, setAuthState] = useState<AuthState>('checking');

  useEffect(() => {
    try {
      setActiveLocale(resolveRuntimeLocale(locale));

      if (!hasProtectedApiBaseUrl()) {
        localStorage.removeItem('admin_token');
        setAuthState('backend');
        return;
      }

      const token = window.localStorage.getItem('admin_token');
      if (!token) {
        setAuthState('denied');
        window.location.replace(buildLocaleHref('/admin', resolveRuntimeLocale(locale)));
        return;
      }

      const hash = window.location.hash.replace('#', '') as Tab;
      if (['students', 'teachers', 'activity', 'settings'].includes(hash)) {
        setActiveTab(hash);
      }

      setAuthState('allowed');
    } catch (error) {
      console.error('Admin dashboard auth bootstrap failed:', error);
      setAuthState('denied');
    }
  }, [locale]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    window.location.hash = tab;
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    window.location.href = buildLocaleHref('/admin', activeLocale);
  };

  if (authState === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (authState === 'denied') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md rounded-2xl border border-gray-700 bg-gray-900/80 p-6 text-center shadow-xl">
          <h2 className="text-lg font-semibold text-white">{m.admin.sessionRequired}</h2>
          <p className="mt-2 text-sm text-gray-400">
            {m.admin.sessionRequiredHint}
          </p>
          <a
            href={buildLocaleHref('/admin', activeLocale)}
            className="mt-5 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            {m.admin.goToLogin}
          </a>
        </div>
      </div>
    );
  }

  if (authState === 'backend') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md rounded-2xl border border-gray-700 bg-gray-900/80 p-6 text-center shadow-xl">
          <h2 className="text-lg font-semibold text-white">{m.admin.backendRequired}</h2>
          <p className="mt-2 text-sm text-gray-400">
            {m.admin.backendRequiredHint}
          </p>
          <a
            href={buildLocaleHref('/admin', activeLocale)}
            className="mt-5 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            {m.admin.goToLogin}
          </a>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'students', label: m.admin.tabs.students, icon: GraduationCap },
    { id: 'teachers', label: m.admin.tabs.teachers, icon: Users },
    { id: 'activity', label: m.admin.tabs.activity, icon: Activity },
    { id: 'settings', label: m.admin.tabs.settings, icon: Settings },
  ] as const;

  return (
    <ToastProvider>
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 py-4 sm:h-16 sm:flex-row sm:items-center sm:justify-between sm:py-0">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">V2</span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">{m.admin.dashboard}</h1>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <a 
                href={buildLocaleHref('/', activeLocale)} 
                className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-1 transition-colors"
              >
                {m.public.leaderboard} <ExternalLink className="w-4 h-4" />
              </a>
              <div className="hidden sm:block h-4 w-px bg-gray-300 dark:bg-gray-600"></div>
              <button
                onClick={handleLogout}
                className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex items-center gap-1 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                {m.admin.logout}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {/* Tab Navigation */}
        <div
          className="mb-8 border-b border-gray-200 dark:border-gray-700 overflow-x-auto hide-scrollbar"
          role="tablist"
          aria-label="Admin dashboard sections"
        >
          <div className="flex space-x-5 sm:space-x-8 min-w-max">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => handleTabChange(id)}
                role="tab"
                id={`admin-tab-${id}`}
                aria-selected={activeTab === id}
                aria-controls={`admin-panel-${id}`}
                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors
                  ${activeTab === id 
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }
                `}
              >
                <Icon className={`w-4 h-4 ${activeTab === id ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-400'}`} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content Area */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 sm:p-6 min-h-[500px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              role="tabpanel"
              id={`admin-panel-${activeTab}`}
              aria-labelledby={`admin-tab-${activeTab}`}
            >
              {activeTab === 'students' && (
                <StudentsTable />
              )}
              
              {activeTab === 'teachers' && (
                <TeachersTable />
              )}
              
              {activeTab === 'activity' && (
                <AuditLog />
              )}
              
              {activeTab === 'settings' && (
                <SettingsForm />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        
      </div>
    </div>
    </ToastProvider>
  );
}
