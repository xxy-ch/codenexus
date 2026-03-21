import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/page/PageHeader'
import { SurfaceCard } from '@/components/page/SurfaceCard'
import { MetaStrip } from '@/components/page/MetaStrip'

export function ProblemDetail() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.62fr]">
        <div className="space-y-6">
          <PageHeader
            breadcrumb={['Problems', 'Dynamic Programming', '1042. Skyline Partition']}
            title="Skyline Partition Optimization"
            description="Given a set of n rectangular buildings in a city, your task is to partition the resulting silhouette into the minimum number of disjoint rectangles that satisfy the structural integrity constraints."
          />

          <MetaStrip
            items={[
              { label: 'Difficulty', value: 'Hard' },
              { label: 'Time Limit', value: '1000 ms' },
              { label: 'Memory Limit', value: '256 MB' },
              { label: 'Points', value: '2400' },
            ]}
          />

          <SurfaceCard className="space-y-8">
            <section className="space-y-4">
              <h2 className="font-['Manrope'] text-[1.35rem] font-extrabold tracking-[-0.03em] text-[#131b2e]">Description</h2>
              <div className="max-w-3xl space-y-4 text-[15px] leading-8 text-[#4f5f7b]">
                <p>Given a set of <span className="rounded bg-[rgba(218,226,253,0.6)] px-1 py-0.5 font-mono text-[#003d9b]">n</span> rectangular buildings in a city, your task is to partition the resulting silhouette into the minimum number of disjoint rectangles that satisfy the structural integrity constraints.</p>
                <p>Each building is represented by three integers: <span className="font-mono">L</span>, <span className="font-mono">H</span>, and <span className="font-mono">R</span>, where <span className="font-mono">L</span> and <span className="font-mono">R</span> are the left and right x-coordinates, and <span className="font-mono">H</span> is the height.</p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="font-['Manrope'] text-[1.35rem] font-extrabold tracking-[-0.03em] text-[#131b2e]">Constraints</h2>
              <ul className="space-y-2 text-sm text-[#4f5f7b]">
                <li>• 1 &lt;= n &lt;= 10^5</li>
                <li>• 0 &lt;= L &lt; R &lt;= 10^9</li>
                <li>• 1 &lt;= H &lt;= 10^9</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="font-['Manrope'] text-[1.35rem] font-extrabold tracking-[-0.03em] text-[#131b2e]">Example Cases</h2>
              <div className="grid gap-4 rounded-[10px] bg-[rgba(242,243,255,0.84)] p-5 md:grid-cols-2">
                <div className="rounded-[8px] bg-white px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#6b7ca7]">Input</p>
                  <pre className="mt-3 whitespace-pre-wrap text-sm text-[#131b2e]">3{'\n'}2 10 9{'\n'}3 15 7{'\n'}12 8 18</pre>
                </div>
                <div className="rounded-[8px] bg-white px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#6b7ca7]">Output</p>
                  <pre className="mt-3 whitespace-pre-wrap text-sm text-[#131b2e]">[2, 10, 3, 15, 7, 10, 9, 0, 12, 8, 18, 0]</pre>
                </div>
              </div>
            </section>
          </SurfaceCard>
        </div>

        <div className="space-y-6 xl:pt-[102px]">
          <SurfaceCard tone="muted" className="space-y-3">
            <Link to="/problems/1/solve" className="flex items-center justify-center rounded-[8px] bg-[linear-gradient(135deg,#003d9b,#0052cc)] px-4 py-4 text-base font-semibold text-white shadow-[0_16px_32px_rgba(0,61,155,0.18)]">
              Submit Code
            </Link>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" className="rounded-[8px] bg-white px-4 py-3 text-sm font-semibold text-[#244171]">Note</button>
              <button type="button" className="rounded-[8px] bg-white px-4 py-3 text-sm font-semibold text-[#244171]">Save</button>
            </div>
          </SurfaceCard>

          <SurfaceCard className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#6b7ca7]">Problem Insights</p>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-[8px] bg-[rgba(242,243,255,0.68)] px-4 py-3"><span>Difficulty</span><span className="rounded-full bg-[#006847] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">Hard</span></div>
              <div className="flex items-center justify-between rounded-[8px] bg-[rgba(242,243,255,0.68)] px-4 py-3"><span>Success Rate</span><span>34.8%</span></div>
              <div className="flex items-center justify-between rounded-[8px] bg-[rgba(242,243,255,0.68)] px-4 py-3"><span>Author</span><span className="text-[#003d9b]">Dr. A. Vance</span></div>
              <div className="flex items-center justify-between rounded-[8px] bg-[rgba(242,243,255,0.68)] px-4 py-3"><span>Added</span><span>Oct 24, 2023</span></div>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </div>
  )
}

export default ProblemDetail
