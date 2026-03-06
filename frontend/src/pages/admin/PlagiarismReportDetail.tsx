import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { plagiarismService } from '@/services/plagiarism'
import { Loading } from '@/components/ui/Loading'

export function PlagiarismReportDetail() {
  const { reportId } = useParams<{ reportId: string }>()
  const navigate = useNavigate()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['plagiarism-report-detail', reportId],
    queryFn: () => plagiarismService.getReportDetail(reportId!),
    enabled: !!reportId,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <Loading message="加载报告详情中..." />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-600 dark:text-slate-300 mb-4">报告详情加载失败</p>
        <div className="flex justify-center gap-2">
          <button type="button" onClick={() => refetch()} className="px-4 py-2 rounded bg-primary text-white">
            重试
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/plagiarism-reports')}
            className="px-4 py-2 rounded border border-slate-300 dark:border-slate-700"
          >
            返回列表
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">报告详情</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-mono">{data.id}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/admin/plagiarism-reports')}
          className="px-3 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-700"
        >
          返回
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs text-slate-500">状态</p>
          <p className="text-lg font-semibold mt-1">{data.status}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs text-slate-500">风险等级</p>
          <p className="text-lg font-semibold mt-1">{data.overall_risk}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs text-slate-500">提交总数</p>
          <p className="text-lg font-semibold mt-1">{data.total_submissions}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs text-slate-500">可疑提交对</p>
          <p className="text-lg font-semibold mt-1">{data.suspicious_pairs}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600 dark:text-slate-300">
          <p>创建时间：{new Date(data.created_at).toLocaleString('zh-CN')}</p>
          <p>完成时间：{data.finished_at ? new Date(data.finished_at).toLocaleString('zh-CN') : '-'}</p>
          <p>竞赛：{data.contest_id || '-'}</p>
          <p>作业：{data.assignment_id || '-'}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Top 可疑提交对</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-left">左侧提交</th>
              <th className="px-4 py-3 text-left">右侧提交</th>
              <th className="px-4 py-3 text-left">用户对</th>
              <th className="px-4 py-3 text-right">相似度</th>
              <th className="px-4 py-3 text-right">匹配行数</th>
            </tr>
          </thead>
          <tbody>
            {data.top_pairs.map((pair) => (
              <tr
                key={`${pair.left_submission_id}-${pair.right_submission_id}`}
                className="border-t border-slate-200 dark:border-slate-800"
              >
                <td className="px-4 py-3 font-mono text-xs">{pair.left_submission_id}</td>
                <td className="px-4 py-3 font-mono text-xs">{pair.right_submission_id}</td>
                <td className="px-4 py-3">{pair.left_user} vs {pair.right_user}</td>
                <td className="px-4 py-3 text-right">{(pair.similarity * 100).toFixed(1)}%</td>
                <td className="px-4 py-3 text-right">{pair.matched_lines}</td>
              </tr>
            ))}
            {data.top_pairs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-500">暂无可疑提交对</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
