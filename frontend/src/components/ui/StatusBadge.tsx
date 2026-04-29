import { cn } from '@/lib/utils'

type SubmissionStatus =
  | 'accepted'
  | 'wrong_answer'
  | 'time_limit_exceeded'
  | 'memory_limit_exceeded'
  | 'compilation_error'
  | 'runtime_error'
  | 'pending'
  | 'running'

interface StatusBadgeProps {
  status: SubmissionStatus
  className?: string
}

const statusConfig: Record<SubmissionStatus, {
  label: string
  bgColor: string
  textColor: string
  borderColor: string
  dotColor: string
}> = {
  accepted: {
    label: 'Accepted',
    bgColor: 'bg-status-accepted/10',
    textColor: 'text-status-accepted',
    borderColor: 'border-status-accepted/20',
    dotColor: 'bg-status-accepted',
  },
  wrong_answer: {
    label: 'Wrong Answer',
    bgColor: 'bg-destructive/10',
    textColor: 'text-destructive',
    borderColor: 'border-destructive/20',
    dotColor: 'bg-destructive',
  },
  time_limit_exceeded: {
    label: 'Time Limit Exceeded',
    bgColor: 'bg-status-tle/10',
    textColor: 'text-status-tle',
    borderColor: 'border-status-tle/20',
    dotColor: 'bg-status-tle',
  },
  memory_limit_exceeded: {
    label: 'Memory Limit Exceeded',
    bgColor: 'bg-status-tle/10',
    textColor: 'text-status-tle',
    borderColor: 'border-status-tle/20',
    dotColor: 'bg-status-tle',
  },
  compilation_error: {
    label: 'Compilation Error',
    bgColor: 'bg-status-re/10',
    textColor: 'text-status-re',
    borderColor: 'border-status-re/20',
    dotColor: 'bg-status-re',
  },
  runtime_error: {
    label: 'Runtime Error',
    bgColor: 'bg-destructive/10',
    textColor: 'text-destructive',
    borderColor: 'border-destructive/20',
    dotColor: 'bg-destructive',
  },
  pending: {
    label: 'Pending',
    bgColor: 'bg-muted/60',
    textColor: 'text-muted-foreground',
    borderColor: 'border-border/50',
    dotColor: 'bg-muted-foreground',
  },
  running: {
    label: 'Running',
    bgColor: 'bg-status-pending/10',
    textColor: 'text-status-pending',
    borderColor: 'border-status-pending/20',
    dotColor: 'bg-status-pending',
  },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span
      className={cn(
        'text-badge inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold border',
        'transition-all duration-200',
        config.bgColor,
        config.textColor,
        config.borderColor,
        className
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full shrink-0',
          config.dotColor,
          status === 'running' && 'animate-pulse',
          status === 'pending' && 'animate-pulse'
        )}
      />
      {config.label}
    </span>
  )
}
