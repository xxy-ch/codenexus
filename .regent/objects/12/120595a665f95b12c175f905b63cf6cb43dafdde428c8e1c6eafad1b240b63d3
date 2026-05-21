import { useQuery } from '@tanstack/react-query'
import { usersService } from '@/services/users'
import { CheckCircle2, Circle, Map, Sparkles } from 'lucide-react'
import { CardGridSkeleton } from '@/components/skeletons/CardGridSkeleton'
import { InlineError } from '@/components/ui/InlineError'

const roadmapStages = [
  {
    id: 'basic',
    title: '基础算法',
    description: '掌握编程竞赛入门必备的数据结构基础',
    topics: ['数组', '字符串', '哈希表'],
    color: 'text-status-accepted',
    bg: 'bg-status-accepted/10',
    ring: 'ring-status-accepted/30',
    dot: 'bg-status-accepted',
  },
  {
    id: 'medium',
    title: '进阶技巧',
    description: '学习常用优化策略与区间操作方法',
    topics: ['二分', '滑动窗口', '前缀和'],
    color: 'text-primary',
    bg: 'bg-primary/10',
    ring: 'ring-primary/30',
    dot: 'bg-primary',
  },
  {
    id: 'advanced',
    title: '高级主题',
    description: '挑战高难度算法与复杂数据结构',
    topics: ['图论', '动态规划', '数据结构'],
    color: 'text-status-re',
    bg: 'bg-status-re/10',
    ring: 'ring-status-re/30',
    dot: 'bg-violet-500',
  },
]

export function LearningRoadmap() {
  const { data: stats, isLoading, error, refetch } = useQuery({
    queryKey: ['roadmap-stats'],
    queryFn: () => usersService.getUserStats(),
  })

  if (isLoading) {
    return <CardGridSkeleton cards={4} />
  }

  if (error || !stats) {
    return (
      <InlineError
        title="学习路线图加载失败"
        message="无法加载学习进度数据，请稍后重试"
        onRetry={() => refetch()}
      />
    )
  }

  const completion = Math.min(
    100,
    Math.round((stats.unique_problems_solved / Math.max(1, stats.unique_problems_solved + 40)) * 100)
  )

  return (
    <div className="space-y-8">
      {/* Hero header — warm editorial feel */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Map className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-card-foreground leading-relaxed">
              算法学习路线图
            </h1>
            <p className="text-sm font-normal text-muted-foreground leading-normal">
              根据你的做题进度动态建议下一阶段学习重点
            </p>
          </div>
        </div>
      </div>

      {/* Overall progress card */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-card-foreground">总体进度</span>
          </div>
          <span className="text-sm font-semibold text-primary tabular-nums">{completion}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${completion}%` }}
          />
        </div>
        <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
          已解决 {stats.unique_problems_solved} 题，继续加油
        </p>
      </div>

      {/* Step-by-step roadmap — visual progression with connecting line */}
      <div className="relative">
        {/* Vertical connecting line (desktop only) */}
        <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-border -translate-x-1/2" aria-hidden="true" />

        <div className="space-y-6 md:space-y-0 md:grid md:grid-cols-3 md:gap-6">
          {roadmapStages.map((stage, index) => {
            const stageDone = completion >= (index + 1) * 30
            const isCurrent = !stageDone && (index === 0 || completion >= index * 30)

            return (
              <div key={stage.id} className="relative">
                {/* Step number connector (desktop) */}
                <div className="hidden md:flex absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ring-2 transition-colors ${
                    stageDone
                      ? 'bg-primary text-primary-foreground ring-primary'
                      : isCurrent
                        ? 'bg-card text-primary ring-primary'
                        : 'bg-muted text-muted-foreground ring-border'
                  }`}>
                    {stageDone ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                </div>

                <div className={`rounded-xl border bg-card p-5 transition-shadow hover:shadow-sm ${
                  stageDone ? 'border-border' : isCurrent ? 'border-primary/40' : 'border-border'
                }`}>
                  {/* Step number (mobile) */}
                  <div className="flex md:hidden items-center gap-2 mb-3">
                    <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                      stageDone
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {stageDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}
                    </div>
                    <span className={`text-xs font-medium ${stageDone ? 'text-primary' : 'text-muted-foreground'}`}>
                      阶段 {index + 1}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-card-foreground leading-relaxed">
                        {stage.title}
                      </h3>
                      <p className="mt-0.5 text-sm font-normal text-muted-foreground leading-relaxed">
                        {stage.description}
                      </p>
                    </div>
                    <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full leading-none transition-colors ${
                      stageDone
                        ? 'bg-primary/10 text-primary'
                        : isCurrent
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-muted text-muted-foreground/60'
                    }`}>
                      {stageDone ? '已完成' : isCurrent ? '进行中' : '未开始'}
                    </span>
                  </div>

                  <ul className="mt-4 space-y-2">
                    {stage.topics.map((topic) => (
                      <li key={topic} className="flex items-center gap-2.5 text-sm text-muted-foreground leading-relaxed">
                        {stageDone ? (
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        ) : (
                          <Circle className={`h-4 w-4 shrink-0 ${isCurrent ? stage.dot : 'text-muted-foreground/40'}`} />
                        )}
                        <span className={stageDone ? 'text-card-foreground font-medium' : ''}>{topic}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

