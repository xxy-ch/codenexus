export interface Problem {
  id: string
  title: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard'
  tags: string[]
  time_limit: number
  memory_limit: number
  points: number
  created_at: string
  updated_at: string
}

export interface TestCase {
  id: string
  problem_id: string
  input: string
  expected_output: string
  is_hidden: boolean
  order: number
}

export interface ProblemSubmission {
  id: string
  problem_id: string
  user_id: string
  code: string
  language: string
  status: 'pending' | 'running' | 'accepted' | 'wrong_answer' | 'time_limit_exceeded' | 'memory_limit_exceeded' | 'runtime_error' | 'compilation_error' | 'system_error'
  time_ms?: number
  memory_kb?: number
  error_message?: string
  test_cases?: Array<{
    id: number
    input: string
    expected_output: string
    actual_output?: string
    status: 'passed' | 'failed' | 'pending' | 'running'
    error?: string
    time_ms?: number
  }>
  created_at: string
  updated_at: string
}

export interface Language {
  id: string
  name: string
  extension: string
  enabled: boolean
  is_default: boolean
}
