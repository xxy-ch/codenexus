import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: 'accepted' | 'wrong_answer' | 'time_limit_exceeded' | 'memory_limit_exceeded' | 'compilation_error' | 'runtime_error' | 'pending' | 'running'
  className?: string
}

const statusConfig = {
  accepted: { label: 'Accepted', bgColor: 'bg-status-accepted/10', textColor: 'text-status-accepted' },
  wrong_answer: { label: 'Wrong Answer', bgColor: 'bg-destructive/10', textColor: 'text-destructive' },
  time_limit_exceeded: { label: 'Time Limit Exceeded', bgColor: 'bg-status-tle/10', textColor: 'text-status-tle' },
  memory_limit_exceeded: { label: 'Memory Limit Exceeded', bgColor: 'bg-status-tle/10', textColor: 'text-status-tle' },
  compilation_error: { label: 'Compilation Error', bgColor: 'bg-status-re/10', textColor: 'text-status-re' },
  runtime_error: { label: 'Runtime Error', bgColor: 'bg-destructive/10', textColor: 'text-destructive' },
  pending: { label: 'Pending', bgColor: 'bg-secondary dark:bg-secondary', textColor: 'text-muted-foreground' },
  running: { label: 'Running', bgColor: 'bg-status-pending/10', textColor: 'text-status-pending' },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span className={cn(
      'text-badge inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
      config.bgColor,
      config.textColor,
      className
    )}>
      {config.label}
    </span>
  )
}