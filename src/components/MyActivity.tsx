import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Undo2, Activity } from 'lucide-react';
import { apiJson, apiRequestOrThrow } from '../lib/apiClient';
import { normalizeErrorMessage } from '../lib/clientErrors';
import { getMessages, type Locale } from '../lib/i18n';
import { useToast } from './toast/ToastProvider';

interface RecentEntry {
  id: string;
  student_name: string;
  category: string;
  subject: string;
  value: number;
  teacher_note?: string;
  created_at: string;
  undoExpiry: number; // timestamp when undo expires
}

interface Props {
  locale: Locale;
  token: string;
  refreshTrigger?: number; // pass a counter to trigger a re-fetch when new qualifications are submitted
}

export default function MyActivity({ locale, token, refreshTrigger = 0 }: Props) {
  const m = getMessages(locale);
  const { showToast } = useToast();
  const [entries, setEntries] = useState<RecentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Undo countdowns
  const [undoCountdowns, setUndoCountdowns] = useState<Record<string, number>>({});
  const [undoing, setUndoing] = useState<string | null>(null);

  useEffect(() => {
    fetchActivity();
  }, [token, refreshTrigger]);

  const fetchActivity = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiJson<RecentEntry[]>('teacherActivity', {
        token,
        fallbackError: 'Failed to fetch activity',
      });
      setEntries(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update undo countdowns every second
  useEffect(() => {
    const interval = setInterval(() => {
      setUndoCountdowns(prev => {
        const next: Record<string, number> = {};
        for (const entry of entries) {
          const remaining = Math.max(0, Math.ceil((entry.undoExpiry - Date.now()) / 1000));
          if (remaining > 0) next[entry.id] = remaining;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [entries]);

  const handleUndo = async (entryId: string) => {
    setUndoing(entryId);
    try {
      await apiRequestOrThrow('qualificationById', {
        method: 'DELETE',
        token,
        pathParams: { id: entryId },
        fallbackError: 'Undo failed',
      });

      // Remove from list immediately
      setEntries(prev => prev.filter(e => e.id !== entryId));
    } catch (err: any) {
      const message = normalizeErrorMessage(err.message);
      showToast({
        type: 'error',
        title: message.toLowerCase().includes('undo window expired') ? 'Undo expired' : 'Undo failed',
        message,
      });
    } finally {
      setUndoing(null);
    }
  };

  if (loading && entries.length === 0) {
    return (
      <div className="p-6 rounded-3xl bg-white/8 backdrop-blur-xl border border-white/10 shadow-[0_18px_40px_rgba(15,23,42,0.35)] h-fit">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-500" />
          {m.teacher.myActivity}
        </h2>
        <div className="text-center py-8 text-slate-400">{m.teacher.loadingActivity}</div>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-3xl bg-white/8 backdrop-blur-xl border border-white/10 shadow-[0_18px_40px_rgba(15,23,42,0.35)] h-fit">
      <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-indigo-500" />
        {m.teacher.myActivity}
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-950/30 text-red-300 rounded-xl text-sm border border-red-900/40">
          {error}
        </div>
      )}

      {entries.length === 0 ? (
        <div className="text-center py-8 space-y-2">
          <p className="text-slate-200 font-medium">{m.teacher.noRecentActivity}</p>
          <p className="text-slate-400 text-sm">{m.teacher.noRecentActivityHint}</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[620px] overflow-y-auto pr-2 custom-scrollbar">
          <AnimatePresence>
            {entries.map(entry => {
              const countdown = undoCountdowns[entry.id];
              const canUndo = countdown !== undefined && countdown > 0;
              const isUndoing = undoing === entry.id;

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-3 rounded-2xl bg-slate-900/70 border border-white/8 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-slate-100 text-sm truncate">
                      {entry.student_name}
                    </span>
                    <span className={`text-sm font-bold ${
                      entry.value > 0 ? 'text-green-600' : entry.value < 0 ? 'text-red-600' : 'text-gray-500'
                    }`}>
                      {entry.value > 0 ? `+${entry.value}` : entry.value}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex justify-between items-center">
                    <span>{entry.category} · {entry.subject}</span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {entry.teacher_note && (
                    <div className="text-xs text-slate-400 bg-slate-950 p-2 rounded-lg mb-2 italic">
                      "{entry.teacher_note}"
                    </div>
                  )}
                  {canUndo ? (
                    <button
                      onClick={() => handleUndo(entry.id)}
                      disabled={isUndoing}
                      className="w-full flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-orange-950/30 border border-orange-800 text-orange-300 text-xs font-medium hover:bg-orange-900/30 transition-colors disabled:opacity-50"
                    >
                      {isUndoing ? (
                        <div className="w-3 h-3 border-2 border-orange-600/30 border-t-orange-600 rounded-full animate-spin" />
                      ) : (
                        <Undo2 className="w-3 h-3" />
                      )}
                      {isUndoing ? 'Undoing...' : `Undo (${countdown}s)`}
                    </button>
                  ) : null}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
