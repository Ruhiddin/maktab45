export type AuthRole = 'admin' | 'teacher';

export interface AuthToken {
  role: AuthRole;
  teacher_id?: string;
  exp?: number;
  iat?: number;
}

export interface PublicSettings {
  school_name: string;
  current_academic_year: string;
}
