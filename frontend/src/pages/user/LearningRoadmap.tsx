import { useQuery } from '@tanstack/react-query'
import { usersService } from '@/services/users'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'

const roadmapStages = [
  { id: 'basic', title: '基础打底', topics: ['数组', '字符串', '哈希表'] },
  { id: 'medium', title: '提速训练', topics: ['二分', '滑动窗口', '前缀和'] },
  { id: 'advanced', title: '高阶攻坚', topics: ['图论', '动态规划', '数据结构'] },
]

export function LearningRoadmap() {
  const { data: stats, isLoading, error, refetch } = useQuery({
    queryKey: ['roadmap-stats'],
    queryFn: () => usersService.getUserStats(),
  })

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <LoadingState message="加载学习路线图..." />
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-6 md:px-8">
        <EmptyState
          title="学习路线图暂不可用"
          description="请稍后重新拉取统计数据。"
          action={{ label: '重新拉取', onClick: () => refetch() }}
        />
      </div>
    )
  }

  const completion = Math.min(
    100,
    Math.round((stats.unique_problems_solved / Math.max(1, stats.unique_problems_solved + 40)) * 100),
  )

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8 space-y-6">
      {/* Page Header */}
      <div className="max-w-3xl space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
          个人 / 学习
        </p>
        <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface md:text-5xl">
          学习路线图
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-on-surface-variant">
          按当前做题进度给出下一阶段学习重点，便于从题库直接推进到竞赛训练。
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card variant="surface" className="p-5">
          <p className="text-sm font-medium text-on-surface-variant">当前路线完成度</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-on-surface">{completion}%</p>
          <p className="mt-2 text-sm text-on-surface-variant">按已解决题目估算</p>
        </Card>
        <Card variant="surface" className="p-5">
          <p className="text-sm font-medium text-on-surface-variant">已解决题目</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-primary">{stats.unique_problems_solved} 道</p>
          <p className="mt-2 text-sm text-on-surface-variant">学习路径推进基数</p>
        </Card>
        <Card variant="surface" className="p-5">
          <p className="text-sm font-medium text-on-surface-variant">当前连续学习</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-secondary">{stats.current_streak} 天</p>
          <p className="mt-2 text-sm text-on-surface-variant">最高 {stats.longest_streak} 天</p>
        </Card>
      </div>

      {/* Progress Card */}
      <Card variant="surface" className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-on-surface">总体进度</span>
          <span className="text-sm font-semibold text-on-surface">{completion}%</span>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-surface-container-high">
          <div className="h-full rounded-full bg-primary" style={{ width: `${completion}%` }} />
        </div>
      </Card>

      {/* Next Steps */}
      <Card variant="surface" className="p-5">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-2xl text-tertiary">lightbulb</span>
          <div>
            <p className="text-sm font-medium text-on-surface">下一步建议</p>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              {completion < 34
                ? '先补齐数组、字符串和哈希表基础题。'
                : completion < 67
                  ? '继续推进二分、滑动窗口和前缀和。'
                  : '可以直接进入图论、动态规划和数据结构专题。'}
            </p>
          </div>
        </div>
      </Card>

      {/* Roadmap Stages */}
      <div className="grid gap-4 md:grid-cols-3">
        {roadmapStages.map((stage, index) => {
          const stageDone = completion >= (index + 1) * 30

          return (
            <Card key={stage.id} variant={stageDone ? 'default' : 'surface'} className="p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-on-surface">{stage.title}</h3>
                <span
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-semibold',
                    stageDone ? 'bg-tertiary text-on-tertiary' : 'bg-surface-container-high text-on-surface-variant',
                  )}
                >
                  {stageDone ? '已完成' : '进行中'}
                </span>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-on-surface-variant">
                {stage.topics.map((topic) => (
                  <li key={topic} className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">
                      {stageDone ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                    {topic}
                  </li>
                ))}
              </ul>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
