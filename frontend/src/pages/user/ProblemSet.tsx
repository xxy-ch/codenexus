import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { SurfaceCard } from '@/components/page/SurfaceCard'
import { cn } from '@/lib/utils'
import { useProblems } from '@/hooks/useProblems'

const difficultyTone: Record<string, string> = {
  easy: 'bg-[#e4f7ee] text-[#006847]',
  medium: 'bg-[#d5e3fc] text-[#244171]',
  hard: 'bg-[#ffdad6] text-[#93000a]',
}

const difficultyLabel: Record<string, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
}

function formatTagSummary(tags: string[]) {
  if (tags.length === 0) {
    return '综合训练'
  }

  return tags.slice(0, 2).join(' · ')
}

export function ProblemSet() {
  const { data, isLoading, isError, refetch } = useProblems({ limit: 20 })
  const problems = data?.problems ?? []
  const dailyChallenge = problems[0] ?? null
  const total = data?.total ?? problems.length
  const page = data?.page ?? 1
  const pages = data?.pages ?? 1

  const difficultyCounts = useMemo(() => {
    return problems.reduce(
      (acc, problem) => {
        acc[problem.difficulty] += 1
        return acc
      },
      { easy: 0, medium: 0, hard: 0 },
    )
  }, [problems])

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>()

    problems.forEach((problem) => {
      problem.tags.forEach((tag) => {
        counts.set(tag, (counts.get(tag) ?? 0) + 1)
      })
    })

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
  }, [problems])

  const renderTableBody = () => {
    if (isLoading) {
      return (
        <tbody className="bg-white">
          <tr>
            <td colSpan={6} className="px-6 py-8 text-center text-sm text-[#667896]">
              正在加载题目...
            </td>
          </tr>
        </tbody>
      )
    }

    if (isError) {
      return (
        <tbody className="bg-white">
          <tr>
            <td colSpan={6} className="px-6 py-8 text-center">
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm text-[#7d5260]">题目列表加载失败。</p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="inline-flex h-12 items-center justify-center rounded-[16px] bg-[linear-gradient(135deg,#003d9b,#0052cc)] px-5 text-sm font-semibold text-white"
                >
                  重试
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      )
    }

    if (problems.length === 0) {
      return (
        <tbody className="bg-white">
          <tr>
            <td colSpan={6} className="px-6 py-8 text-center text-sm text-[#667896]">
              暂无可展示题目。
            </td>
          </tr>
        </tbody>
      )
    }

    return (
      <tbody className="divide-y divide-[#edf0fb] bg-white">
        {problems.map((problem) => (
          <tr key={problem.id} className="group transition-colors hover:bg-[rgba(242,243,255,0.68)]">
            <td className="px-6 py-4 align-middle">
              <span className="material-symbols-outlined text-[#b9c7df]" aria-hidden="true">
                circle
              </span>
            </td>
            <td className="px-4 py-4 align-middle text-sm font-mono text-[#667896]">#{problem.id}</td>
            <td className="px-4 py-4 align-middle">
              <div className="min-w-0">
                <Link
                  to={`/problems/${problem.id}`}
                  className="block truncate text-sm font-semibold text-[#131b2e] transition-colors group-hover:text-[#003d9b]"
                >
                  {problem.title}
                </Link>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6b7ca7]">
                  {formatTagSummary(problem.tags)}
                </p>
              </div>
            </td>
            <td className="px-4 py-4 align-middle">
              <span
                className={cn(
                  'inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]',
                  difficultyTone[problem.difficulty] ?? difficultyTone.easy,
                )}
              >
                {difficultyLabel[problem.difficulty] ?? problem.difficulty}
              </span>
            </td>
            <td className="px-4 py-4 align-middle text-sm font-medium text-[#445472]">{problem.points} 分</td>
            <td className="px-6 py-4 align-middle text-right">
              <Link to={`/problems/${problem.id}`} className="text-sm font-semibold text-[#003d9b]">
                进入
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    )
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#6b7ca7]">题库</p>
            <h1 className="font-['Manrope'] text-[2rem] font-extrabold tracking-[-0.04em] text-[#131b2e] md:text-[2.5rem]">算法挑战</h1>
            <p className="max-w-2xl text-sm leading-6 text-[#5f6d87]">
              按统一题库流浏览练习题目，直接进入做题、查看标签与难度分布。
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <SurfaceCard className="min-w-[168px] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#6b7ca7]">题库总量</p>
              <div className="mt-3 font-['Manrope'] text-[2rem] font-extrabold tracking-[-0.05em] text-[#131b2e]">
                {total}
              </div>
              <p className="mt-2 text-sm text-[#65748d]">
                第 {page} 页 / 共 {pages} 页
              </p>
            </SurfaceCard>

            <SurfaceCard className="min-w-[168px] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#6b7ca7]">当前展示</p>
              <div className="mt-3 font-['Manrope'] text-[2rem] font-extrabold tracking-[-0.05em] text-[#131b2e]">
                {problems.length} 题
              </div>
              <p className="mt-2 text-sm text-[#65748d]">
                按当前筛选加载
              </p>
            </SurfaceCard>
          </div>
        </div>

        <section className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="inline-flex h-12 items-center rounded-full bg-[linear-gradient(135deg,#003d9b,#0052cc)] px-5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(0,61,155,0.18)]"
          >
            全部方向
          </button>
          <button
            type="button"
            className="inline-flex h-12 items-center rounded-full bg-[rgba(226,231,255,0.88)] px-5 text-sm font-semibold text-[#445472]"
          >
            动态规划
          </button>
          <button
            type="button"
            className="inline-flex h-12 items-center rounded-full bg-[rgba(226,231,255,0.88)] px-5 text-sm font-semibold text-[#445472]"
          >
            图论
          </button>
          <button
            type="button"
            className="inline-flex h-12 items-center rounded-full bg-[rgba(226,231,255,0.88)] px-5 text-sm font-semibold text-[#445472]"
          >
            数学
          </button>
          <button
            type="button"
            className="inline-flex h-12 items-center rounded-full bg-[rgba(226,231,255,0.88)] px-5 text-sm font-semibold text-[#445472]"
          >
            字符串
          </button>
          <button
            type="button"
            className="ml-auto inline-flex h-12 items-center gap-1 rounded-full px-4 text-sm font-semibold text-[#003d9b] transition-colors hover:bg-[rgba(226,231,255,0.58)]"
          >
            展开筛选
            <span className="material-symbols-outlined text-sm" aria-hidden="true">keyboard_arrow_down</span>
          </button>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <SurfaceCard className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-[#f2f3ff]">
                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-[#6b7ca7]">状态</th>
                    <th className="px-4 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-[#6b7ca7]">编号</th>
                    <th className="px-4 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-[#6b7ca7]">题目名称</th>
                    <th className="px-4 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-[#6b7ca7]">难度</th>
                    <th className="px-4 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-[#6b7ca7]">分值</th>
                    <th className="px-6 py-4 text-right text-[11px] font-black uppercase tracking-[0.2em] text-[#6b7ca7]">操作</th>
                  </tr>
                </thead>
                {renderTableBody()}
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-[#edf0fb] bg-[rgba(242,243,255,0.68)] px-6 py-4 text-sm text-[#65748d] lg:flex-row lg:items-center lg:justify-between">
              <span>
                共 {total} 题，当前显示 {problems.length} 题
              </span>
              <div className="flex items-center gap-2">
                <button type="button" className="h-8 w-8 rounded border border-[#c3c6d6] text-[#6b7ca7]">‹</button>
                <button type="button" className="h-8 w-8 rounded bg-[#003d9b] text-white">1</button>
                <button type="button" className="h-8 w-8 rounded border border-[#c3c6d6] text-[#445472]">2</button>
                <button type="button" className="h-8 w-8 rounded border border-[#c3c6d6] text-[#445472]">3</button>
                <button type="button" className="h-8 w-8 rounded border border-[#c3c6d6] text-[#6b7ca7]">›</button>
              </div>
            </div>
          </SurfaceCard>

          <div className="space-y-6">
            <SurfaceCard tone="muted" className="overflow-hidden bg-[linear-gradient(135deg,#0d47a1,#0052cc)] text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#b2c5ff]">每日挑战</p>
              <h2 className="mt-3 font-['Manrope'] text-[1.7rem] font-extrabold tracking-[-0.04em] text-white">
                {dailyChallenge?.title ?? '今日推荐正在生成'}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#eef0ff]">
                {dailyChallenge
                  ? dailyChallenge.description || '根据最新题目流推荐一题，适合直接开始今天的训练。'
                  : '题目数据加载完成后，这里会显示新的推荐题目。'}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {(dailyChallenge?.tags ?? []).slice(0, 3).map((tag) => (
                  <span key={tag} className="rounded-full bg-white/12 px-3 py-1 text-[11px] font-semibold text-[#eef0ff]">
                    {tag}
                  </span>
                ))}
              </div>
              <Link
                to={dailyChallenge ? `/problems/${dailyChallenge.id}` : '/problems'}
                className="mt-5 inline-flex rounded-[8px] bg-white px-4 py-2.5 text-sm font-semibold text-[#003d9b]"
              >
                立即开始
              </Link>
            </SurfaceCard>

            <SurfaceCard tone="muted">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-['Manrope'] text-[1.3rem] font-extrabold tracking-[-0.03em] text-[#131b2e]">学习计划</h2>
                  <p className="mt-1 text-sm text-[#65748d]">按当前题库流拆出的三步训练。</p>
                </div>
                <span className="rounded-full bg-white/92 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6b7ca7]">本周</span>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm text-[#17305e]">
                    <span>简单题复盘</span>
                    <span>{difficultyCounts.easy} 题</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-white/80">
                    <div className="h-1.5 rounded-full bg-[#003d9b]" style={{ width: `${Math.min(100, Math.max(12, difficultyCounts.easy * 12))}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm text-[#17305e]">
                    <span>中等题推进</span>
                    <span>{difficultyCounts.medium} 题</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-white/80">
                    <div className="h-1.5 rounded-full bg-[#244171]" style={{ width: `${Math.min(100, Math.max(12, difficultyCounts.medium * 12))}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm text-[#17305e]">
                    <span>标签梳理</span>
                    <span>{tagCounts.length} 个重点方向</span>
                  </div>
                  <div className="mt-2 space-y-2">
                    {tagCounts.length > 0 ? (
                      tagCounts.map(([tag, count]) => (
                        <div key={tag} className="flex items-center justify-between rounded-[8px] bg-white/92 px-3 py-2 text-sm text-[#445472]">
                          <span>{tag}</span>
                          <span>{count} 题</span>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[8px] bg-white/92 px-3 py-3 text-sm text-[#65748d]">当前没有标签数据。</div>
                    )}
                  </div>
                </div>
              </div>
            </SurfaceCard>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProblemSet
