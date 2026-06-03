import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { problemsService } from '@/services/problemsService'
import Loading from '@/components/ui/Loading'
import Pagination from '@/components/ui/Pagination'
import StatusBadge from '@/components/ui/StatusBadge'

export default function SubmissionHistory() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [languageFilter, setLanguageFilter] = useState('')
  const limit = 20

  const { data, isLoading } = useQuery({
    queryKey: ['submissions', page, statusFilter, languageFilter],
    queryFn: () => problemsService.getSubmissions({ limit, offset: (page - 1) * limit, status: statusFilter || undefined, language: languageFilter || undefined }),
  })

  const submissions = data?.submissions ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / limit)
  const formatSubmissionId = (id: unknown) => String(id ?? '').slice(0, 8) || '-'
  const formatRuntime = (sub: any) => {
    const runtime = sub.runtime_ms ?? sub.time_ms
    return typeof runtime === 'number' ? `${runtime}ms` : '-'
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display font-bold text-2xl text-on-surface">提交记录</h1>

      <div className="flex flex-wrap gap-3">
        <select
          className="input-field w-40"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
        >
          <option value="">全部状态</option>
          <option value="accepted">Accepted</option>
          <option value="wrong_answer">Wrong Answer</option>
          <option value="time_limit_exceeded">TLE</option>
          <option value="compilation_error">CE</option>
          <option value="runtime_error">RTE</option>
        </select>
        <select
          className="input-field w-40"
          value={languageFilter}
          onChange={(e) => { setLanguageFilter(e.target.value); setPage(1) }}
        >
          <option value="">全部语言</option>
          <option value="C++">C++</option>
          <option value="Python">Python</option>
          <option value="Java">Java</option>
          <option value="C">C</option>
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
                  <th>#</th>
                  <th>题目</th>
                  <th>状态</th>
                  <th>语言</th>
                  <th>用时</th>
                  <th>内存</th>
                  <th>提交时间</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub: any) => (
                  <tr key={sub.id}>
                    <td className="text-on-surface-variant text-sm">{formatSubmissionId(sub.id)}</td>
                    <td className="text-on-surface">{sub.problem_title || sub.problem_id}</td>
                    <td><StatusBadge status={sub.status} /></td>
                    <td className="text-on-surface-variant text-sm">{sub.language}</td>
                    <td className="text-on-surface-variant text-sm">{formatRuntime(sub)}</td>
                    <td className="text-on-surface-variant text-sm">{sub.memory_kb ? `${sub.memory_kb}KB` : '-'}</td>
                    <td className="text-on-surface-variant text-sm">{new Date(sub.created_at).toLocaleString('zh-CN')}</td>
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
