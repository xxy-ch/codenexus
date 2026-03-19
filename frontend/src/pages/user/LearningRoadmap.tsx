import { useQuery } from '@tanstack/react-query'
import { usersService } from '@/services/users'
import { EmptyState } from '@/components/page/EmptyState'
import { PageHeader } from '@/components/page/PageHeader'
import { StatCard } from '@/components/page/StatCard'
import { SurfaceCard } from '@/components/page/SurfaceCard'
import { Loading } from '@/components/ui/Loading'
import { cn } from '@/lib/utils'

const roadmapStages = [
  { id: 'basic', title: '基础算法', topics: ['数组', '字符串', '哈希表'] },
  { id: 'medium', title: '进阶技巧', topics: ['二分', '滑动窗口', '前缀和'] },
  { id: 'advanced', title: '高级主题', topics: ['图论', '动态规划', '数据结构'] },
]

export function LearningRoadmap() {
  const { data: stats, isLoading, error, refetch } = useQuery({
    queryKey: ['roadmap-stats'],
    queryFn: () => usersService.getUserStats(),
  })

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loading message="加载学习路线图..." />
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <EmptyState
          title="学习路线图加载失败"
          description="请稍后再试。"
          action={
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white"
            >
              重试
            </button>
          }
          className="w-full max-w-xl"
        />
      </div>
    )
  }

  const completion = Math.min(
    100,
    Math.round((stats.unique_problems_solved / Math.max(1, stats.unique_problems_solved + 40)) * 100),
  )

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Learning Path"
        title="算法学习路线图"
        description="根据你的做题进度动态建议下一阶段学习重点。页面以进度和阶段列表为主，不再额外引入复杂展示层。"
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="总体进度" value={`${completion}%`} helper="按已解决题目估算" />
        <StatCard label="已解决题目" value={`${stats.unique_problems_solved} 道`} helper="学习路径推进基数" />
        <StatCard label="当前连续学习" value={`${stats.current_streak} 天`} helper={`最高 ${stats.longest_streak} 天`} />
      </div>

      <SurfaceCard>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">总体进度</span>
          <span className="text-sm font-semibold text-slate-950">{completion}%</span>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-slate-950" style={{ width: `${completion}%` }} />
        </div>
      </SurfaceCard>

      <div className="grid gap-4 md:grid-cols-3">
        {roadmapStages.map((stage, index) => {
          const stageDone = completion >= (index + 1) * 30

          return (
            <SurfaceCard key={stage.id} tone={stageDone ? 'default' : 'muted'} className="p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-950">{stage.title}</h3>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-1 text-xs font-medium',
                    stageDone ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600',
                  )}
                >
                  {stageDone ? '已完成' : '进行中'}
                </span>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                {stage.topics.map((topic) => (
                  <li key={topic}>{topic}</li>
                ))}
              </ul>
            </SurfaceCard>
          )
        })}
      </div>
    </div>
  )
}
