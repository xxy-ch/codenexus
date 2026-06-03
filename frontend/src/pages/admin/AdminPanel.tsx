import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { problemsService } from '@/services/problemsService'
import { contestsService } from '@/services/contestsService'
import Loading from '@/components/ui/Loading'
import Pagination from '@/components/ui/Pagination'

export default function AdminPanel() {
  const [tab, setTab] = useState<'overview' | 'problems' | 'contests'>('overview')
  const [problemPage, setProblemPage] = useState(1)
  const [contestPage, setContestPage] = useState(1)
  const limit = 10

  const { data: problems, isLoading: problemsLoading } = useQuery({
    queryKey: ['admin-problems', problemPage],
    queryFn: () => problemsService.list({ page: problemPage, limit }),
  })

  const { data: contests, isLoading: contestsLoading } = useQuery({
    queryKey: ['admin-contests', contestPage],
    queryFn: () => contestsService.list({ page: contestPage, limit }),
  })

  const loading = problemsLoading || contestsLoading

  return (
    <div className="space-y-6">
      <h1 className="font-display font-bold text-2xl text-on-surface">管理面板</h1>

      <div className="flex gap-2">
        {([['overview', '概览'], ['problems', '题目管理'], ['contests', '竞赛管理']] as const).map(([key, label]) => (
          <button
            key={key}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant'
            }`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <Loading />
      ) : (
        <>
          {tab === 'overview' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card p-6">
                <p className="text-sm text-on-surface-variant mb-1">用户总数</p>
                <p className="font-display font-bold text-3xl text-primary">-</p>
              </div>
              <div className="card p-6">
                <p className="text-sm text-on-surface-variant mb-1">题目总数</p>
                <p className="font-display font-bold text-3xl text-primary">{problems?.total ?? 0}</p>
              </div>
              <div className="card p-6">
                <p className="text-sm text-on-surface-variant mb-1">提交总数</p>
                <p className="font-display font-bold text-3xl text-primary">-</p>
              </div>
              <div className="card p-6">
                <p className="text-sm text-on-surface-variant mb-1">竞赛总数</p>
                <p className="font-display font-bold text-3xl text-primary">{contests?.total ?? 0}</p>
              </div>
            </div>
          )}

          {tab === 'problems' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button className="btn-primary">创建题目</button>
              </div>
              <div className="card overflow-hidden">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>题目</th>
                      <th>难度</th>
                      <th>时限</th>
                      <th>内存</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {problems?.problems?.map((p: any) => (
                      <tr key={p.id}>
                        <td className="text-on-surface-variant text-sm">{p.id.slice(0, 8)}</td>
                        <td className="text-on-surface">{p.title}</td>
                        <td><span className={`badge-${p.difficulty}`}>{p.difficulty}</span></td>
                        <td className="text-on-surface-variant text-sm">{p.time_limit}ms</td>
                        <td className="text-on-surface-variant text-sm">{p.memory_limit}MB</td>
                        <td>
                          <div className="flex gap-2">
                            <button className="text-sm text-primary hover:underline">编辑</button>
                            <button className="text-sm text-error hover:underline">删除</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {problems && problems.total > limit && (
                <Pagination currentPage={problemPage} totalPages={Math.ceil(problems.total / limit)} onPageChange={setProblemPage} />
              )}
            </div>
          )}

          {tab === 'contests' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button className="btn-primary">创建竞赛</button>
              </div>
              <div className="card overflow-hidden">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>竞赛</th>
                      <th>状态</th>
                      <th>开始时间</th>
                      <th>结束时间</th>
                      <th>参赛人数</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contests?.contests?.map((c: any) => (
                      <tr key={c.id}>
                        <td className="text-on-surface font-medium">{c.title}</td>
                        <td><span className={`badge-${c.status === 'running' ? 'accepted' : c.status === 'ended' ? 'compilation' : 'pending'}`}>{c.status}</span></td>
                        <td className="text-on-surface-variant text-sm">{new Date(c.start_time).toLocaleDateString('zh-CN')}</td>
                        <td className="text-on-surface-variant text-sm">{new Date(c.end_time).toLocaleDateString('zh-CN')}</td>
                        <td className="text-on-surface-variant text-sm">{c.participants ?? 0}</td>
                        <td>
                          <div className="flex gap-2">
                            <button className="text-sm text-primary hover:underline">编辑</button>
                            <button className="text-sm text-error hover:underline">删除</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {contests && contests.total > limit && (
                <Pagination currentPage={contestPage} totalPages={Math.ceil(contests.total / limit)} onPageChange={setContestPage} />
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
