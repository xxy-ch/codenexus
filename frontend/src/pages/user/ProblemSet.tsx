import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { DifficultyBadge } from '@/components/ui/StatusBadge'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'
import { useProblems } from '@/hooks/useProblems'

function formatTagSummary(tags: string[]) {
  if (tags.length === 0) {
    return 'General'
  }
  return tags.slice(0, 2).join(' · ')
}

export function ProblemSet() {
  const { data, isLoading, isError, refetch } = useProblems({ limit: 20 })
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  const problems = data?.problems ?? []
  const dailyChallenge = problems[0] ?? null
  const total = data?.total ?? problems.length

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>()

    problems.forEach((problem) => {
      problem.tags.forEach((tag) => {
        counts.set(tag, (counts.get(tag) ?? 0) + 1)
      })
    })

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
  }, [problems])

  const filteredProblems = useMemo(() => {
    return problems.filter((problem) => {
      if (selectedDifficulty && problem.difficulty !== selectedDifficulty) {
        return false
      }
      if (selectedTag && !problem.tags.includes(selectedTag)) {
        return false
      }
      return true
    })
  }, [problems, selectedDifficulty, selectedTag])

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
        <LoadingState message="Loading problems..." />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
        <ErrorState
          title="Failed to load problems"
          message="Please check your connection and try again."
          action={{ label: 'Retry', onClick: () => refetch() }}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
      <div className="space-y-6">
        {/* Page Header & Stats Bento */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <h2 className="text-4xl font-extrabold tracking-tight text-on-surface mb-2">Problem Set</h2>
            <p className="text-on-surface-variant max-w-2xl leading-relaxed">
              Curated collection of algorithmic challenges designed for cognitive precision.
              Refine your architectural logic through manuscript-grade code execution.
            </p>
          </div>
          <div className="lg:col-span-4 grid grid-cols-2 gap-4">
            <div className="bg-surface-container-low p-4 rounded-lg flex flex-col justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-primary/60">Solved</span>
              <span className="text-2xl font-black text-primary">124/{total}</span>
            </div>
            <div className="bg-surface-container-low p-4 rounded-lg flex flex-col justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-tertiary-container/80">Streak</span>
              <span className="text-2xl font-black text-tertiary">12 Days</span>
            </div>
          </div>
        </section>

        {/* Filters Section */}
        <section className="flex flex-wrap items-center gap-3">
          <button className="px-4 py-1.5 bg-primary text-white rounded-full text-sm font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">filter_list</span>
            All Topics
          </button>

          {tagCounts.map(([tag]) => (
            <button
              key={tag}
              type="button"
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              className={cn(
                'px-4 py-1.5 bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest transition-colors rounded-full text-sm font-semibold',
                selectedTag === tag && 'bg-primary text-white'
              )}
            >
              {tag}
            </button>
          ))}

          <button className="ml-auto flex items-center gap-1 text-primary text-sm font-bold hover:underline">
            Expand filters
            <span className="material-symbols-outlined text-sm">keyboard_arrow_down</span>
          </button>
        </section>

        {/* Main Content */}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          {/* Problem Table */}
          <section className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-none">
                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant/70">Status</th>
                    <th className="px-4 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant/70">ID</th>
                    <th className="px-4 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant/70">Problem Title</th>
                    <th className="px-4 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant/70">Difficulty</th>
                    <th className="px-4 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant/70">Acceptance</th>
                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant/70 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container">
                  {filteredProblems.length > 0 ? (
                    filteredProblems.map((problem) => (
                      <tr
                        key={problem.id}
                        className="hover:bg-surface-container-low transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <span className="material-symbols-outlined text-slate-200">circle</span>
                        </td>
                        <td className="px-4 py-4 text-sm font-mono text-on-surface-variant">#{problem.id}</td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors cursor-pointer">{problem.title}</span>
                            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-tighter">{formatTagSummary(problem.tags)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <DifficultyBadge difficulty={problem.difficulty} />
                        </td>
                        <td className="px-4 py-4 text-sm font-medium text-on-surface-variant">{Math.round(Math.random() * 30 + 40)}%</td>
                        <td className="px-6 py-4 text-right">
                          <button className="material-symbols-outlined text-slate-300 hover:text-primary transition-colors">terminal</button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12">
                        <EmptyState
                          title="No problems found"
                          description="Try adjusting your filters or check back later."
                          icon={
                            <span className="material-symbols-outlined text-6xl text-on-surface-variant">
                              search_off
                            </span>
                          }
                          action={
                            selectedDifficulty || selectedTag
                              ? {
                                  label: 'Clear Filters',
                                  onClick: () => {
                                    setSelectedDifficulty(null)
                                    setSelectedTag(null)
                                  },
                                }
                              : undefined
                          }
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredProblems.length > 0 && (
              <div className="px-6 py-4 bg-surface-container-low flex items-center justify-between">
                <span className="text-xs font-semibold text-on-surface-variant">Showing 1-{filteredProblems.length} of {total} problems</span>
                <div className="flex gap-2">
                  <button className="w-8 h-8 rounded border border-outline-variant flex items-center justify-center hover:bg-white transition-colors">
                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                  </button>
                  <button className="w-8 h-8 rounded bg-primary text-white text-xs font-bold">1</button>
                  <button className="w-8 h-8 rounded border border-outline-variant flex items-center justify-center hover:bg-white transition-colors text-xs font-bold">2</button>
                  <button className="w-8 h-8 rounded border border-outline-variant flex items-center justify-center hover:bg-white transition-colors text-xs font-bold">3</button>
                  <button className="w-8 h-8 rounded border border-outline-variant flex items-center justify-center hover:bg-white transition-colors">
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Daily Challenge */}
            <div className="relative overflow-hidden bg-primary-container p-6 rounded-xl text-white">
              <div className="relative z-10 flex items-center justify-between h-full">
                <div>
                  <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest mb-4">Daily Challenge</span>
                  <h3 className="text-2xl font-black mb-2 tracking-tight">{dailyChallenge?.title ?? 'Loading...'}</h3>
                  <p className="text-primary-fixed text-sm mb-6 max-w-sm">{dailyChallenge?.description ?? 'Master time complexity analysis with this classic hard-level challenge.'}</p>
                  <Link to={dailyChallenge ? `/problems/${dailyChallenge.id}` : '/problems'}>
                    <Button
                      variant="secondary"
                      className="bg-white text-primary hover:bg-white/90"
                      size="sm"
                    >
                      Solve Now
                    </Button>
                  </Link>
                </div>
                <div className="hidden sm:block opacity-20 transform translate-x-8">
                  <span className="material-symbols-outlined text-[120px]">psychology</span>
                </div>
              </div>
              {/* Abstract pattern background */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-container opacity-50"></div>
            </div>

            {/* Study Plan Card */}
            <Card variant="surface" className="p-6 rounded-xl flex flex-col">
              <h3 className="font-bold text-on-surface mb-1">Elite Study Plan</h3>
              <p className="text-xs text-on-surface-variant mb-6">Master DP in 14 days.</p>
              <div className="flex-1 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                  <span className="text-sm font-medium text-on-surface">Knapsack Variations</span>
                  <span className="ml-auto text-xs font-bold text-on-surface-variant">4/12</span>
                </div>
                <div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-1/3"></div>
                </div>
              </div>
              <button className="mt-8 text-primary font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all">
                View Schedule
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProblemSet
