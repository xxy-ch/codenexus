import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowDownToLine,
  CalendarDays,
  Filter,
  RefreshCw,
  School2,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/page/EmptyState'
import { FieldGroup } from '@/components/page/FieldGroup'
import { FilterBar } from '@/components/page/FilterBar'
import { PageHeader } from '@/components/page/PageHeader'
import { SectionBlock } from '@/components/page/SectionBlock'
import { StatCard } from '@/components/page/StatCard'
import { SurfaceCard } from '@/components/page/SurfaceCard'
import { Loading } from '@/components/ui/Loading'
import { classesService, type AssignmentSubmissionItem, type ClassStudentItem } from '@/services/classes'
import { cn, formatDateTime } from '@/lib/utils'

interface ReportRow {
  student: ClassStudentItem
  submissions: AssignmentSubmissionItem[]
  bestSubmission: AssignmentSubmissionItem | null
  latestSubmission: AssignmentSubmissionItem | null
}

const DEFAULT_LIMIT = 20

function buildBestSubmission(submissions: AssignmentSubmissionItem[]) {
  return submissions.reduce<AssignmentSubmissionItem | null>((best, candidate) => {
    if (!best) return candidate
    if (candidate.score > best.score) return candidate
    if (candidate.score < best.score) return best

    const candidateTime = new Date(candidate.submitted_at).getTime()
    const bestTime = new Date(best.submitted_at).getTime()
    return candidateTime >= bestTime ? candidate : best
  }, null)
}

function buildLatestSubmission(submissions: AssignmentSubmissionItem[]) {
  return submissions.reduce<AssignmentSubmissionItem | null>((latest, candidate) => {
    if (!latest) return candidate
    const latestTime = new Date(latest.submitted_at).getTime()
    const candidateTime = new Date(candidate.submitted_at).getTime()
    return candidateTime >= latestTime ? candidate : latest
  }, null)
}

function getRowStatus(row: ReportRow, assignmentPoints: number) {
  if (!row.bestSubmission) return '未提交'
  if (row.bestSubmission.score >= assignmentPoints) return '高分通过'
  if (row.bestSubmission.is_late) return '已逾期'
  return '已提交'
}

function escapeCsvCell(value: unknown) {
  const text = value == null ? '' : String(value)
  if (/["\n,]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

function TableCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn('px-4 py-3 text-sm text-slate-600', className)}>{children}</td>
}

export function AssignmentReport() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null)
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null)
  const limit = DEFAULT_LIMIT

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['assignment-report-classes', page, limit],
    queryFn: () => classesService.getClasses(page, limit),
  })

  const classes = data?.classes || []
  const total = data?.total || 0
  const totalPages = Math.max(1, Math.ceil(total / limit))

  const filteredClasses = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return classes
    return classes.filter((item) =>
      [item.name, item.semester || '', item.enrollment_code || '', String(item.id)].some((value) =>
        value.toLowerCase().includes(keyword),
      ),
    )
  }, [classes, search])

  useEffect(() => {
    if (filteredClasses.length === 0) {
      setSelectedClassId(null)
      return
    }

    const nextSelectedClass =
      filteredClasses.find((item) => item.id === selectedClassId) ?? filteredClasses[0]
    if (nextSelectedClass && nextSelectedClass.id !== selectedClassId) {
      setSelectedClassId(nextSelectedClass.id)
    }
  }, [filteredClasses, selectedClassId])

  const highlightedClass = filteredClasses.find((item) => item.id === selectedClassId) ?? null

  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['assignment-report-students', highlightedClass?.id],
    queryFn: () => classesService.getClassStudents(highlightedClass!.id),
    enabled: !!highlightedClass?.id,
  })

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['assignment-report-assignments', highlightedClass?.id],
    queryFn: () => classesService.listAssignments(highlightedClass!.id),
    enabled: !!highlightedClass?.id,
  })

  useEffect(() => {
    if (assignments.length === 0) {
      setSelectedAssignmentId(null)
      return
    }

    if (!selectedAssignmentId || !assignments.some((assignment) => assignment.id === selectedAssignmentId)) {
      setSelectedAssignmentId(assignments[0].id)
    }
  }, [assignments, selectedAssignmentId])

  const activeAssignmentId = selectedAssignmentId ?? assignments[0]?.id ?? null

  const { data: assignmentSubmissions = [], isLoading: submissionsLoading } = useQuery({
    queryKey: ['assignment-report-submissions', activeAssignmentId],
    queryFn: () => classesService.getAssignmentSubmissions(activeAssignmentId!),
    enabled: !!activeAssignmentId,
  })

  const reportRows = useMemo<ReportRow[]>(() => {
    const submissionMap = new Map<string, AssignmentSubmissionItem[]>()

    assignmentSubmissions.forEach((submission) => {
      const items = submissionMap.get(submission.user_id) ?? []
      items.push(submission)
      submissionMap.set(submission.user_id, items)
    })

    return students.map((student) => {
      const submissions = (submissionMap.get(student.student_id) ?? []).slice().sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score
        return new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
      })

      return {
        student,
        submissions,
        bestSubmission: buildBestSubmission(submissions),
        latestSubmission: buildLatestSubmission(submissions),
      }
    })
  }, [assignmentSubmissions, students])

  const stats = useMemo(() => {
    const bestSubmissions = reportRows
      .map((row) => row.bestSubmission)
      .filter(Boolean) as AssignmentSubmissionItem[]
    const submittedStudents = reportRows.filter((row) => row.bestSubmission).length
    const lateBestCount = bestSubmissions.filter((submission) => submission.is_late).length
    const totalStudents = reportRows.length
    const averageBestScore =
      totalStudents > 0
        ? Math.round(reportRows.reduce((sum, row) => sum + Number(row.bestSubmission?.score || 0), 0) / totalStudents)
        : 0
    const onTimeRate =
      submittedStudents > 0 ? Math.round(((submittedStudents - lateBestCount) / submittedStudents) * 100) : 0

    return {
      totalClasses: total,
      totalStudents,
      submittedStudents,
      completionRate: totalStudents > 0 ? Math.round((submittedStudents / totalStudents) * 100) : 0,
      averageBestScore,
      onTimeRate,
    }
  }, [reportRows, total])

  const selectedAssignment = assignments.find((item) => item.id === activeAssignmentId) ?? null

  const handleExport = () => {
    if (!highlightedClass) return

    const rows: string[][] = [
      [
        'class_id',
        'class_name',
        'assignment_id',
        'problem_id',
        'student_id',
        'username',
        'email',
        'submission_count',
        'best_score',
        'latest_submission_time',
        'overdue',
        'status',
      ],
      ...reportRows.map((row) => {
        const best = row.bestSubmission
        const latest = row.latestSubmission
        return [
          highlightedClass.id,
          highlightedClass.name,
          selectedAssignment?.id ?? '',
          selectedAssignment?.problem_id ?? '',
          row.student.student_id,
          row.student.username,
          row.student.email,
          row.submissions.length,
          best?.score ?? '',
          latest?.submitted_at ? formatDateTime(latest.submitted_at) : '',
          best ? (best.is_late ? 'true' : 'false') : '',
          getRowStatus(row, selectedAssignment?.points ?? 100),
        ]
      }),
    ]

    downloadCsv(
      `assignment-report-class-${highlightedClass.id}-assignment-${selectedAssignment?.id ?? 'all'}.csv`,
      rows,
    )
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <Loading message="加载教学报告..." />
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        title="作业报告加载失败"
        description="当前无法读取班级和作业数据，页面不会展示假统计。"
        action={
          <Button type="button" onClick={() => refetch()}>
            重试
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="教师工作台"
        breadcrumb={['班级', '作业报告']}
        title="作业报告"
        description="基于真实班级、作业、学生和提交数据生成的报表页。最佳成绩按最高分取，同分时采用更晚提交；导出会按当前筛选范围生成。"
        actions={
          <>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
              刷新
            </Button>
            <Button variant="primary" onClick={handleExport} disabled={!highlightedClass}>
              <ArrowDownToLine className="h-4 w-4" />
              导出表格
            </Button>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="班级总数" value={stats.totalClasses} helper="当前报告可见班级数" />
        <StatCard label="学生总数" value={stats.totalStudents} helper="当前班级学生总数" />
        <StatCard label="已提交人数" value={stats.submittedStudents} helper="至少有一次提交的学生数" />
        <StatCard
          label="完成率"
          value={`${stats.completionRate}%`}
          helper={`平均最高分 ${stats.averageBestScore} · 准时率 ${stats.onTimeRate}%`}
        />
      </section>

      <FilterBar>
        <div className="grid flex-1 gap-3 md:grid-cols-[minmax(0,1.3fr)_minmax(220px,0.7fr)_minmax(220px,0.7fr)]">
          <div className="space-y-2 text-sm min-w-0">
            <label className="block font-medium text-slate-700">搜索班级</label>
            <div className="flex items-center gap-2 rounded-[24px] border border-slate-200/90 bg-[rgba(255,255,255,0.88)] px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-sm">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="班级名称 / 学期 / 邀请码"
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>
          <FieldGroup label="班级">
            <select
              aria-label="班级选择"
              value={highlightedClass?.id ?? ''}
              onChange={(e) => setSelectedClassId(Number(e.target.value))}
              className="w-full rounded-[24px] border border-[rgba(193,201,224,0.36)] bg-[linear-gradient(180deg,rgba(248,250,255,0.98)_0%,rgba(237,242,255,0.96)_100%)] px-4 py-3.5 text-sm font-medium text-[#17305e] shadow-[inset_0_1px_0_rgba(255,255,255,0.88),0_12px_28px_rgba(19,27,46,0.05)] outline-none transition-all duration-200 focus:border-[rgba(12,86,208,0.28)] focus:bg-white focus:ring-4 focus:ring-[rgba(12,86,208,0.09)]"
            >
              <option value="" disabled>
                请选择班级
              </option>
              {filteredClasses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </FieldGroup>
          <FieldGroup label="作业">
            <select
              aria-label="作业选择"
              value={activeAssignmentId ?? ''}
              onChange={(e) => setSelectedAssignmentId(Number(e.target.value))}
              disabled={assignments.length === 0}
              className="w-full rounded-[24px] border border-[rgba(193,201,224,0.36)] bg-[linear-gradient(180deg,rgba(248,250,255,0.98)_0%,rgba(237,242,255,0.96)_100%)] px-4 py-3.5 text-sm font-medium text-[#17305e] shadow-[inset_0_1px_0_rgba(255,255,255,0.88),0_12px_28px_rgba(19,27,46,0.05)] outline-none transition-all duration-200 focus:border-[rgba(12,86,208,0.28)] focus:bg-white focus:ring-4 focus:ring-[rgba(12,86,208,0.09)] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100/80 disabled:text-slate-500"
            >
              <option value="" disabled>
                {assignments.length === 0 ? '暂无作业' : '请选择作业'}
              </option>
              {assignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  题目 #{assignment.problem_id} · {formatDateTime(assignment.deadline)}
                </option>
              ))}
            </select>
          </FieldGroup>
        </div>

        <div className="flex items-center gap-3 text-sm text-slate-500">
          <Filter className="h-4 w-4" />
          <span>
            {page} / {totalPages}
          </span>
          <Button type="button" variant="outline" size="sm" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page <= 1}>
            上一页
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={page >= totalPages}>
            下一页
          </Button>
        </div>
      </FilterBar>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]">
        <section className="overflow-hidden rounded-[30px] border border-slate-200/90 bg-[rgba(255,255,255,0.92)] shadow-[0_16px_36px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200/80 px-6 py-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">学生报表</h2>
              <p className="mt-1 text-sm text-slate-600">
                {highlightedClass ? `${highlightedClass.name} · ${selectedAssignment ? `题目 #${selectedAssignment.problem_id}` : '暂无作业'}` : '请选择班级'}
              </p>
            </div>
            <div className="rounded-2xl bg-blue-50 px-3 py-2 text-xs font-medium uppercase tracking-[0.22em] text-blue-700">
              真实数据
            </div>
          </div>

          {studentsLoading || assignmentsLoading || submissionsLoading ? (
            <div className="flex min-h-[260px] items-center justify-center">
              <Loading message="聚合教学数据..." />
            </div>
          ) : assignments.length === 0 ? (
            <EmptyState
              className="rounded-none border-0 shadow-none"
              title="当前班级暂无作业"
              description="先为这个班级创建并发布作业，再查看真实报表。"
            />
          ) : reportRows.length === 0 ? (
            <EmptyState
              className="rounded-none border-0 shadow-none"
              title="当前班级暂无学生或提交"
              description="添加学生并为该班级创建作业后，这里会显示真实的最佳成绩与逾期信息。"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-[rgba(246,249,253,0.92)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">学生</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">邮箱</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">提交次数</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">最佳分数</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">最近提交</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">逾期</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-[rgba(255,255,255,0.78)]">
                  {reportRows.map((row) => (
                    <tr key={row.student.student_id} className="transition hover:bg-blue-50/50">
                      <TableCell className="font-medium text-slate-900">
                        <div>{row.student.username}</div>
                        <div className="mt-1 text-xs text-slate-500">{row.student.student_id}</div>
                      </TableCell>
                      <TableCell>{row.student.email}</TableCell>
                      <TableCell>
                        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                          {row.submissions.length}
                        </span>
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900">
                        {row.bestSubmission ? row.bestSubmission.score : '—'}
                      </TableCell>
                      <TableCell>
                        {row.latestSubmission ? formatDateTime(row.latestSubmission.submitted_at) : '—'}
                      </TableCell>
                      <TableCell>
                        {row.bestSubmission ? (row.bestSubmission.is_late ? `是 (${row.bestSubmission.late_days} 天)` : '否') : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-3 py-1 text-xs font-semibold',
                            getRowStatus(row, selectedAssignment?.points ?? 100) === '高分通过' && 'bg-emerald-50 text-emerald-700',
                            getRowStatus(row, selectedAssignment?.points ?? 100) === '已逾期' && 'bg-amber-50 text-amber-700',
                            getRowStatus(row, selectedAssignment?.points ?? 100) === '已提交' && 'bg-sky-50 text-sky-700',
                            getRowStatus(row, selectedAssignment?.points ?? 100) === '未提交' && 'bg-slate-100 text-slate-600',
                          )}
                        >
                          {getRowStatus(row, selectedAssignment?.points ?? 100)}
                        </span>
                      </TableCell>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <SectionBlock
            title="当前选择"
            description="班级和作业切换都绑定真实数据，不再渲染静态分析面板。"
          >
            {highlightedClass ? (
              <div className="space-y-4">
                <SurfaceCard tone="muted" className="p-4 shadow-none">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <School2 className="h-4 w-4 text-sky-700" />
                    班级信息
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-slate-500">班级名称</dt>
                      <dd className="font-medium text-slate-900">{highlightedClass.name}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-slate-500">学期</dt>
                      <dd className="font-medium text-slate-900">{highlightedClass.semester || '未设置'}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-slate-500">邀请码</dt>
                      <dd className="font-mono text-sky-700">{highlightedClass.enrollment_code || '—'}</dd>
                    </div>
                  </dl>
                </SurfaceCard>

                <SurfaceCard tone="muted" className="p-4 shadow-none">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <CalendarDays className="h-4 w-4 text-sky-700" />
                    作业信息
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-slate-500">作业编号</dt>
                      <dd className="font-medium text-slate-900">{selectedAssignment ? `#${selectedAssignment.id}` : '—'}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-slate-500">题目编号</dt>
                      <dd className="font-medium text-slate-900">{selectedAssignment ? `#${selectedAssignment.problem_id}` : '—'}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-slate-500">截止时间</dt>
                      <dd className="font-medium text-slate-900">{selectedAssignment ? formatDateTime(selectedAssignment.deadline) : '—'}</dd>
                    </div>
                  </dl>
                </SurfaceCard>
              </div>
            ) : (
              <EmptyState
                className="border-0 p-0 shadow-none"
                title="请选择班级"
                description="先从左侧筛选一个班级，再查看该班级的学生和作业完成情况。"
              />
            )}
          </SectionBlock>

          <SectionBlock
            title="导出说明"
            description="导出的表格按当前班级和作业筛选结果生成。"
          >
            <ul className="space-y-3 text-sm leading-6 text-slate-600">
              <li>最佳成绩按分数最高优先，同分取更晚提交。</li>
              <li>逾期判断取最佳成绩那次提交的逾期状态。</li>
              <li>没有提交的学生仍会保留在表格中，便于定位未完成情况。</li>
            </ul>
          </SectionBlock>
        </aside>
      </div>
    </div>
  )
}
