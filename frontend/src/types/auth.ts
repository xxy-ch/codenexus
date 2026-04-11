/** Canonical runtime roles — must match shared/src/models/role.rs with camelCase serialization */
export type Role =
  | 'root'
  | 'organizationAdmin'
  | 'campusAdmin'
  | 'teacher'
  | 'teachingAssistant'
  | 'student'

/** Roles that grant admin panel access */
export const ADMIN_ROLES: readonly Role[] = ['root', 'organizationAdmin', 'campusAdmin']

/** Roles that grant teacher-level feature access */
export const TEACHER_ROLES: readonly Role[] = ['root', 'organizationAdmin', 'campusAdmin', 'teacher']

export function isAdmin(role: Role): boolean {
  return (ADMIN_ROLES as readonly string[]).includes(role)
}

export function isTeacherOrAbove(role: Role): boolean {
  return (TEACHER_ROLES as readonly string[]).includes(role)
}

/** Human-readable label for each role */
export function roleLabel(role: Role): string {
  switch (role) {
    case 'root': return '超级管理员'
    case 'organizationAdmin': return '机构管理员'
    case 'campusAdmin': return '校区管理员'
    case 'teacher': return '教师'
    case 'teachingAssistant': return '助教'
    case 'student': return '学生'
  }
}

export interface User {
  id: string
  user_code?: string | null
  username: string
  email?: string | null
  display_name?: string | null
  organization_id: number
  campus_id?: number | null
  role: Role
  status: string
  created_at: string
  updated_at: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  user_code?: string
  username: string
  password: string
  email?: string
  display_name?: string
  organization_id: number
  campus_id?: number | null
}

export interface AuthResponse {
  user: User
  token: string
  refresh_token: string
}
