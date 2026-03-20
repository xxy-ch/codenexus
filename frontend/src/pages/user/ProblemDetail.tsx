import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, Clock3, Database, Layers3, Tag } from 'lucide-react'
import { useProblem } from '@/hooks/useProblems'
import { Button } from '@/components/ui/Button'
import { Loading } from '@/components/ui/Loading'
import { EmptyState } from '@/components/page/EmptyState'
import { MetaStrip } from '@/components/page/MetaStrip'
import { PageHeader } from '@/components/page/PageHeader'
import { SectionBlock } from '@/components/page/SectionBlock'
import { SurfaceCard } from '@/components/page/SurfaceCard'
import { cn } from '@/lib/utils'

const difficultyConfig = {
  easy: {
    label: 'Easy',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  medium: {
    label: 'Medium',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  hard: {
    label: 'Hard',
    className: 'border-rose-200 bg-rose-50 text-rose-700',
  },
} as const

export function ProblemDetail() {
  const { problemId } = useParams<{ problemId: string }>()
  const navigate = useNavigate()
  const { data: problem, isLoading, error } = useProblem(problemId ?? '')

  const paragraphs = useMemo(
    () =>
      (problem?.description || '')
        .split(/\n{2,}/)
        .map((item) => item.trim())
        .filter(Boolean),
    [problem?.description],
  )

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading message="加载题目详情..." />
      </div>
    )
  }

  if (error || !problem) {
    return (
      <EmptyState
        title="题目不存在"
        description="无法加载题目详情，请返回题库重新选择。"
        action={
          <Link to="/problems">
            <Button variant="primary">返回题库</Button>
          </Link>
        }
      />
    )
  }

  const difficulty = difficultyConfig[problem.difficulty]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Problem Detail"
        breadcrumb={['Problems', problem.title]}
        title={problem.title}
        description="题面阅读、约束信息和提交入口统一收在同一张 detail 画布里，减少无关装饰，保留实际判题所需信息。"
        actions={
          <>
            <Button variant="outline" onClick={() => navigate('/problems')} aria-label="返回题库">
              返回题库
            </Button>
            <Button variant="primary" onClick={() => navigate(`/problems/${problemId}/solve`)}>
              开始作答
              <ArrowRight className="h-4 w-4" />
            </Button>
          </>
        }
      />

      <MetaStrip
        items={[
          {
            label: 'Difficulty',
            value: difficulty.label,
            helper: '根据题目配置读取',
            icon: Layers3,
            tone:
              problem.difficulty === 'easy'
                ? 'success'
                : problem.difficulty === 'medium'
                  ? 'warning'
                  : 'danger',
          },
          {
            label: 'Time Limit',
            value: `${problem.time_limit} ms`,
            helper: '单次运行上限',
            icon: Clock3,
          },
          {
            label: 'Memory Limit',
            value: `${Math.round(problem.memory_limit / 1024)} MB`,
            helper: '按题目配置展示',
            icon: Database,
          },
          {
            label: 'Points',
            value: problem.points,
            helper: '通过后可获得分值',
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <div className="space-y-6">
          <SectionBlock
            title="题目描述"
            description="正文只展示真实题面内容，不再混入伪样例、伪提示和占位说明。"
          >
            <div className="space-y-4 text-sm leading-7 text-slate-700">
              {paragraphs.length > 0 ? (
                paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
              ) : (
                <p>暂无题面描述。</p>
              )}
            </div>
          </SectionBlock>

          <SectionBlock
            title="提交说明"
            description="进入工作区后按标准输入输出提交代码，使用题目配置中允许的语言进行判题。"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <SurfaceCard tone="muted" className="p-5">
                <div className="flex items-start gap-3">
                  <Clock3 className="mt-0.5 h-4 w-4 text-slate-500" />
                  <div>
                    <p className="text-sm font-semibold text-slate-950">时间限制</p>
                    <p className="mt-1 text-sm text-slate-600">
                      单次运行最长 {problem.time_limit} ms。
                    </p>
                  </div>
                </div>
              </SurfaceCard>
              <SurfaceCard tone="muted" className="p-5">
                <div className="flex items-start gap-3">
                  <Database className="mt-0.5 h-4 w-4 text-slate-500" />
                  <div>
                    <p className="text-sm font-semibold text-slate-950">内存限制</p>
                    <p className="mt-1 text-sm text-slate-600">
                      运行时可使用 {Math.round(problem.memory_limit / 1024)} MB 内存。
                    </p>
                  </div>
                </div>
              </SurfaceCard>
            </div>
          </SectionBlock>
        </div>

        <div className="space-y-6">
          <SectionBlock title="标签" description="题目关联的知识点和分类。">
            {problem.tags.length > 0 ? (
              <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {problem.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700"
                  >
                    <Tag className="h-3.5 w-3.5 text-slate-500" />
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">暂无标签。</p>
            )}
          </SectionBlock>

          <SurfaceCard className="space-y-4">
            <div className="flex items-start gap-3">
              <Layers3 className="mt-0.5 h-4 w-4 text-slate-500" />
              <div>
                <p className="text-sm font-semibold text-slate-950">解题入口</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  工作区保留题目与编辑器双栏结构，不预置模板代码，直接以标准输入输出提交。
                </p>
              </div>
            </div>
            <Button fullWidth variant="primary" onClick={() => navigate(`/problems/${problemId}/solve`)}>
              进入 IDE
            </Button>
          </SurfaceCard>
        </div>
      </div>
    </div>
  )
}
