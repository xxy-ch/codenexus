import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: 'accepted' | 'wrong_answer' | 'time_limit_exceeded' | 'memory_limit_exceeded' | 'compilation_error' | 'runtime_error' | 'pending' | 'running'
  className?: string
}

const statusConfig = {
  accepted: { label: 'Accepted', bgColor: 'bg-green-100 dark:bg-green-900/30', textColor: 'text-green-700 dark:text-green-400' },
  wrong_answer: { label: 'Wrong Answer', bgColor: 'bg-red-100 dark:bg-red-900/30', textColor: 'text-red-700 dark:text-red-400' },
  time_limit_exceeded: { label: 'Time Limit Exceeded', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30', textColor: 'text-yellow-700 dark:text-yellow-400' },
  memory_limit_exceeded: { label: 'Memory Limit Exceeded', bgColor: 'bg-orange-100 dark:bg-orange-900/30', textColor: 'text-orange-700 dark:text-orange-400' },
  compilation_error: { label: 'Compilation Error', bgColor: 'bg-purple-100 dark:bg-purple-900/30', textColor: 'text-purple-700 dark:text-purple-400' },
  runtime_error: { label: 'Runtime Error', bgColor: 'bg-pink-100 dark:bg-pink-900/30', textColor: 'text-pink-700 dark:text-pink-400' },
  pending: { label: 'Pending', bgColor: 'bg-gray-100 dark:bg-gray-900/30', textColor: 'text-gray-700 dark:text-gray-400' },
  running: { label: 'Running', bgColor: 'bg-blue-100 dark:bg-blue-900/30', textColor: 'text-blue-700 dark:text-blue-400' },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      config.bgColor,
      config.textColor,
      className
    )}>
      {config.label}
    </span>
  )
}