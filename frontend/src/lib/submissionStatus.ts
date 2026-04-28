export type SubmissionStatus =
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

type SubmissionStatusConfig = {
  label: string
  bgColor: string
  textColor: string
  borderColor?: string
  icon: string
  iconColor?: string
}

const DEFAULT_STATUS_CONFIG: SubmissionStatusConfig = {
  label: 'Unknown',
  bgColor: 'bg-slate-100 dark:bg-slate-800',
  textColor: 'text-slate-600 dark:text-slate-400',
  borderColor: 'border-slate-300 dark:border-slate-700',
  icon: 'help',
  iconColor: 'text-slate-400',
}

export const SUBMISSION_STATUS_CONFIG: Record<SubmissionStatus, SubmissionStatusConfig> = {
  pending: {
    label: 'Pending',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    textColor: 'text-slate-600 dark:text-slate-400',
    borderColor: 'border-slate-300 dark:border-slate-700',
    icon: 'schedule',
    iconColor: 'text-slate-400',
  },
  queued: {
    label: 'Queued',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    textColor: 'text-indigo-700 dark:text-indigo-300',
    borderColor: 'border-indigo-300 dark:border-indigo-700',
    icon: 'hourglass_top',
    iconColor: 'text-indigo-500',
  },
  running: {
    label: 'Running',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-700 dark:text-blue-400',
    borderColor: 'border-blue-300 dark:border-blue-700',
    icon: 'sync',
    iconColor: 'text-blue-500',
  },
  judged: {
    label: 'Judged',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    borderColor: 'border-emerald-300 dark:border-emerald-700',
    icon: 'task_alt',
    iconColor: 'text-emerald-500',
  },
  accepted: {
    label: 'Accepted',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-700 dark:text-green-400',
    borderColor: 'border-green-300 dark:border-green-700',
    icon: 'check_circle',
    iconColor: 'text-green-500',
  },
  wrong_answer: {
    label: 'Wrong Answer',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
    borderColor: 'border-red-300 dark:border-red-700',
    icon: 'cancel',
    iconColor: 'text-red-500',
  },
  time_limit_exceeded: {
    label: 'Time Limit Exceeded',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    textColor: 'text-yellow-700 dark:text-yellow-400',
    borderColor: 'border-yellow-300 dark:border-yellow-700',
    icon: 'timer',
    iconColor: 'text-yellow-500',
  },
  memory_limit_exceeded: {
    label: 'Memory Limit Exceeded',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    textColor: 'text-orange-700 dark:text-orange-400',
    borderColor: 'border-orange-300 dark:border-orange-700',
    icon: 'memory',
    iconColor: 'text-orange-500',
  },
  compilation_error: {
    label: 'Compilation Error',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    textColor: 'text-purple-700 dark:text-purple-400',
    borderColor: 'border-purple-300 dark:border-purple-700',
    icon: 'error',
    iconColor: 'text-purple-500',
  },
  runtime_error: {
    label: 'Runtime Error',
    bgColor: 'bg-pink-100 dark:bg-pink-900/30',
    textColor: 'text-pink-700 dark:text-pink-400',
    borderColor: 'border-pink-300 dark:border-pink-700',
    icon: 'warning',
    iconColor: 'text-pink-500',
  },
  system_error: {
    label: 'System Error',
    bgColor: 'bg-rose-100 dark:bg-rose-900/30',
    textColor: 'text-rose-700 dark:text-rose-300',
    borderColor: 'border-rose-300 dark:border-rose-700',
    icon: 'report',
    iconColor: 'text-rose-500',
  },
  failed: {
    label: 'Failed',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-300',
    borderColor: 'border-red-300 dark:border-red-700',
    icon: 'error',
    iconColor: 'text-red-500',
  },
}

export function getSubmissionStatusConfig(status?: string): SubmissionStatusConfig {
  if (!status) {
    return DEFAULT_STATUS_CONFIG
  }

  return SUBMISSION_STATUS_CONFIG[status as SubmissionStatus] ?? {
    ...DEFAULT_STATUS_CONFIG,
    label: status.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
  }
}
