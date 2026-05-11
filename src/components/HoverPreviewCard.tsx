import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';

type HoverData = {
  totals: Record<'Academic' | 'Behavior' | 'Extracurricular' | 'Attendance', number>;
  recent: { category: string; subject: string | null; value: number; created_at: string; teacher_note: string | null }[];
};

export default function HoverPreviewCard({
  studentName,
  data,
  loading,
  style,
}: {
  studentName: string;
  data: HoverData | null;
  loading: boolean;
  style: React.CSSProperties;
}) {
  const radarData = useMemo(() => {
    const totals = data?.totals;
    const get = (k: keyof HoverData['totals']) => Math.max(0, totals?.[k] ?? 0);
    return [
      { category: 'Academic', score: get('Academic'), fullMark: 20 },
      { category: 'Behavior', score: get('Behavior'), fullMark: 20 },
      { category: 'Extracurricular', score: get('Extracurricular'), fullMark: 20 },
      { category: 'Attendance', score: get('Attendance'), fullMark: 20 },
    ];
  }, [data]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{ duration: 0.14 }}
      className="hidden lg:block fixed z-50 w-[360px] rounded-2xl bg-white/90 dark:bg-gray-950/90 backdrop-blur border border-gray-200/70 dark:border-gray-800 shadow-2xl overflow-hidden"
      style={style}
    >
      <div className="p-4 border-b border-gray-200/60 dark:border-gray-800">
        <div className="font-bold text-gray-900 dark:text-white truncate">{studentName}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">Quick preview</div>
      </div>

      <div className="p-4 grid grid-cols-5 gap-3">
        <div className="col-span-2">
          <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Last 30 days</div>
          <div className="h-36">
            {loading ? (
              <div className="h-full w-full rounded-xl bg-gray-200/60 dark:bg-gray-800/60 animate-pulse" />
            ) : (
              <ResponsiveContainer>
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="rgba(148,163,184,0.35)" />
                  <PolarAngleAxis dataKey="category" tick={{ fill: '#64748b', fontSize: 10 }} />
                  <PolarRadiusAxis tick={false} axisLine={false} />
                  <Radar dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="col-span-3">
          <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Recent activity</div>
          {loading ? (
            <div className="space-y-2">
              <div className="h-4 rounded bg-gray-200/60 dark:bg-gray-800/60 animate-pulse" />
              <div className="h-4 rounded bg-gray-200/60 dark:bg-gray-800/60 animate-pulse" />
              <div className="h-4 rounded bg-gray-200/60 dark:bg-gray-800/60 animate-pulse" />
            </div>
          ) : (
            <div className="space-y-2 max-h-36 overflow-hidden">
              {(data?.recent ?? []).slice(0, 5).map((r, idx) => (
                <div key={idx} className="text-xs text-gray-700 dark:text-gray-200">
                  <span className="font-bold tabular-nums">{r.value > 0 ? `+${r.value}` : r.value}</span>
                  <span className="text-gray-500 dark:text-gray-400"> · </span>
                  <span className="font-medium">{r.category}</span>
                  {r.subject && (
                    <>
                      <span className="text-gray-500 dark:text-gray-400"> · </span>
                      <span>{r.subject}</span>
                    </>
                  )}
                </div>
              ))}
              {(data?.recent?.length ?? 0) === 0 && (
                <div className="text-xs text-gray-500 dark:text-gray-400">No recent qualifications.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

