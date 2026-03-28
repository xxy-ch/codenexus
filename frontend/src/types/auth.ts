export interface LoginUser {
  id: string
  username: string
  email: string
  role: string
  school_id: number
  campus_id?: number | null
}

export interface RegisterUser {
  id: string
  user_code?: string | null
  username: string
  email?: string | null
  display_name?: string | null
  organization_id: number
  campus_id?: number | null
  role: string
  status: string
  ac_count: number
  contest_rating: number
  created_at: string
  updated_at: string
}

export interface SessionUser {
  id: string
  username: string
  email: string | null
  display_name?: string | null
  organization_id?: number
  campus_id?: number | null
  role: string
  user_code?: string | null
  status?: string
  ac_count?: number
  contest_rating?: number
  created_at?: string
  updated_at?: string
}

export interface User {
  id: string
  user_code?: string | null
  username: string
  email?: string | null
  display_name?: string | null
  organization_id: number
  campus_id?: number | null
  role: string
  status: string
  ac_count: number
  contest_rating: number
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

export interface LoginResponse {
  user: LoginUser
  token: string
  refresh_token: string
}

export interface RegisterResponse {
  user: RegisterUser
  token: string
  refresh_token: string
}

export interface RefreshResponse {
  token: string
  refresh_token?: string
}
