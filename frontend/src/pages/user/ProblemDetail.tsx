import { Bookmark, ChevronRight, Edit3, Rocket } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SurfaceCard } from '@/components/page/SurfaceCard'
import { cn } from '@/lib/utils'

const insights = [
  { label: '难度', value: '困难', tone: 'bg-[#006847] text-white' },
  { label: '通过率', value: '34.8%' },
  { label: '命题人', value: '建筑算法教研组', accent: 'text-[#003d9b]' },
  { label: '收录时间', value: '2023 年 10 月 24 日' },
]

const relatedProblems = [
  {
    title: '直方图最大矩形',
    difficulty: '简单',
    difficultyTone: 'text-[#006847]',
    description: '经典单调栈题，适合作为本题的前置训练。',
  },
  {
    title: '区间树合并',
    difficulty: '中等',
    difficultyTone: 'text-[#003d9b]',
    description: '处理重叠坐标与区间覆盖，帮助理解轮廓切分。',
  },
  {
    title: '二维范围求和',
    difficulty: '进阶',
    difficultyTone: 'text-[#93000a]',
    description: '进一步训练空间划分与区域查询能力。',
  },
]

export function ProblemDetail() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8 lg:py-10">
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.75fr)_360px] xl:gap-12">
        <article className="space-y-10">
          <header className="space-y-5">
            <nav className="flex flex-wrap items-center gap-2 text-sm font-medium text-[#667896]">
              <span>题库</span>
              <ChevronRight className="h-4 w-4" />
              <span>动态规划</span>
              <ChevronRight className="h-4 w-4" />
              <span className="font-bold text-[#003d9b]">1042. 天际线切分</span>
            </nav>

            <div className="space-y-4">
              <h1 className="font-['Manrope'] text-[2.5rem] font-extrabold leading-tight tracking-[-0.05em] text-[#131b2e] md:text-[3.2rem]">
                天际线切分优化
              </h1>
              <div className="max-w-4xl space-y-4 text-[15px] leading-8 text-[#4f5f7b] md:text-[17px]">
                <p>
                  给定一组建筑轮廓，请把最终形成的城市天际线切分成最少的不相交矩形区域，并满足结构稳定性约束。
                </p>
                <p>
                  每栋建筑由三个整数 <code className="rounded bg-[#e9eeff] px-1.5 py-0.5 text-[#003d9b]">L</code>、
                  <code className="rounded bg-[#e9eeff] px-1.5 py-0.5 text-[#003d9b]">H</code>、
                  <code className="rounded bg-[#e9eeff] px-1.5 py-0.5 text-[#003d9b]">R</code> 表示，分别对应左边界、高度和右边界。
                </p>
              </div>
            </div>
          </header>

          <section className="space-y-6">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {[
                ['时间限制', '1000 ms'],
                ['内存限制', '256 MB'],
                ['题目分值', '2400'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[14px] bg-[#eef3ff] px-5 py-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#6b7ca7]">{label}</p>
                  <p className="mt-2 font-['Manrope'] text-[1.35rem] font-extrabold tracking-[-0.03em] text-[#131b2e]">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <SurfaceCard className="space-y-8 p-7 md:p-8">
              <section className="space-y-4">
                <h2 className="flex items-center gap-2 font-['Manrope'] text-[1.35rem] font-extrabold tracking-[-0.03em] text-[#131b2e]">
                  题意说明
                </h2>
                <div className="space-y-4 text-[15px] leading-8 text-[#4f5f7b]">
                  <p>请输出一组关键拐点，描述天际线从左到右的轮廓变化过程。相邻关键点之间表示一段稳定的水平区间。</p>
                  <p>如果两栋建筑有重叠，较高的建筑会遮盖较低的部分；当高建筑结束后，需要恢复到底层轮廓。</p>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="font-['Manrope'] text-[1.35rem] font-extrabold tracking-[-0.03em] text-[#131b2e]">
                  约束与限制
                </h2>
                <ul className="space-y-3">
                  {[
                    '1 <= n <= 10^5',
                    '0 <= L < R <= 10^9',
                    '1 <= H <= 10^9',
                    '时间限制：1.0 秒',
                    '内存限制：256 MB',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm text-[#4f5f7b]">
                      <span className="h-2 w-2 rounded-full bg-[#0052cc]" />
                      <code className="font-mono text-[13px]">{item}</code>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="space-y-5">
                <h2 className="font-['Manrope'] text-[1.35rem] font-extrabold tracking-[-0.03em] text-[#131b2e]">
                  示例 1
                </h2>
                <div className="space-y-4 rounded-[18px] bg-[#f2f3ff] p-5 md:p-6">
                  <div className="grid gap-4 md:grid-cols-2 md:gap-8">
                    <div className="rounded-[14px] border border-[#e4e8f4] bg-white px-5 py-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6b7ca7]">输入</p>
                      <pre className="mt-3 whitespace-pre-wrap font-mono text-sm leading-7 text-[#131b2e]">3{'\n'}2 10 9{'\n'}3 15 7{'\n'}12 8 18</pre>
                    </div>
                    <div className="rounded-[14px] border border-[#e4e8f4] bg-white px-5 py-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6b7ca7]">输出</p>
                      <pre className="mt-3 whitespace-pre-wrap font-mono text-sm leading-7 text-[#131b2e]">[2, 10, 3, 15, 7, 10, 9, 0, 12, 8, 18, 0]</pre>
                    </div>
                  </div>
                  <div className="border-t border-[#d8dfef] pt-4 text-xs leading-6 text-[#667896]">
                    三座建筑在区间内发生重叠，输出序列记录了轮廓上升、下降和归零的关键转折点。
                  </div>
                </div>
              </section>
            </SurfaceCard>
          </section>
        </article>

        <aside className="space-y-8 xl:pt-[72px]">
          <SurfaceCard tone="muted" className="space-y-4 rounded-[20px] p-6">
            <Link
              to="/problems/1/solve"
              className="flex items-center justify-center gap-2 rounded-[14px] bg-[linear-gradient(135deg,#003d9b,#0052cc)] px-5 py-4 text-base font-semibold text-white shadow-[0_18px_38px_rgba(0,61,155,0.18)]"
            >
              <Rocket className="h-4 w-4" />
              提交代码
            </Link>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-[14px] bg-white px-4 py-3 text-sm font-semibold text-[#244171] transition-colors hover:bg-[#edf1ff]"
              >
                <Edit3 className="h-4 w-4" />
                记录笔记
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-[14px] bg-white px-4 py-3 text-sm font-semibold text-[#244171] transition-colors hover:bg-[#edf1ff]"
              >
                <Bookmark className="h-4 w-4" />
                收藏题目
              </button>
            </div>
          </SurfaceCard>

          <div className="space-y-4">
            <h3 className="px-1 text-sm font-bold uppercase tracking-[0.22em] text-[#6b7ca7]">题目洞察</h3>
            <div className="overflow-hidden rounded-[20px] border border-[#e4e8f4] bg-white">
              {insights.map((item, index) => (
                <div
                  key={item.label}
                  className={cn(
                    'flex items-center justify-between gap-3 px-5 py-4',
                    index !== insights.length - 1 && 'border-b border-[#eef2f7]',
                  )}
                >
                  <span className="text-sm font-medium text-[#5f6d87]">{item.label}</span>
                  <span className={cn('text-sm font-bold text-[#131b2e]', item.accent, item.tone && `rounded-full px-3 py-1 text-xs tracking-[0.14em] ${item.tone}`)}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="px-1 text-sm font-bold uppercase tracking-[0.22em] text-[#6b7ca7]">相关挑战</h3>
            <div className="space-y-3">
              {relatedProblems.map((problem) => (
                <Link
                  key={problem.title}
                  to="/problems"
                  className="group block rounded-[16px] border-l-4 border-transparent bg-[#f2f3ff] p-4 transition-all hover:border-[#003d9b] hover:bg-[#e9eeff]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-sm font-bold text-[#131b2e] transition-colors group-hover:text-[#003d9b]">
                      {problem.title}
                    </h4>
                    <span className={cn('shrink-0 text-xs font-bold', problem.difficultyTone)}>
                      {problem.difficulty}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[#667896]">{problem.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default ProblemDetail
