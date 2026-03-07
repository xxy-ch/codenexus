export interface User {
  id: string
  email: string
  username: string
  display_name?: string
  organization_id?: number
  campus_id?: number | null
  role: 'user' | 'teacher' | 'admin'
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
