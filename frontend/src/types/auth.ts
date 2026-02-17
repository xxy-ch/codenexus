export interface User {
  id: string
  email: string
  username: string
  first_name?: string
  last_name?: string
  role: 'user' | 'teacher' | 'admin'
  created_at: string
  updated_at: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  username: string
  password: string
  first_name?: string
  last_name?: string
}

export interface AuthResponse {
  user: User
  token: string
  refresh_token: string
}