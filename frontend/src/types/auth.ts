/** Canonical runtime roles — must match shared/src/models/role.rs */
export type Role =
  | 'root'
  | 'organizationadmin'
  | 'campusadmin'
  | 'teacher'
  | 'teachingassistant'
  | 'student'

/** Roles that grant admin panel access */
export const ADMIN_ROLES: readonly Role[] = ['root', 'organizationadmin', 'campusadmin']

/** Roles that grant teacher-level feature access */
export const TEACHER_ROLES: readonly Role[] = ['root', 'organizationadmin', 'campusadmin', 'teacher']

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
    case 'organizationadmin': return '机构管理员'
    case 'campusadmin': return '校区管理员'
    case 'teacher': return '教师'
    case 'teachingassistant': return '助教'
    case 'student': return '学生'
  }
}

export interface User {
  id: string
  email: string
  username: string
  display_name?: string
  organization_id?: number
  campus_id?: number | null
  role: Role
  created_at: string
  updated_at: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  email?: string
  username: string
  password: string
  display_name?: string
  organization_id: number
  campus_id?: number | null
}

export interface AuthResponse {
  user: User
  token: string
  refresh_token: string
}
