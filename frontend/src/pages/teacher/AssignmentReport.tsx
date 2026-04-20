import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, BarChart3, BookOpen, ChevronRight, Download, FileSpreadsheet, GraduationCap, Search, Users } from 'lucide-react'
import { classesService } from '@/services/classes'
import type { AssignmentItem, AssignmentSubmissionItem } from '@/services/classes'
import { TableSkeleton } from '@/components/skeletons/TableSkeleton'
import { InlineError } from '@/components/ui/InlineError'

function formatDate(value?: string) {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

interface AssignmentRow {
  classId: number
  className: string
  assignment: AssignmentItem
  submissions: AssignmentSubmissionItem[]
  studentCount: number
}

export function AssignmentReport() {
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['assignment-report-classes'],
    queryFn: () => classesService.getClasses(1, 50),
  })

  const classes = data?.classes || []

  const { data: assignmentRows = [] } = useQuery({
    queryKey: ['assignment-report-rows', classes.map((c) => c.id)],
    queryFn: async () => {
      const targetClasses = selectedClassId
        ? classes.filter((c) => c.id === selectedClassId)
        : classes

      const rows: AssignmentRow[] = []

      const results = await Promise.allSettled(
        targetClasses.map(async (cls) => {
          const assignments = await classesService.listAssignments(cls.id)
          const studentCount = cls.student_count ?? 0

          const assignmentWithSubs = await Promise.allSettled(
            assignments.map(async (assignment) => {
              const submissions = await classesService.getAssignmentSubmissions(assignment.id)
              return { assignment, submissions }
            })
          )

          for (const result of assignmentWithSubs) {
            if (result.status === 'fulfilled') {
              rows.push({
                classId: cls.id,
                className: cls.name,
                assignment: result.value.assignment,
                submissions: result.value.submissions,
                studentCount,
              })
            }
          }
        })
      )

      void results
      return rows
    },
    enabled: classes.length > 0,
  })

  const summary = useMemo(() => {
    const totalStudents = classes.reduce((sum, cls) => sum + Number(cls.student_count || 0), 0)
    const averageClassSize = classes.length > 0 ? Math.round(totalStudents / classes.length) : 0
    const mostRecentClass = [...classes].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0]
    const totalAssignments = assignmentRows.length
    const totalSubmissions = assignmentRows.reduce((sum, r) => sum + r.submissions.length, 0)
    const avgScore = totalSubmissions > 0
      ? Math.round(
          assignmentRows.reduce(
            (sum, r) => sum + r.submissions.reduce((s, sub) => s + sub.score, 0),
            0
          ) / totalSubmissions
        )
      : 0

    return {
      totalClasses: classes.length,
      totalStudents,
      averageClassSize,
      mostRecentClass,
      activeSemesters: Array.from(new Set(classes.map((cls) => cls.semester).filter(Boolean))).length,
      totalAssignments,
      totalSubmissions,
      avgScore,
    }
  }, [classes, assignmentRows])

  if (isLoading) {
    return <TableSkeleton rows={6} columns={4} />
  }

  if (error) {
    return <InlineError title="作业报告加载失败" onRetry={() => refetch()} />
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>Teacher Workspace</span>
              <ChevronRight className="h-4 w-4" />
              <span>Classes</span>
              <ChevronRight className="h-4 w-4" />
              <span className="font-medium text-slate-900">Assignment Report</span>
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Assignment Performance Report</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                View assignment completion rates, submission counts, and average scores across all your classes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <Search className="h-4 w-4" />
              Refresh
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              <Download className="h-4 w-4" />
              Export Snapshot
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Classes</span>
            <GraduationCap className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">{summary.totalClasses}</div>
          <p className="mt-2 text-sm text-slate-600">Total teaching classes covered.</p>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Students</span>
            <Users className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">{summary.totalStudents}</div>
          <p className="mt-2 text-sm text-slate-600">Total students across all classes.</p>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Assignments</span>
            <BarChart3 className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">{summary.totalAssignments}</div>
          <p className="mt-2 text-sm text-slate-600">Total assignments published.</p>
        </div>

        <div className="rounded-[28px] border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Avg Score</span>
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">{summary.avgScore}</div>
          <p className="mt-2 text-sm text-emerald-800">Average score across all submissions.</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]">
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Assignment Completion</h2>
              <p className="mt-1 text-sm text-slate-600">Per-assignment breakdown with submission counts and average scores.</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedClassId ?? ''}
                onChange={(e) => setSelectedClassId(e.target.value ? Number(e.target.value) : null)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                <option value="">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
              <div className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-medium uppercase tracking-[0.22em] text-slate-500">
                Live Data
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Assignment</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Class</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Students</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Submitted</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Avg Score</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Deadline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {assignmentRows.map((row) => {
                  const submittedCount = row.submissions.length
                  const avgScore = submittedCount > 0
                    ? Math.round(row.submissions.reduce((sum, s) => sum + s.score, 0) / submittedCount)
                    : 0
                  const completionRate = row.studentCount > 0
                    ? Math.round((submittedCount / row.studentCount) * 100)
                    : 0
                  const isOverdue = new Date(row.assignment.deadline) < new Date()

                  return (
                    <tr key={row.assignment.id} className="transition hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-950">Problem #{row.assignment.problem_id}</div>
                        <div className="mt-1 text-xs text-slate-500">{row.assignment.points} pts</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{row.className}</td>
                      <td className="px-6 py-4">
                        <div className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                          {row.studentCount} students
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 rounded-full bg-slate-100">
                            <div
                              className="h-2 rounded-full bg-emerald-500 transition-all"
                              style={{ width: `${Math.min(100, completionRate)}%` }}
                            />
                          </div>
                          <span className="text-sm text-slate-600">{submittedCount} ({completionRate}%)</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-950">{avgScore}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                          isOverdue
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          <ArrowUpRight className="h-3.5 w-3.5" />
                          {formatDate(row.assignment.deadline)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
                {assignmentRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
                      No assignment data available. Create assignments in your classes to see completion data here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
              <BookOpen className="h-4 w-4" />
              Class Overview
            </div>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              {classes.map((cls) => (
                <li key={cls.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span className="font-medium text-slate-900">{cls.name}</span>
                  <span className="text-xs text-slate-500">{cls.student_count ?? 0} students</span>
                </li>
              ))}
              {classes.length === 0 && (
                <li className="text-slate-400">No classes found.</li>
              )}
            </ul>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-slate-900 p-6 text-white shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">Most Recent Class</div>
            <div className="mt-4 text-2xl font-semibold">
              {summary.mostRecentClass?.name || 'No class data'}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {summary.mostRecentClass
                ? `Created ${formatDate(summary.mostRecentClass.created_at)}, ${summary.mostRecentClass.student_count ?? 0} students enrolled.`
                : 'No recent class data available for analysis.'}
            </p>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
              <BarChart3 className="h-4 w-4" />
              Submissions Summary
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <div className="text-2xl font-semibold text-slate-950">{summary.totalSubmissions}</div>
                <div className="text-xs text-slate-500">Total</div>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 text-center">
                <div className="text-2xl font-semibold text-emerald-700">{summary.avgScore}</div>
                <div className="text-xs text-emerald-600">Avg Score</div>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
