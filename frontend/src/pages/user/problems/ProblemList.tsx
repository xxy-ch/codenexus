import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { problemsService } from '@/services/problemsService'
import Loading from '@/components/ui/Loading'
import Pagination from '@/components/ui/Pagination'

export default function ProblemList() {
  const [page, setPage] = useState(1)
  const [difficulty, setDifficulty] = useState<string>('')
  const [search, setSearch] = useState('')
  const limit = 20

  const { data, isLoading } = useQuery({
    queryKey: ['problems', page, difficulty, search],
    queryFn: () => problemsService.list({ page, limit, difficulty, search }),
  })

  const totalPages = Math.ceil((data?.total ?? 0) / limit)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-bold text-2xl text-on-surface">题库</h1>
        <span className="text-sm text-on-surface-variant">共 {data?.total ?? 0} 题</span>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          className="input-field w-64"
          placeholder="搜索题目..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
        />
        <select
          className="input-field w-40"
          value={difficulty}
          onChange={(e) => { setDifficulty(e.target.value); setPage(1) }}
        >
          <option value="">全部难度</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      {isLoading ? (
        <Loading />
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-16">#</th>
                  <th>题目</th>
                  <th className="w-24">难度</th>
                  <th className="w-32">标签</th>
                  <th className="w-20">通过率</th>
                  <th className="w-20">时限</th>
                  <th className="w-20">内存</th>
                </tr>
              </thead>
              <tbody>
                {data?.problems.map((problem) => (
                  <tr key={problem.id}>
                    <td className="text-on-surface-variant text-sm">{problem.id.slice(0, 8)}</td>
                    <td>
                      <Link to={`/problems/${problem.id}`} className="text-primary font-medium hover:underline">
                        {problem.title}
                      </Link>
                    </td>
                    <td>
                      <span className={`badge-${problem.difficulty}`}>
                        {problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1)}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {problem.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="text-on-surface-variant text-sm">-</td>
                    <td className="text-on-surface-variant text-sm">{problem.time_limit}ms</td>
                    <td className="text-on-surface-variant text-sm">{problem.memory_limit}MB</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          )}
        </>
      )}
    </div>
  )
}
