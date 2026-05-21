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
  bgColor: 'bg-secondary',
  textColor: 'text-muted-foreground',
  borderColor: 'border-border',
  icon: 'help',
  iconColor: 'text-muted-foreground',
}

export const SUBMISSION_STATUS_CONFIG: Record<SubmissionStatus, SubmissionStatusConfig> = {
  pending: {
    label: 'Pending',
    bgColor: 'bg-secondary',
    textColor: 'text-muted-foreground',
    borderColor: 'border-border',
    icon: 'schedule',
    iconColor: 'text-muted-foreground',
  },
  queued: {
    label: 'Queued',
    bgColor: 'bg-status-pending/10',
    textColor: 'text-status-pending',
    borderColor: 'border-status-pending/20',
    icon: 'hourglass_top',
    iconColor: 'text-status-pending',
  },
  running: {
    label: 'Running',
    bgColor: 'bg-status-pending/10',
    textColor: 'text-status-pending',
    borderColor: 'border-status-pending/20',
    icon: 'sync',
    iconColor: 'text-status-pending',
  },
  judged: {
    label: 'Judged',
    bgColor: 'bg-status-accepted/10',
    textColor: 'text-status-accepted',
    borderColor: 'border-status-accepted/20',
    icon: 'task_alt',
    iconColor: 'text-status-accepted',
  },
  accepted: {
    label: 'Accepted',
    bgColor: 'bg-status-accepted/10',
    textColor: 'text-status-accepted',
    borderColor: 'border-status-accepted/20',
    icon: 'check_circle',
    iconColor: 'text-status-accepted',
  },
  wrong_answer: {
    label: 'Wrong Answer',
    bgColor: 'bg-destructive/10',
    textColor: 'text-destructive',
    borderColor: 'border-destructive/20',
    icon: 'cancel',
    iconColor: 'text-destructive',
  },
  time_limit_exceeded: {
    label: 'Time Limit Exceeded',
    bgColor: 'bg-status-tle/10',
    textColor: 'text-status-tle',
    borderColor: 'border-status-tle/20',
    icon: 'timer',
    iconColor: 'text-status-tle',
  },
  memory_limit_exceeded: {
    label: 'Memory Limit Exceeded',
    bgColor: 'bg-status-tle/10',
    textColor: 'text-status-tle',
    borderColor: 'border-status-tle/20',
    icon: 'memory',
    iconColor: 'text-status-tle',
  },
  compilation_error: {
    label: 'Compilation Error',
    bgColor: 'bg-status-re/10',
    textColor: 'text-status-re',
    borderColor: 'border-status-re/20',
    icon: 'error',
    iconColor: 'text-status-re',
  },
  runtime_error: {
    label: 'Runtime Error',
    bgColor: 'bg-destructive/10',
    textColor: 'text-destructive',
    borderColor: 'border-destructive/20',
    icon: 'warning',
    iconColor: 'text-destructive',
  },
  system_error: {
    label: 'System Error',
    bgColor: 'bg-destructive/10',
    textColor: 'text-destructive',
    borderColor: 'border-destructive/20',
    icon: 'report',
    iconColor: 'text-destructive',
  },
  failed: {
    label: 'Failed',
    bgColor: 'bg-destructive/10',
    textColor: 'text-destructive',
    borderColor: 'border-destructive/20',
    icon: 'error',
    iconColor: 'text-destructive',
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
