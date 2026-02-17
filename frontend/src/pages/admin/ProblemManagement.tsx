import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { adminService } from '@/services/admin'
import { Button } from '@/components/ui/Button'
import { Loading } from '@/components/ui/Loading'
import { cn } from '@/lib/utils'

type DifficultyType = 'easy' | 'medium' | 'hard'
type SortType = 'recent' | 'title' | 'submissions' | 'acceptance'

const DIFFICULTY_CONFIG = {
  easy: { label: '简单', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  medium: { label: '中等', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  hard: { label: '困难', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
}

export function ProblemManagement() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [difficulty, setDifficulty] = useState<string>('all')
  const [status, setStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortType>('recent')
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = useQuery({
    queryKey: ['adminProblems', search, difficulty, status, sortBy, page],
    queryFn: () => adminService.getProblems({
      search: search || undefined,
      difficulty: difficulty === 'all' ? undefined : (difficulty as DifficultyType),
      status: status === 'all' ? undefined : status,
      sort: sortBy,
      page,
      limit: 20,
    }),
  })

  const toggleVisibilityMutation = useMutation({
    mutationFn: (problemId: string) => adminService.toggleProblemVisibility(problemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminProblems'] })
    },
  })

  if (isLoading) return <Loading message="加载中..." />
  if (error) return <div className="text-center py-12">加载失败</div>

  const problems = data?.problems || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / 20)

  const getDifficultyBadge = (difficulty: DifficultyType) => {
    const config = DIFFICULTY_CONFIG[difficulty]
    return (
      <span className={cn('px-2 py-1 rounded text-xs font-medium', config.color)}>
        {config.label}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">题目管理</h1>
          <p className="text-sm text-slate-600">管理题库和发布状态</p>
        </div>
        <Link to="/admin/problems/new">
          <Button variant="primary">
            <span className="material-symbols-outlined mr-2">add</span>
            创建题目
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <input
              type="search"
              placeholder="搜索题目标题、ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          {/* Difficulty Filter */}
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">所有难度</option>
            <option value="easy">简单</option>
            <option value="medium">中等</option>
            <option value="hard">困难</option>
          </select>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">所有状态</option>
            <option value="published">已发布</option>
            <option value="draft">草稿</option>
            <option value="archived">已归档</option>
          </select>
        </div>

        <div className="flex items-center gap-4 mt-4">
          <span className="text-sm text-slate-600">排序：</span>
          <div className="flex gap-2">
            {[
              { value: 'recent', label: '最新' },
              { value: 'title', label: '标题' },
              { value: 'submissions', label: '提交数' },
              { value: 'acceptance', label: '通过率' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setSortBy(option.value as SortType)}
                className={cn(
                  'px-3 py-1 rounded text-sm transition-colors',
                  sortBy === option.value
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Problems Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">题目</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">难度</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">统计</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">通过率</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {problems.map((problem) => {
                const acceptanceRate = problem.submissions_count > 0
                  ? Math.round((problem.accepted_count / problem.submissions_count) * 100)
                  : 0

                return (
                  <tr key={problem.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4">
                      <div>
                        <Link
                          to={`/problems/${problem.id}`}
                          className="font-medium hover:text-primary transition-colors"
                        >
                          {problem.id}. {problem.title}
                        </Link>
                        <p className="text-sm text-slate-500 mt-1 line-clamp-1">
                          {problem.tags.slice(0, 3).join(', ')}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getDifficultyBadge(problem.difficulty)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'px-2 py-1 rounded text-xs font-medium',
                          problem.status === 'published' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                          problem.status === 'draft' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                          problem.status === 'archived' && 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                        )}
                      >
                        {problem.status === 'published' ? '已发布' : problem.status === 'draft' ? '草稿' : '已归档'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p>{problem.submissions_count} 提交</p>
                        <p className="text-slate-500">{problem.accepted_count} 通过</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              acceptanceRate >= 50 ? 'bg-green-500' : acceptanceRate >= 30 ? 'bg-yellow-500' : 'bg-red-500'
                            )}
                            style={{ width: `${acceptanceRate}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{acceptanceRate}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Link to={`/admin/problems/${problem.id}/edit`}>
                          <Button variant="outline" size="sm">
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleVisibilityMutation.mutate(problem.id)}
                          disabled={toggleVisibilityMutation.isPending}
                        >
                          <span className="material-symbols-outlined text-sm">
                            {problem.status === 'published' ? 'visibility_off' : 'visibility'}
                          </span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {problems.length === 0 && (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-6xl text-slate-400 mb-4">search_off</span>
            <p className="text-lg font-semibold text-slate-900 dark:text-white mb-2">未找到题目</p>
            <p className="text-sm text-slate-600">尝试调整搜索条件</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            上一页
          </Button>
          <span className="px-4 py-2 text-sm text-slate-600">
            第 {page} / {totalPages} 页
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            下一页
          </Button>
        </div>
      )}
    </div>
  )
}
