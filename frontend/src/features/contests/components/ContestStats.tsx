import { Clock, Timer, Code2, Trophy } from 'lucide-react'

interface ContestStatsProps {
  startTime: string
  durationMinutes: number
  problemsCount: number
  participantsCount: number
}

export function ContestStats({ startTime, durationMinutes, problemsCount, participantsCount }: ContestStatsProps) {
  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      return mins > 0 ? `${hours}小时 ${mins}分钟` : `${hours}小时`
    }
    return `${minutes}分钟`
  }

  const stats = [
    {
      icon: Clock,
      label: '开始时间',
      value: new Date(startTime).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      iconColor: 'text-primary',
      bgClass: 'bg-primary/10 border-primary/20',
    },
    {
      icon: Timer,
      label: '竞赛时长',
      value: formatDuration(durationMinutes),
      iconColor: 'text-difficulty-medium',
      bgClass: 'bg-difficulty-medium/10 border-difficulty-medium/20',
    },
    {
      icon: Code2,
      label: '题目数量',
      value: `${problemsCount} 题`,
      iconColor: 'text-status-accepted',
      bgClass: 'bg-status-accepted/10 border-status-accepted/20',
    },
    {
      icon: Trophy,
      label: '参与人数',
      value: `${participantsCount} 人`,
      iconColor: 'text-difficulty-hard',
      bgClass: 'bg-difficulty-hard/10 border-difficulty-hard/20',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <div key={stat.label} className="surface-card-hover p-4 text-center backdrop-blur-xl">
            <div className={`mx-auto mb-2 w-fit rounded-xl ${stat.bgClass} border p-2`}>
              <Icon className={`w-5 h-5 ${stat.iconColor}`} />
            </div>
            <p className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground font-medium">{stat.label}</p>
            <p className="mt-1.5 text-sm font-bold tabular-nums text-foreground">{stat.value}</p>
          </div>
        )
      })}
    </div>
  )
}
