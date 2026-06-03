import { useState, useEffect, useEffectEvent } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { problemsService } from '@/services/problemsService'
import { useToast } from '@/components/ui/Toast'
import StatusBadge from '@/components/ui/StatusBadge'

export default function OnlineIDE() {
  const { showToast } = useToast()
  const [problemId, setProblemId] = useState('')
  const [language, setLanguage] = useState('cpp')
  const [code, setCode] = useState('')
  const [output, setOutput] = useState('')
  const [activeTab, setActiveTab] = useState<'output' | 'testcases'>('output')
  const [lastSubmission, setLastSubmission] = useState<any>(null)

  const { data: languages } = useQuery({
    queryKey: ['languages'],
    queryFn: () => problemsService.getLanguages(),
  })

  const { data: problems } = useQuery({
    queryKey: ['problems-list'],
    queryFn: () => problemsService.list({ limit: 100 }),
  })

  const submitMutation = useMutation({
    mutationFn: (data: { problem_id: string; code: string; language: string }) =>
      problemsService.submit(data),
    onSuccess: (result) => {
      setLastSubmission(result)
      setActiveTab('testcases')
      showToast('提交成功', 'success')
    },
    onError: () => showToast('提交失败', 'error'),
  })

  const handleRun = () => {
    if (!code.trim()) {
      showToast('请输入代码', 'error')
      return
    }
    setOutput('运行中...')
    if (problemId) {
      submitMutation.mutate({ problem_id: problemId, code, language })
    } else {
      setOutput('请先选择题目')
    }
  }

  const handleShortcut = useEffectEvent((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleRun()
    }
  })

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      handleShortcut(e)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center gap-3 mb-4 p-3 card">
        <select
          className="input-field w-48 py-2"
          value={problemId}
          onChange={(e) => setProblemId(e.target.value)}
        >
          <option value="">选择题目...</option>
          {problems?.problems?.map((p: any) => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
        <select
          className="input-field w-40 py-2"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          {languages?.map((lang: any) => (
            <option key={lang.id} value={lang.name}>{lang.name}</option>
          ))}
        </select>
        <div className="flex-1" />
        <span className="text-xs text-on-surface-variant">Ctrl+Enter 运行</span>
        <button
          className="btn-secondary"
          onClick={handleRun}
          disabled={submitMutation.isPending}
        >
          {submitMutation.isPending ? '运行中...' : '运行'}
        </button>
        {problemId && (
          <button
            className="btn-primary"
            onClick={() => submitMutation.mutate({ problem_id: problemId, code, language })}
            disabled={submitMutation.isPending}
          >
            提交
          </button>
        )}
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        <div className="flex-1 card p-2">
          <textarea
            className="w-full h-full font-mono text-sm bg-surface-container-lowest resize-none focus:outline-none p-3"
            placeholder="// 在此输入代码"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
          />
        </div>
        <div className="w-2/5 card flex flex-col">
          <div className="flex border-b border-outline-variant">
            <button
              className={`px-4 py-2 text-sm font-medium ${activeTab === 'output' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant'}`}
              onClick={() => setActiveTab('output')}
            >
              输出
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium ${activeTab === 'testcases' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant'}`}
              onClick={() => setActiveTab('testcases')}
            >
              测试结果
            </button>
          </div>
          <div className="flex-1 overflow-auto p-3">
            {activeTab === 'output' ? (
              <pre className="font-mono text-sm text-on-surface whitespace-pre-wrap">{output || '等待运行...'}</pre>
            ) : lastSubmission ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-medium text-on-surface">总体结果:</span>
                  <StatusBadge status={lastSubmission.status} />
                </div>
                {lastSubmission.test_cases?.map((tc: any) => (
                  <div key={tc.id} className="flex items-center justify-between p-2 rounded bg-surface-container-low">
                    <span className="text-sm text-on-surface">用例 #{tc.id}</span>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={tc.status === 'passed' ? 'accepted' : tc.status === 'failed' ? 'wrong_answer' : 'pending'} />
                      {tc.time_ms && <span className="text-xs text-on-surface-variant">{tc.time_ms}ms</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-on-surface-variant">暂无测试结果</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
