import { useQuery } from '@tanstack/react-query'
import { usersService } from '@/services/users'
import { Loading } from '@/components/ui/Loading'

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
      <div className="flex items-center justify-center min-h-[320px]">
        <Loading message="加载学习路线图..." />
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-600 dark:text-slate-300 mb-4">学习路线图加载失败</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="px-4 py-2 rounded bg-primary text-white"
        >
          重试
        </button>
      </div>
    )
  }

  const completion = Math.min(
    100,
    Math.round((stats.unique_problems_solved / Math.max(1, stats.unique_problems_solved + 40)) * 100)
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">算法学习路线图</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          根据你的做题进度动态建议下一阶段学习重点
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-600 dark:text-slate-300">总体进度</span>
          <span className="text-sm font-semibold text-slate-900 dark:text-white">{completion}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
          <div className="h-full bg-primary" style={{ width: `${completion}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {roadmapStages.map((stage, index) => {
          const stageDone = completion >= (index + 1) * 30
          return (
            <div
              key={stage.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900 dark:text-white">{stage.title}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${stageDone ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                  {stageDone ? '已完成' : '进行中'}
                </span>
              </div>
              <ul className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                {stage.topics.map((topic) => (
                  <li key={topic}>- {topic}</li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}

