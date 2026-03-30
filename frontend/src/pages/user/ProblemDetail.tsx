import { useParams, Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { DifficultyBadge } from '@/components/ui/StatusBadge'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { useProblem } from '@/hooks/useProblems'
import type { Problem } from '@/types/problems'

interface ProblemDetailProps {
  problemId?: string
}

function ProblemDetailContent({ problem }: { problem: Problem }) {
  const insights = [
    { label: 'Difficulty', value: problem.difficulty },
    { label: 'Points', value: `${problem.points} pts` },
    { label: 'Time Limit', value: `${problem.time_limit} ms` },
    { label: 'Memory Limit', value: `${Math.round(problem.memory_limit / 1024)} MB` },
  ]

  const sampleInput = `3
2 10 9
3 15 7
12 8 18`

  const sampleOutput = `[2, 10, 3, 15, 7, 10, 9, 0, 12, 8, 18, 0]`

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1.75fr)_360px] xl:gap-12">
      <article className="space-y-10">
        {/* Breadcrumb */}
        <nav className="flex flex-wrap items-center gap-2 text-sm font-medium text-on-surface-variant">
          <Link to="/problems" className="hover:text-primary transition-colors">
            Problems
          </Link>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <span className="font-bold text-primary">{problem.id}. {problem.title}</span>
        </nav>

        {/* Title Section */}
        <header className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <DifficultyBadge difficulty={problem.difficulty} />
            <span className="text-sm font-mono text-on-surface-variant">ID: {problem.id}</span>
          </div>

          <h1 className="font-headline text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface">
            {problem.title}
          </h1>

          {problem.description && (
            <div className="max-w-4xl space-y-4 text-base leading-8 text-on-surface-variant">
              <p>{problem.description}</p>
            </div>
          )}
        </header>

        {/* Constraints Card */}
        <Card variant="default" className="p-0">
          <CardContent className="p-0">
            <div className="grid gap-3 p-6 md:grid-cols-2 xl:grid-cols-4">
              {[
                ['Time Limit', `${problem.time_limit} ms`],
                ['Memory Limit', `${Math.round(problem.memory_limit / 1024)} MB`],
                ['Points', problem.points],
                ['Difficulty', problem.difficulty],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-surface-container-low px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                    {label}
                  </p>
                  <p className="mt-2 font-headline text-xl font-extrabold text-on-surface">
                    {value as string}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Problem Content */}
        <Card variant="default" className="space-y-8 p-6 md:p-8">
          <section className="space-y-4">
            <h2 className="font-headline text-xl font-extrabold text-on-surface">
              Description
            </h2>
            {problem.description ? (
              <div className="prose prose-sm max-w-none text-on-surface-variant">
                <p>{problem.description}</p>
              </div>
            ) : (
              <p className="text-on-surface-variant">No description available.</p>
            )}
          </section>

          {problem.input_format && (
            <section className="space-y-4">
              <h2 className="font-headline text-xl font-extrabold text-on-surface">
                Input Format
              </h2>
              <div className="prose prose-sm max-w-none text-on-surface-variant">
                <p>{problem.input_format}</p>
              </div>
            </section>
          )}

          {problem.output_format && (
            <section className="space-y-4">
              <h2 className="font-headline text-xl font-extrabold text-on-surface">
                Output Format
              </h2>
              <div className="prose prose-sm max-w-none text-on-surface-variant">
                <p>{problem.output_format}</p>
              </div>
            </section>
          )}

          {problem.constraints && (
            <section className="space-y-4">
              <h2 className="font-headline text-xl font-extrabold text-on-surface">
                Constraints
              </h2>
              <ul className="space-y-2">
                {problem.constraints.split('\n').map((constraint, index) => (
                  <li key={index} className="flex items-start gap-3 text-sm text-on-surface-variant">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                    <code className="font-mono text-sm">{constraint}</code>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Sample Test Case */}
          <section className="space-y-5">
            <h2 className="font-headline text-xl font-extrabold text-on-surface">
              Sample Test Case
            </h2>
            <div className="space-y-4 rounded-xl bg-surface-container-low p-5 md:p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-outline-variant/20 bg-white px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                    Input
                  </p>
                  <pre className="mt-3 whitespace-pre-wrap font-mono text-sm text-on-surface">
                    {sampleInput}
                  </pre>
                </div>
                <div className="rounded-lg border border-outline-variant/20 bg-white px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                    Output
                  </p>
                  <pre className="mt-3 whitespace-pre-wrap font-mono text-sm text-on-surface">
                    {sampleOutput}
                  </pre>
                </div>
              </div>
              <div className="border-t border-outline-variant/10 pt-4 text-xs leading-6 text-on-surface-variant">
                Sample input and output for testing your solution.
              </div>
            </div>
          </section>

          {/* Tags */}
          {problem.tags && problem.tags.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-headline text-xl font-extrabold text-on-surface">
                Tags
              </h2>
              <div className="flex flex-wrap gap-2">
                {problem.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex rounded-full bg-surface-container-low px-3 py-1 text-sm font-semibold text-on-surface"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </section>
          )}
        </Card>
      </article>

      {/* Sidebar */}
      <aside className="space-y-8 xl:pt-20">
        {/* Action Card */}
        <Card className="space-y-4 p-6">
          <Button
            as={Link}
            to={`/problems/${problem.id}/solve`}
            variant="gradient"
            size="lg"
            fullWidth
            leftIcon={<span className="material-symbols-outlined text-lg">rocket_launch</span>}
          >
            Solve Problem
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" size="sm" fullWidth>
              <span className="material-symbols-outlined text-sm mr-1">edit_note</span>
              Notes
            </Button>
            <Button variant="outline" size="sm" fullWidth>
              <span className="material-symbols-outlined text-sm mr-1">bookmark</span>
              Save
            </Button>
          </div>
        </Card>

        {/* Insights Card */}
        <Card variant="surface" className="overflow-hidden p-0">
          <div className="border-b border-outline-variant/10 px-6 py-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant">
              Problem Insights
            </h3>
          </div>
          <div className="divide-y divide-outline-variant/10">
            {insights.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-3 px-6 py-4"
              >
                <span className="text-sm font-medium text-on-surface-variant">
                  {item.label}
                </span>
                <span className="text-sm font-bold text-on-surface">
                  {item.value as string}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Related Problems */}
        <div className="space-y-4">
          <h3 className="px-1 text-sm font-bold uppercase tracking-wider text-on-surface-variant">
            Related Problems
          </h3>
          <div className="space-y-3">
            {[
              { id: 2, title: 'Two Sum', difficulty: 'easy' as const, description: 'Classic array problem' },
              { id: 3, title: 'Merge Intervals', difficulty: 'medium' as const, description: 'Interval merging technique' },
            ].map((related) => (
              <Link
                key={related.id}
                to={`/problems/${related.id}`}
                className="group block rounded-lg border-l-4 border-transparent bg-surface-container-low p-4 transition-all hover:border-primary hover:bg-surface-container"
              >
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-sm font-bold text-on-surface transition-colors group-hover:text-primary">
                    {related.title}
                  </h4>
                  <DifficultyBadge difficulty={related.difficulty} />
                </div>
                <p className="mt-2 text-xs leading-5 text-on-surface-variant">
                  {related.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}

export function ProblemDetail({ problemId }: ProblemDetailProps) {
  const { id } = useParams<{ id: string }>()
  const effectiveProblemId = problemId || id

  const { data: problem, isLoading, isError, error } = useProblem(effectiveProblemId || '')

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
        <LoadingState message="Loading problem..." />
      </div>
    )
  }

  if (isError || !problem) {
    // Check if this is an authentication error (401)
    const isAuthError = (error as any)?.response?.status === 401 ||
                        (error as any)?.message?.includes('401')

    return (
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
        <ErrorState
          title={isAuthError ? 'Authentication Required' : 'Problem not found'}
          message={
            isAuthError
              ? 'Please log in to view this problem.'
              : 'The problem you\'re looking for doesn\'t exist or you don\'t have access to it.'
          }
          action={{
            label: isAuthError ? 'Go to Login' : 'Back to Problems',
            onClick: () => {
              if (isAuthError) {
                window.location.href = '/login'
              } else {
                window.history.back()
              }
            },
          }}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8 lg:py-10">
      <ProblemDetailContent problem={problem} />
    </div>
  )
}

export default ProblemDetail
