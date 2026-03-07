import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { classesService } from '@/services/classes'
import { Loading } from '@/components/ui/Loading'
import { cn } from '@/lib/utils'

export function ClassManagement() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const limit = 20

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['classes', page],
    queryFn: () => classesService.getClasses(page, limit),
  })

  const classes = data?.classes || []
  const total = data?.total || 0
  const totalPages = Math.max(1, Math.ceil(total / limit))

  const filteredClasses = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return classes
    return classes.filter((cls) =>
      [cls.name, cls.semester || '', String(cls.id)].some((value) =>
        value.toLowerCase().includes(keyword),
      ),
    )
  }, [classes, search])

  const totalStudents = classes.reduce((sum, cls) => sum + Number(cls.student_count || 0), 0)
  const avgStudents = classes.length > 0 ? Math.round(totalStudents / classes.length) : 0
  const latestSemester = classes.find((cls) => cls.semester)?.semester || '未设置'
  const highlightedClass = filteredClasses[0]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading message="加载班级中..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-600 dark:text-slate-300 mb-4">班级加载失败</p>
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <span>Classes</span>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span className="font-medium text-slate-900 dark:text-white">
              {highlightedClass?.name || 'Overview'}
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">班级管理</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            按当前 schema 展示班级 roster、规模和学期信息，未交付功能保持隐藏。
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="inline-flex items-center rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            <span className="material-symbols-outlined mr-2 text-base">archive</span>
            归档视图
          </button>
          <div className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm shadow-primary/20">
            <span className="material-symbols-outlined mr-2 text-base">school</span>
            当前共 {total} 个班级
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">班级总数</p>
          <div className="mt-2 flex items-end justify-between">
            <span className="text-2xl font-normal text-slate-900 dark:text-white">{total}</span>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
              当前页 {filteredClasses.length}
            </span>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">总学生数</p>
          <div className="mt-2 flex items-end justify-between">
            <span className="text-2xl font-normal text-slate-900 dark:text-white">{totalStudents}</span>
            <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-300">
              活跃 roster
            </span>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">平均班级规模</p>
          <div className="mt-2 flex items-end justify-between">
            <span className="text-2xl font-normal text-slate-900 dark:text-white">{avgStudents}</span>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
              students / class
            </span>
          </div>
        </div>
        <div className="rounded-lg border border-primary bg-gradient-to-br from-primary to-blue-700 p-4 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/80">最新学期</p>
          <div className="mt-2 flex items-start justify-between">
            <div>
              <div className="text-lg font-medium">{latestSemester}</div>
              <div className="mt-1 text-xs text-white/80">
                {highlightedClass ? `${highlightedClass.name} 已作为当前视图焦点` : '等待班级数据'}
              </div>
            </div>
            <span className="material-symbols-outlined text-4xl text-white/20">event_available</span>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="border-b border-slate-200 dark:border-slate-800">
          <nav className="-mb-px flex">
            {[
              ['班级名单', 'people'],
              ['作业概览', 'assignment'],
              ['趋势分析', 'analytics'],
              ['设置', 'settings'],
            ].map(([label, icon], index) => (
              <div
                key={label}
                className={cn(
                  'flex w-1/4 items-center justify-center gap-2 px-1 py-4 text-sm font-medium',
                  index === 0
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-slate-500 dark:text-slate-400',
                )}
              >
                <span className="material-symbols-outlined text-lg">{icon}</span>
                {label}
              </div>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-xs">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-base">search</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="筛选班级名称、学期或 ID..."
              className="block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 pl-10 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex items-center rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300"
            >
              <span className="material-symbols-outlined mr-2 text-sm">filter_list</span>
              Filter
            </button>
            <button
              type="button"
              className="inline-flex items-center rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300"
            >
              <span className="material-symbols-outlined mr-2 text-sm">file_upload</span>
              Export
            </button>
            <div className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white">
              <span className="material-symbols-outlined mr-2 text-sm">assignment_add</span>
              真实写路径未开放
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white dark:bg-slate-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">班级</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">学期</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">学生数</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">创建时间</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredClasses.map((cls) => (
                <tr key={cls.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{cls.name}</p>
                      <p className="mt-1 text-xs text-slate-500">Class ID #{cls.id}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                    {cls.semester || '未设置'}
                  </td>
                  <td className="px-4 py-4 text-right text-sm text-slate-700 dark:text-slate-300">
                    {cls.student_count ?? 0}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-300">
                    {new Date(cls.created_at).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-300">
                      roster ready
                    </span>
                  </td>
                </tr>
              ))}
              {filteredClasses.length === 0 && (
                <tr>
                  <td className="px-4 py-12 text-center text-sm text-slate-500" colSpan={5}>
                    暂无匹配的班级数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          disabled={page <= 1}
          className="rounded border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm disabled:opacity-50"
        >
          Prev
        </button>
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          disabled={page >= totalPages}
          className="rounded border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  )
}
