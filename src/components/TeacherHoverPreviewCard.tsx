import React from 'react';
import { getMessages, type Locale } from '../lib/i18n';
import type { TeacherLeaderboardBadgeType, TeacherRank } from '../types';
import TeacherBadgePill from './TeacherBadgePill';

type Props = {
  locale: Locale;
  teacher: TeacherRank;
  badges: TeacherLeaderboardBadgeType[];
  position: { left: number; top: number };
};

export default function TeacherHoverPreviewCard({ locale, teacher, badges, position }: Props) {
  const m = getMessages(locale);
  return (
    <div
      className="fixed z-[90] w-[340px] rounded-[1.75rem] border border-white/10 bg-slate-950/95 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.45)] backdrop-blur"
      style={{ left: position.left, top: position.top }}
      role="dialog"
      aria-label={m.teacherLeaderboard.previewAriaLabel.replace('{name}', teacher.full_name)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-300">{m.teacherLeaderboard.previewEyebrow}</p>
          <h3 className="mt-2 text-xl font-black text-white">{teacher.full_name}</h3>
          <p className="mt-2 text-sm text-slate-300">
            {teacher.subjects.length ? teacher.subjects.join(', ') : m.teacherLeaderboard.generalSupport}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center">
          <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{m.teacherLeaderboard.score}</div>
          <div className="mt-1 text-2xl font-black text-white">{teacher.activity_score.toFixed(2)}</div>
        </div>
      </div>

      {badges.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {badges.map((badge) => (
            <TeacherBadgePill key={badge} type={badge} />
          ))}
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <MetricCard label={m.teacherDetail.qualifications} value={teacher.qualification_count} />
        <MetricCard label={m.teacherLeaderboard.studentsReached} value={teacher.unique_students_count} />
        <MetricCard label={m.teacherDetail.activeDays} value={teacher.active_days_count} />
        <MetricCard label={m.teacherDetail.recentActivity} value={teacher.recent_activity_count} />
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{label}</div>
      <div className="mt-2 text-xl font-black text-white">{value}</div>
    </div>
  );
}
