export interface User {
  id: string
  user_code: string
  username: string
  email: string
  role: 'user' | 'teacher' | 'admin' | 'root'
  avatar?: string
  rating?: number
  organization_id?: string
  campus_id?: string
  created_at: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
  organization_id?: string
  campus_id?: string
}

export interface LoginResponse {
  token: string
  refresh_token: string
  user: User
}

export interface RegisterResponse {
  token: string
  refresh_token: string
  user: User
}

export interface RefreshResponse {
  token: string
  refresh_token?: string
}
