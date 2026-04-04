export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
  endpoints: {
    login: '/auth/login',
    register: '/auth/register',
    refresh: '/auth/refresh',
    me: '/users/me',
    problems: '/problems',
    problemDetail: (id: string) => `/problems/${id}`,
    submissions: '/submissions',
    submissionDetail: (id: string) => `/submissions/${id}`,
    submissionStats: '/submissions/stats',
    contests: '/contests',
    contestDetail: (id: string) => `/contests/${id}`,
    ranking: '/leaderboard/global',
    discussions: '/discussions',
    discussionDetail: (id: string) => `/discussions/${id}`,
    blog: '/blog',
    blogDetail: (id: string) => `/blog/${id}`,
    adminStats: '/status',
    adminUsers: '/users/admin',
    adminProblems: '/problems',
    adminReports: '/admin/plagiarism/reports',
    adminSystemHealth: '/status',
    adminPlagiarismConfig: '/admin/plagiarism/config',
    adminPlagiarismScan: '/admin/plagiarism/scan',
    adminPlagiarismReports: '/admin/plagiarism/reports',
  },
} as const

export const FEATURE_FLAGS = {
  directMessages: import.meta.env.VITE_ENABLE_DIRECT_MESSAGES !== 'false',
  plagiarism: import.meta.env.VITE_ENABLE_PLAGIARISM !== 'false',
} as const

export const WS_CONFIG = {
  baseURL:
    import.meta.env.VITE_WS_BASE_URL ||
    `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`,
  endpoints: {
    submission: (id: string) => `/ws/submissions/${id}`,
    contest: (id: string) => `/ws/contests/${id}`,
    notifications: '/ws/notifications',
  },
} as const

export const ConnectionStatus = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
} as const

export type ConnectionStatus = (typeof ConnectionStatus)[keyof typeof ConnectionStatus]

export const STORAGE_KEYS = {
  TOKEN: 'oj_token',
  REFRESH_TOKEN: 'oj_refresh_token',
  USER: 'oj_user',
  THEME: 'oj_theme',
  LANGUAGE: 'oj_language',
} as const

export const SUBMISSION_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  ACCEPTED: 'accepted',
  WRONG_ANSWER: 'wrong_answer',
  TIME_LIMIT_EXCEEDED: 'time_limit_exceeded',
  MEMORY_LIMIT_EXCEEDED: 'memory_limit_exceeded',
  RUNTIME_ERROR: 'runtime_error',
  COMPILE_ERROR: 'compile_error',
  SYSTEM_ERROR: 'system_error',
} as const

export const PROBLEM_DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
} as const

export const PROBLEM_STATUS = {
  PUBLISHED: 'published',
  DRAFT: 'draft',
  ARCHIVED: 'archived',
} as const

export const CONTEST_STATUS = {
  NOT_STARTED: 'not_started',
  RUNNING: 'running',
  ENDED: 'ended',
} as const
