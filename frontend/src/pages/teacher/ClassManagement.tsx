import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { classesService } from '@/services/classes'
import { Loading } from '@/components/ui/Loading'

export function ClassManagement() {
  const [page, setPage] = useState(1)
  const limit = 20

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['classes', page],
    queryFn: () => classesService.getClasses(page, limit),
  })

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

  const classes = data?.classes || []
  const total = data?.total || 0
  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">班级管理</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">共 {total} 个班级</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">班级</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">描述</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">学生数</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">邀请码</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {classes.map((cls) => (
                <tr key={cls.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">
                    {cls.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                    {cls.description || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-slate-700 dark:text-slate-300">
                    {cls.student_count ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                    {cls.enrollment_code || '-'}
                  </td>
                </tr>
              ))}
              {classes.length === 0 && (
                <tr>
                  <td className="px-4 py-12 text-center text-sm text-slate-500" colSpan={4}>
                    暂无班级数据
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
          className="px-3 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-700 disabled:opacity-50"
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
          className="px-3 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-700 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  )
}

