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
      {/* Header */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>教师工作台</span>
              <ChevronRight className="h-3.5 w-3.5" />
              <span>班级</span>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="font-medium text-foreground">作业报告</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">作业完成报告</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                查看所有班级的作业完成率、提交数和平均分。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              <Search className="h-4 w-4" />
              刷新
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              <Download className="h-4 w-4" />
              导出快照
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">班级数</span>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-4 text-3xl font-bold text-foreground">{summary.totalClasses}</div>
          <p className="mt-2 text-xs text-muted-foreground">教学班级总数。</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">学生数</span>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-4 text-3xl font-bold text-foreground">{summary.totalStudents}</div>
          <p className="mt-2 text-xs text-muted-foreground">所有班级的学生总数。</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">作业数</span>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-4 text-3xl font-bold text-foreground">{summary.totalAssignments}</div>
          <p className="mt-2 text-xs text-muted-foreground">已发布的作业总数。</p>
        </div>

        <div className="rounded-xl border border-lime-500/30 bg-lime-500/5 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-widest text-lime-400">平均分</span>
            <FileSpreadsheet className="h-4 w-4 text-lime-400" />
          </div>
          <div className="mt-4 text-3xl font-bold text-foreground">{summary.avgScore}</div>
          <p className="mt-2 text-xs text-lime-300">所有提交的平均分。</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex flex-col gap-4 border-b border-border px-6 py-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">作业完成情况</h2>
              <p className="mt-1 text-xs text-muted-foreground">按作业统计提交数和平均分。</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedClassId ?? ''}
                onChange={(e) => setSelectedClassId(e.target.value ? Number(e.target.value) : null)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="">所有班级</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
              <div className="rounded-lg bg-muted px-3 py-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                实时数据
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">作业</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">班级</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">学生数</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">已提交</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">平均分</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground">截止时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
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
                    <tr key={row.assignment.id} className="transition hover:bg-muted/50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-foreground">题目 #{row.assignment.problem_id}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{row.assignment.points} 分</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{row.className}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                          {row.studentCount} 名学生
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 rounded-full bg-muted">
                            <div
                              className="h-2 rounded-full bg-lime-400 transition-all"
                              style={{ width: `${Math.min(100, completionRate)}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{submittedCount} ({completionRate}%)</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-foreground">{avgScore}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                          isOverdue
                            ? 'bg-difficulty-medium/15 text-difficulty-medium'
                            : 'bg-status-accepted/15 text-status-accepted'
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
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground">
                      暂无作业数据。在班级中创建作业后即可在此查看完成情况。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              班级概览
            </div>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
              {classes.map((cls) => (
                <li key={cls.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                  <span className="text-sm font-medium text-foreground">{cls.name}</span>
                  <span className="text-xs text-muted-foreground">{cls.student_count ?? 0} 名学生</span>
                </li>
              ))}
              {classes.length === 0 && (
                <li className="text-muted-foreground">暂无班级。</li>
              )}
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-primary p-6 text-primary-foreground shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/60">最新班级</div>
            <div className="mt-4 text-lg font-bold">
              {summary.mostRecentClass?.name || '暂无数据'}
            </div>
            <p className="mt-2 text-xs leading-6 text-primary-foreground/70">
              {summary.mostRecentClass
                ? `创建于 ${formatDate(summary.mostRecentClass.created_at)}，${summary.mostRecentClass.student_count ?? 0} 名学生。`
                : '暂无最近班级数据。'}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              提交汇总
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <div className="text-2xl font-bold text-foreground">{summary.totalSubmissions}</div>
                <div className="text-xs text-muted-foreground">总提交</div>
              </div>
              <div className="rounded-lg bg-lime-500/5 p-3 text-center">
                <div className="text-2xl font-bold text-lime-400">{summary.avgScore}</div>
                <div className="text-xs text-lime-300">平均分</div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
