import { useQuery } from '@tanstack/react-query'
import { classesService } from '@/services/classes'
import { Loading } from '@/components/ui/Loading'

export function AssignmentReport() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['assignment-report-classes'],
    queryFn: () => classesService.getClasses(1, 10),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[360px]">
        <Loading message="加载作业报告..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-600 dark:text-slate-300 mb-4">作业报告加载失败</p>
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

  const classes = data?.classes || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">作业表现分析</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          基于当前班级数据的提交与完成度概览
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-sm text-slate-500">班级数</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{classes.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-sm text-slate-500">总学生数</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {classes.reduce((sum, cls) => sum + Number(cls.student_count || 0), 0)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-sm text-slate-500">平均班级规模</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {classes.length > 0
              ? Math.round(
                  classes.reduce((sum, cls) => sum + Number(cls.student_count || 0), 0) / classes.length
                )
              : 0}
          </p>
        </div>
      </div>
    </div>
  )
}

