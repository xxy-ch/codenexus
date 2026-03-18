import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: 'accepted' | 'wrong_answer' | 'time_limit_exceeded' | 'memory_limit_exceeded' | 'compilation_error' | 'runtime_error' | 'pending' | 'running'
  className?: string
}

const statusConfig = {
  accepted: { label: 'Accepted', bgColor: 'bg-emerald-50 dark:bg-emerald-950/40', textColor: 'text-emerald-700 dark:text-emerald-300' },
  wrong_answer: { label: 'Wrong Answer', bgColor: 'bg-rose-50 dark:bg-rose-950/40', textColor: 'text-rose-700 dark:text-rose-300' },
  time_limit_exceeded: { label: 'Time Limit Exceeded', bgColor: 'bg-amber-50 dark:bg-amber-950/40', textColor: 'text-amber-700 dark:text-amber-300' },
  memory_limit_exceeded: { label: 'Memory Limit Exceeded', bgColor: 'bg-orange-50 dark:bg-orange-950/40', textColor: 'text-orange-700 dark:text-orange-300' },
  compilation_error: { label: 'Compilation Error', bgColor: 'bg-violet-50 dark:bg-violet-950/40', textColor: 'text-violet-700 dark:text-violet-300' },
  runtime_error: { label: 'Runtime Error', bgColor: 'bg-fuchsia-50 dark:bg-fuchsia-950/40', textColor: 'text-fuchsia-700 dark:text-fuchsia-300' },
  pending: { label: 'Pending', bgColor: 'bg-slate-100 dark:bg-slate-800', textColor: 'text-slate-700 dark:text-slate-300' },
  running: { label: 'Running', bgColor: 'bg-sky-50 dark:bg-sky-950/40', textColor: 'text-sky-700 dark:text-sky-300' },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span className={cn(
      'inline-flex items-center rounded-full border border-current/10 px-2.5 py-0.5 text-xs font-medium',
      config.bgColor,
      config.textColor,
      className
    )}>
      {config.label}
    </span>
  )
}
