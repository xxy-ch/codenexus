import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/page/PageHeader'
import { SurfaceCard } from '@/components/page/SurfaceCard'

const problems = [
  { id: '402', title: 'Trapping Rain Water II', meta: 'Hard • 3D Geometry', difficulty: 'Hard', acceptance: '42.8%' },
  { id: '015', title: '3Sum Closest', meta: 'Medium • Two Pointers', difficulty: 'Medium', acceptance: '46.2%' },
  { id: '102', title: 'Binary Tree Level Order Traversal', meta: 'Easy • BFS', difficulty: 'Easy', acceptance: '64.1%' },
  { id: '001', title: 'Two Sum', meta: 'Easy • Hash Table', difficulty: 'Easy', acceptance: '51.2%' },
  { id: '215', title: 'Kth Largest Element in an Array', meta: 'Medium • Heap', difficulty: 'Medium', acceptance: '66.7%' },
]

const difficultyTone: Record<string, string> = {
  Easy: 'bg-[#e4f7ee] text-[#006847]',
  Medium: 'bg-[#d5e3fc] text-[#244171]',
  Hard: 'bg-[#ffdad6] text-[#93000a]',
}

export function ProblemSet() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Problem Set"
          title="Algorithm Challenges"
          description="Curated collection of algorithmic challenges designed for cognitive precision. Refine your architectural logic through manuscript-grade code execution."
          actions={<Link to="/ranking" className="rounded-[8px] bg-[linear-gradient(135deg,#003d9b,#0052cc)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(0,61,155,0.16)]">View Rankings</Link>}
        />

        <div className="grid gap-4 lg:grid-cols-[1.5fr_0.6fr]">
          <SurfaceCard>
            <div className="flex flex-wrap items-center gap-2">
              {['All Topics', 'Dynamic Programming', 'Graphs', 'Math', 'String Manipulation'].map((item, index) => (
                <button
                  key={item}
                  type="button"
                  className={index === 0
                    ? 'rounded-full bg-[linear-gradient(135deg,#003d9b,#0052cc)] px-4 py-2 text-sm font-semibold text-white'
                    : 'rounded-full bg-[rgba(226,231,255,0.88)] px-4 py-2 text-sm font-semibold text-[#445472]'}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="mt-6 overflow-hidden rounded-[10px] bg-[rgba(242,243,255,0.7)]">
              <div className="grid grid-cols-[88px_100px_minmax(0,1fr)_120px_120px_96px] gap-3 px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#6b7ca7]">
                <span>Status</span>
                <span>ID</span>
                <span>Problem Title</span>
                <span>Difficulty</span>
                <span>Acceptance</span>
                <span className="text-right">Action</span>
              </div>
              <div className="space-y-2 px-3 pb-3">
                {problems.map((problem, index) => (
                  <div key={problem.id} className="grid grid-cols-[88px_100px_minmax(0,1fr)_120px_120px_96px] items-center gap-3 rounded-[8px] bg-white px-3 py-4 shadow-[0_8px_18px_rgba(19,27,46,0.04)]">
                    <span className="text-sm text-[#667896]">{index % 2 === 0 ? 'Accepted' : 'Pending'}</span>
                    <span className="font-mono text-sm text-[#667896]">#{problem.id}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#131b2e]">{problem.title}</p>
                      <p className="mt-1 text-xs text-[#65748d]">{problem.meta}</p>
                    </div>
                    <span className={`w-fit rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${difficultyTone[problem.difficulty]}`}>
                      {problem.difficulty}
                    </span>
                    <span className="text-sm font-medium text-[#445472]">{problem.acceptance}</span>
                    <div className="text-right">
                      <Link to={`/problems/${problem.id}`} className="text-sm font-semibold text-[#003d9b]">Open</Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard tone="muted" className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#6b7ca7]">Daily challenge</p>
              <h2 className="mt-3 font-['Manrope'] text-[1.8rem] font-extrabold tracking-[-0.04em] text-[#131b2e]">Median of Two Sorted Arrays</h2>
              <p className="mt-2 text-sm text-[#65748d]">Master time complexity analysis with this classic hard-level challenge.</p>
            </div>
            <Link to="/problems/1" className="inline-flex rounded-[8px] bg-[linear-gradient(135deg,#003d9b,#0052cc)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(0,61,155,0.16)]">
              Solve now
            </Link>
          </SurfaceCard>
        </div>
      </div>
    </div>
  )
}

export default ProblemSet
