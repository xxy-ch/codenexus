import { cn } from '@/lib/utils'

type SubmissionStatus =
  | 'judged'
  | 'accepted'
  | 'wrong_answer'
  | 'time_limit_exceeded'
  | 'memory_limit_exceeded'
  | 'compilation_error'
  | 'runtime_error'
  | 'pending'
  | 'running'
  | 'system_error'
  | 'queued'
  | 'failed'

type Difficulty = 'easy' | 'medium' | 'hard'

interface StatusBadgeProps {
  status: SubmissionStatus | string
  className?: string
}

interface DifficultyBadgeProps {
  difficulty: Difficulty
  className?: string
}

const submissionConfig: Record<SubmissionStatus, { label: string; bgColor: string; textColor: string }> = {
  judged: { label: 'Judged', bgColor: 'bg-slate-100', textColor: 'text-slate-700' },
  accepted: { label: 'Accepted', bgColor: 'bg-[#e4f7ee]', textColor: 'text-[#006847]' },
  wrong_answer: { label: 'Wrong Answer', bgColor: 'bg-[#ffdad6]', textColor: 'text-[#93000a]' },
  time_limit_exceeded: { label: 'Time Limit', bgColor: 'bg-[#fef3c7]', textColor: 'text-[#92400e]' },
  memory_limit_exceeded: { label: 'Memory Limit', bgColor: 'bg-[#fed7aa]', textColor: 'text-[#9a3412]' },
  compilation_error: { label: 'Compile Error', bgColor: 'bg-[#e9d5ff]', textColor: 'text-[#6b21a8]' },
  runtime_error: { label: 'Runtime Error', bgColor: 'bg-[#fbcfe8]', textColor: 'text-[#9d174d]' },
  pending: { label: 'Pending', bgColor: 'bg-slate-100', textColor: 'text-slate-700' },
  running: { label: 'Running', bgColor: 'bg-sky-50', textColor: 'text-sky-700' },
  system_error: { label: 'System Error', bgColor: 'bg-slate-200', textColor: 'text-slate-800' },
  queued: { label: 'Queued', bgColor: 'bg-slate-100', textColor: 'text-slate-600' },
  failed: { label: 'Failed', bgColor: 'bg-[#ffdad6]', textColor: 'text-[#93000a]' },
}

const fallbackConfig = {
  label: 'Unknown',
  bgColor: 'bg-slate-100',
  textColor: 'text-slate-700',
}

const difficultyConfig: Record<Difficulty, { bgColor: string; textColor: string }> = {
  easy: { bgColor: 'bg-[#e4f7ee]', textColor: 'text-[#006847]' },
  medium: { bgColor: 'bg-[#d5e3fc]', textColor: 'text-[#244171]' },
  hard: { bgColor: 'bg-[#ffdad6]', textColor: 'text-[#93000a]' },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = submissionConfig[status as SubmissionStatus] ?? fallbackConfig

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider',
        config.bgColor,
        config.textColor,
        className
      )}
    >
      {config.label}
    </span>
  )
}

export function DifficultyBadge({ difficulty, className }: DifficultyBadgeProps) {
  const config = difficultyConfig[difficulty]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider',
        config.bgColor,
        config.textColor,
        className
      )}
    >
      {difficulty}
    </span>
  )
}
