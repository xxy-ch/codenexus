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

/** Student-safe test case view — no input/output data exposed */
export interface PublicTestCase {
  id: string
  problem_id: string
  is_hidden: false
  order: number
}

/** Management test case view — full data including hidden cases */
export interface ManagementTestCase {
  id: string
  problem_id: string
  input: string
  expected_output: string
  is_hidden: boolean
  order: number
  score: number
}

/** @deprecated Use PublicTestCase or ManagementTestCase explicitly */
export type TestCase = ManagementTestCase

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

/** Test case result in a submission — student-safe for non-hidden cases */
export interface TestCaseResult {
  id: number
  status: 'passed' | 'failed' | 'pending' | 'running'
  time_ms?: number
  memory_kb?: number
  error?: string
  is_hidden?: boolean
  /** Only populated for non-hidden test cases */
  input?: string
  /** Only populated for non-hidden test cases */
  expected_output?: string
  actual_output?: string
}
