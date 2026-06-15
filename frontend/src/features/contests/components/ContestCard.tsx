import { Link } from 'react-router-dom'
import { Button } from '@/shared/components/Button'
import { cn } from '@/shared/lib/utils'
import { Clock, UserCheck, BarChart3, Flame, Zap } from 'lucide-react'

export interface ContestCardData {
  id: string
  name: string
  description: string
  start_time: string
  end_time: string
  duration_minutes: number
  status: 'upcoming' | 'ongoing' | 'completed'
  participants_count: number
  problems_count: number
  difficulty: 'easy' | 'medium' | 'hard'
  created_at: string
}

const STATUS_CONFIG = {
  upcoming: {
    label: '即将开始',
    bgColor: 'bg-primary/10 border border-primary/20',
    textColor: 'text-primary',
    glow: '',
  },
  ongoing: {
    label: '进行中',
    bgColor: 'bg-status-accepted/10 border border-status-accepted/20',
    textColor: 'text-status-accepted',
    glow: 'animate-pulse',
  },
  completed: {
    label: '已结束',
    bgColor: 'bg-muted border border-border/60',
    textColor: 'text-muted-foreground',
    glow: '',
  },
}

const DIFFICULTY_CONFIG = {
  easy: { label: '简单', bgColor: 'bg-status-accepted/10 border border-status-accepted/20', textColor: 'text-status-accepted' },
  medium: { label: '中等', bgColor: 'bg-difficulty-medium/10 border border-difficulty-medium/20', textColor: 'text-difficulty-medium' },
  hard: { label: '困难', bgColor: 'bg-difficulty-hard/10 border border-difficulty-hard/20', textColor: 'text-difficulty-hard' },
}

const STATUS_ICON: Record<string, React.FC<{ className?: string }>> = {
  upcoming: ({ className }) => <Clock className={className} />,
  ongoing: ({ className }) => <Zap className={className} />,
  completed: ({ className }) => <BarChart3 className={className} />,
}

function formatDuration(minutes: number) {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }
  return `${minutes}m`
}

function getCountdown(startTime: string) {
  const now = new Date()
  const start = new Date(startTime)
  const diff = start.getTime() - now.getTime()
  if (diff <= 0) return null
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  if (days > 0) return `${days}天${hours}小时`
  if (hours > 0) return `${hours}小时${minutes}分钟`
  return `${minutes}分钟`
}

function getRemainingTime(endTime: string) {
  const now = new Date()
  const end = new Date(endTime)
  const diff = end.getTime() - now.getTime()
  if (diff <= 0) return '已结束'
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  return `剩余 ${hours}h ${minutes}m`
}

export function ContestCard({ contest }: { contest: ContestCardData }) {
  const statusConfig = STATUS_CONFIG[contest.status]
  const difficultyConfig = DIFFICULTY_CONFIG[contest.difficulty]
  const countdown = contest.status === 'upcoming' ? getCountdown(contest.start_time) : null
  const remaining = contest.status === 'ongoing' ? getRemainingTime(contest.end_time) : null
  const isLive = contest.status === 'ongoing'
  const StatusIcon = STATUS_ICON[contest.status]

  return (
    <Link
      key={contest.id}
      to={`/contests/${contest.id}`}
      className="relative block bg-background/60 backdrop-blur-xl border border-border/40 rounded-xl overflow-hidden glass-interactive hover-lift transition-card-hover"
    >
      {isLive && (
        <div className="h-[2px] bg-gradient-to-r from-status-accepted via-primary to-status-accepted animate-pulse" />
      )}
      <div className="p-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center flex-wrap gap-2.5">
              <h3 className="text-base font-bold text-foreground tracking-tight hover:text-primary transition-colors">{contest.name}</h3>
              <span className={cn('rounded-full px-2.5 py-0.5 text-[13px] font-semibold', difficultyConfig.bgColor, difficultyConfig.textColor)}>{difficultyConfig.label}</span>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{contest.description}</p>
          </div>
          <span className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-bold tracking-wide self-start sm:self-auto', statusConfig.bgColor, statusConfig.textColor, statusConfig.glow)}>
            <StatusIcon className="w-3.5 h-3.5" />
            {statusConfig.label}
          </span>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { label: '时长', value: formatDuration(contest.duration_minutes) },
            { label: '题目', value: String(contest.problems_count) },
            { label: '参与', value: String(contest.participants_count) },
            { label: '日期', value: new Date(contest.start_time).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border/40 bg-muted/40 px-3 py-2.5 text-center">
              <p className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground font-medium">{stat.label}</p>
              <p className="mt-1 text-base font-extrabold tabular-nums text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Countdown or Timer */}
        {(countdown || remaining) && (
          <div className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold font-mono tracking-wide',
            contest.status === 'upcoming' ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-status-accepted/5 border-status-accepted/20 text-status-accepted'
          )}>
            {isLive ? <Zap className="w-4 h-4 text-status-accepted animate-bounce" /> : <Clock className="w-4 h-4" />}
            {countdown && `距开始还有 ${countdown}`}
            {remaining && remaining}
          </div>
        )}

        {/* Action Button */}
        <div className="mt-5 flex items-center justify-between border-t border-border/30 pt-4">
          <div className="text-[13px] text-muted-foreground font-semibold">
            {new Date(contest.start_time).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </div>
          <Button variant={isLive ? 'primary' : 'outline'} size="sm" className="button-press font-bold px-4">
            {contest.status === 'ongoing' && (<><Flame className="w-4 h-4 mr-2 text-amber-400 animate-pulse" />立即加入</>)}
            {contest.status === 'upcoming' && (<><UserCheck className="w-4 h-4 mr-2" />立即注册</>)}
            {contest.status === 'completed' && (<><BarChart3 className="w-4 h-4 mr-2" />查看结果</>)}
          </Button>
        </div>
      </div>
    </Link>
  )
}
