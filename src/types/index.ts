// =============================================================
// School Leaderboard V2 — TypeScript Types
// =============================================================

// --- Shared Enums & Primitives ---

export type Gender = 'male' | 'female';
export type Category = 'Academic' | 'Behavior' | 'Extracurricular' | 'Attendance' | 'All';
export type ActorType = 'admin' | 'teacher';
export type AuthRole = 'admin' | 'teacher';

export type BadgeType =
  | 'hot_streak'
  | 'top_performer'
  | 'all_rounder'
  | 'rising_star'
  | 'new_student';

// --- Auth ---

export interface AuthToken {
  /** Role of the authenticated user */
  role: AuthRole;
  /** Present only when role is 'teacher' */
  teacher_id?: string;
  /** JWT issued-at timestamp */
  iat?: number;
  /** JWT expiration timestamp */
  exp?: number;
}

// --- Teacher ---

export interface Teacher {
  id: string;
  full_name: string;
  subjects: string[];
  is_password_changed: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// --- Admin Settings ---

export interface AdminSettings {
  school_name: string;
  available_sections: string[];
  current_academic_year: string;
}

// --- Audit Log ---

export interface AuditLogEntry {
  id: string;
  actor_type: ActorType;
  actor_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
  /** Joined from teachers table — present in API responses, not in DB directly */
  actor_name?: string;
}

// --- Student ---

export interface StudentDetail {
  id: string;
  /** V2: renamed from `name` */
  full_name: string;
  gender: Gender;
  grade: number;
  /** V2: letter section (e.g. "A", "B"), nullable for schools without parallels */
  section: string | null;
  avatar_url: string | null;
  /** V2: soft-delete flag */
  is_active: boolean;
  created_at: string;
}

export interface StudentRank {
  student_id: string;
  /** Display name — maps to `full_name` in DB */
  name: string;
  gender: Gender;
  grade: number;
  /** V2: letter section */
  section: string | null;
  avatar_url: string | null;
  total_score: number;
  academic_score: number;
  behavior_score: number;
  extracurricular_score: number;
  attendance_score: number;
  /** V2: number of qualifications in last 7 days */
  recent_activity_count: number;
  /** V1 compat — kept for existing components, will be replaced by rank delta */
  trend?: 'up' | 'down' | 'flat';
  /**
   * V2: Rank delta vs ~7 days ago (positive = moved up).
   * Used by Phase 11.4 rank delta chip.
   */
  rank_delta?: number;
}

// --- Qualification ---

export interface Qualification {
  id: string;
  student_id: string;
  /** V2: which teacher issued this qualification */
  teacher_id: string | null;
  category: 'Academic' | 'Behavior' | 'Extracurricular' | 'Attendance';
  subject: string | null;
  value: number;
  teacher_note: string | null;
  created_at: string;
}

// --- Badge ---

export interface Badge {
  type: BadgeType;
  icon: string;
  label: string;
  description: string;
}

/** Static badge definitions for display */
export const BADGE_DEFINITIONS: Record<BadgeType, Omit<Badge, 'type'>> = {
  hot_streak: {
    icon: '🔥',
    label: 'Hot Streak',
    description: '3+ consecutive days with positive points',
  },
  top_performer: {
    icon: '⭐',
    label: 'Top Performer',
    description: 'Highest score in their grade-section',
  },
  all_rounder: {
    icon: '🏆',
    label: 'All-Rounder',
    description: 'All 4 category scores above zero',
  },
  rising_star: {
    icon: '📈',
    label: 'Rising Star',
    description: 'Improved 5+ rank positions in the last 7 days',
  },
  new_student: {
    icon: '🆕',
    label: 'New',
    description: 'Added to the leaderboard in the last 7 days',
  },
};
