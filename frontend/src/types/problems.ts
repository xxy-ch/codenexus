export interface Problem {
  id: string
  title: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard'
  tags: string[]
  time_limit: number
  memory_limit: number
  points: number
  input_format?: string
  output_format?: string
  constraints?: string
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
  status:
    | 'pending'
    | 'queued'
    | 'running'
    | 'judged'
    | 'accepted'
    | 'wrong_answer'
    | 'time_limit_exceeded'
    | 'memory_limit_exceeded'
    | 'compilation_error'
    | 'runtime_error'
    | 'system_error'
    | 'failed'
  time_ms?: number
  memory_kb?: number
  error_message?: string
  test_cases?: TestCaseResult[]
  created_at: string
  updated_at: string
}

export interface TestCaseResult {
  id: number
  input: string
  expected_output: string
  actual_output?: string
  status: 'passed' | 'failed' | 'pending' | 'running'
  error?: string
  time_ms?: number
}
