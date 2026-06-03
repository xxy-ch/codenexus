import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { problemsService } from '@/services/problemsService'
import { useToast } from '@/components/ui/Toast'
import Loading from '@/components/ui/Loading'
import StatusBadge from '@/components/ui/StatusBadge'

export default function ProblemDetail() {
  const { id } = useParams<{ id: string }>()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('cpp')
  const [activeTab, setActiveTab] = useState<'description' | 'submit'>('description')
  const [lastSubmission, setLastSubmission] = useState<any>(null)

  const { data: problem, isLoading: problemLoading } = useQuery({
    queryKey: ['problem', id],
    queryFn: () => problemsService.get(id!),
    enabled: !!id,
  })

  const { data: languages } = useQuery({
    queryKey: ['languages'],
    queryFn: () => problemsService.getLanguages(),
  })

  const submitMutation = useMutation({
    mutationFn: (data: { problem_id: string; code: string; language: string }) =>
      problemsService.submit(data),
    onSuccess: (result) => {
      setLastSubmission(result)
      showToast('提交成功', 'success')
      queryClient.invalidateQueries({ queryKey: ['recent-submissions'] })
    },
    onError: () => {
      showToast('提交失败，请重试', 'error')
    },
  })

  const handleSubmit = () => {
    if (!code.trim()) {
      showToast('请输入代码', 'error')
      return
    }
    if (!id) return
    submitMutation.mutate({ problem_id: id, code, language })
  }

  if (problemLoading) return <Loading />

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {problem ? (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <h1 className="font-display font-bold text-xl text-on-surface">{problem.title}</h1>
              <span className={`badge-${problem.difficulty}`}>
                {problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1)}
              </span>
            </div>

            <div className="flex gap-4 text-sm text-on-surface-variant">
              <span>时限: {problem.time_limit}ms</span>
              <span>内存: {problem.memory_limit}MB</span>
              <span>分值: {problem.points}</span>
            </div>

            <div className="flex gap-2">
              {problem.tags.map((tag) => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">
                  {tag}
                </span>
              ))}
            </div>

            <div
              className="prose prose-sm max-w-none text-on-surface"
              dangerouslySetInnerHTML={{ __html: problem.description }}
            />

            <div className="flex gap-3">
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'description'
                    ? 'bg-primary text-white'
                    : 'bg-surface-container text-on-surface-variant'
                }`}
                onClick={() => setActiveTab('description')}
              >
                题目描述
              </button>
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'submit'
                    ? 'bg-primary text-white'
                    : 'bg-surface-container text-on-surface-variant'
                }`}
                onClick={() => setActiveTab('submit')}
              >
                提交代码
              </button>
            </div>
          </div>
        ) : (
          <p className="text-on-surface-variant">题目不存在</p>
        )}
      </div>

      <div className="w-2/5 flex flex-col card p-4">
        <div className="flex items-center justify-between mb-3">
          <select
            className="input-field w-40 py-2"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            {languages?.map((lang) => (
              <option key={lang.id} value={lang.name}>
                {lang.name}
              </option>
            ))}
          </select>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
          >
            {submitMutation.isPending ? '提交中...' : '提交'}
          </button>
        </div>

        <textarea
          className="flex-1 w-full font-mono text-sm bg-surface-container-lowest border border-outline-variant rounded-lg p-4 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
          placeholder="在此输入代码..."
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
        />

        {lastSubmission && (
          <div className="mt-3 p-3 rounded-lg bg-surface-container-low">
            <div className="flex items-center gap-2">
              <span className="text-sm text-on-surface-variant">结果:</span>
              <StatusBadge status={lastSubmission.status} />
              {lastSubmission.time_ms && (
                <span className="text-sm text-on-surface-variant">{lastSubmission.time_ms}ms</span>
              )}
            </div>
            {lastSubmission.error_message && (
              <pre className="mt-2 text-xs text-error bg-error-container/30 p-2 rounded overflow-auto">
                {lastSubmission.error_message}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
