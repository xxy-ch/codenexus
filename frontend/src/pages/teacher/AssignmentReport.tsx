import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
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
        <LoadingState message="加载教学报告..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-6 md:px-8">
        <EmptyState
          title="作业报告加载失败"
          description="当前无法读取班级和作业数据，页面不会展示假统计。"
          action={{ label: '重试', onClick: () => refetch() }}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
            教师工作台 / 班级 / 作业报告
          </p>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface md:text-5xl">
            作业报告
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-on-surface-variant">
            基于真实班级、作业、学生和提交数据生成的报表页。最佳成绩按最高分取，同分时采用更晚提交；导出会按当前筛选范围生成。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => refetch()}>
            <span className="material-symbols-outlined text-base">refresh</span>
            刷新
          </Button>
          <Button onClick={handleExport} disabled={!highlightedClass}>
            <span className="material-symbols-outlined text-base">download</span>
            导出表格
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card variant="default" className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">班级总数</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-on-surface">{stats.totalClasses}</p>
          <p className="mt-2 text-sm text-on-surface-variant">当前报告可见班级数</p>
        </Card>
        <Card variant="surface" className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">学生总数</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-primary">{stats.totalStudents}</p>
          <p className="mt-2 text-sm text-on-surface-variant">当前班级学生总数</p>
        </Card>
        <Card variant="surface" className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">已提交人数</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-secondary">{stats.submittedStudents}</p>
          <p className="mt-2 text-sm text-on-surface-variant">至少有一次提交的学生数</p>
        </Card>
        <Card variant="surface" className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">完成率</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-tertiary">{stats.completionRate}%</p>
          <p className="mt-2 text-sm text-on-surface-variant">平均最高分 {stats.averageBestScore} · 准时率 {stats.onTimeRate}%</p>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card variant="surface" className="p-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1.3fr)_minmax(200px,0.7fr)_minmax(200px,0.7fr)]">
            <div className="space-y-2">
              <label className="text-sm font-medium text-on-surface">搜索班级</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-base text-on-surface-variant">search</span>
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="班级名称 / 学期 / 邀请码"
                  className="pl-11"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-on-surface">班级</label>
              <Select
                value={highlightedClass?.id ?? ''}
                onChange={(e) => setSelectedClassId(Number(e.target.value))}
              >
                <option value="" disabled>请选择班级</option>
                {filteredClasses.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-on-surface">作业</label>
              <Select
                value={activeAssignmentId ?? ''}
                onChange={(e) => setSelectedAssignmentId(Number(e.target.value))}
                disabled={assignments.length === 0}
              >
                <option value="" disabled>{assignments.length === 0 ? '暂无作业' : '请选择作业'}</option>
                {assignments.map((assignment) => (
                  <option key={assignment.id} value={assignment.id}>
                    题目 #{assignment.problem_id} · {formatDateTime(assignment.deadline)}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-base">filter_alt</span>
            <span>{page} / {totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
            >
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
            >
              下一页
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]">
        {/* Main Content */}
        <Card variant="default" className="overflow-hidden p-0">
          <div className="flex flex-col gap-3 border-b border-outline-variant/10 px-6 py-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-headline text-xl font-extrabold text-on-surface">学生报表</h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                {highlightedClass ? `${highlightedClass.name} · ${selectedAssignment ? `题目 #${selectedAssignment.problem_id}` : '暂无作业'}` : '请选择班级'}
              </p>
            </div>
            <span className="rounded-full bg-primary-container px-3 py-2 text-xs font-semibold uppercase tracking-wider text-on-primary-container">
              真实数据
            </span>
          </div>

          {studentsLoading || assignmentsLoading || submissionsLoading ? (
            <div className="flex min-h-[260px] items-center justify-center">
              <LoadingState message="聚合教学数据..." />
            </div>
          ) : assignments.length === 0 ? (
            <EmptyState
              className="border-0 shadow-none"
              title="当前班级暂无作业"
              description="先为这个班级创建并发布作业，再查看真实报表。"
            />
          ) : reportRows.length === 0 ? (
            <EmptyState
              className="border-0 shadow-none"
              title="当前班级暂无学生或提交"
              description="添加学生并为该班级创建作业后，这里会显示真实的最佳成绩与逾期信息。"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-outline-variant/10">
                <thead className="bg-surface-container-low/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">学生</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">邮箱</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">提交次数</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">最佳分数</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">最近提交</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">逾期</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-on-surface-variant">状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {reportRows.map((row) => (
                    <tr key={row.student.student_id} className="transition-colors hover:bg-surface-container-low/30">
                      <td className="px-6 py-4 text-sm font-medium text-on-surface">
                        <p>{row.student.username}</p>
                        <p className="mt-1 text-xs text-on-surface-variant">{row.student.student_id}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-on-surface">{row.student.email}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-full bg-surface-container-high px-3 py-1 text-sm font-medium text-on-surface">
                          {row.submissions.length}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-on-surface">
                        {row.bestSubmission ? row.bestSubmission.score : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-on-surface">
                        {row.latestSubmission ? formatDateTime(row.latestSubmission.submitted_at) : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-on-surface">
                        {row.bestSubmission ? (row.bestSubmission.is_late ? `是 (${row.bestSubmission.late_days} 天)` : '否') : '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-3 py-1 text-xs font-semibold',
                            getRowStatus(row, selectedAssignment?.points ?? 100) === '高分通过' && 'bg-tertiary-container text-on-tertiary-container',
                            getRowStatus(row, selectedAssignment?.points ?? 100) === '已逾期' && 'bg-secondary-container text-on-secondary-container',
                            getRowStatus(row, selectedAssignment?.points ?? 100) === '已提交' && 'bg-primary-container text-on-primary-container',
                            getRowStatus(row, selectedAssignment?.points ?? 100) === '未提交' && 'bg-surface-container-high text-on-surface-variant',
                          )}
                        >
                          {getRowStatus(row, selectedAssignment?.points ?? 100)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Sidebar */}
        <aside className="space-y-6">
          <Card variant="default" className="p-5">
            <h2 className="font-headline text-lg font-extrabold text-on-surface">当前选择</h2>
            <p className="mt-1 text-sm text-on-surface-variant">班级和作业切换都绑定真实数据，不再渲染静态分析面板。</p>
            {highlightedClass ? (
              <div className="space-y-4">
                <Card variant="surface" className="p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-on-surface">
                    <span className="material-symbols-outlined text-lg text-primary">school</span>
                    班级信息
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-on-surface-variant">班级名称</dt>
                      <dd className="font-medium text-on-surface">{highlightedClass.name}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-on-surface-variant">学期</dt>
                      <dd className="font-medium text-on-surface">{highlightedClass.semester || '未设置'}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-on-surface-variant">邀请码</dt>
                      <dd className="font-mono text-primary">{highlightedClass.enrollment_code || '—'}</dd>
                    </div>
                  </dl>
                </Card>

                <Card variant="surface" className="p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-on-surface">
                    <span className="material-symbols-outlined text-lg text-primary">calendar_today</span>
                    作业信息
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-on-surface-variant">作业编号</dt>
                      <dd className="font-medium text-on-surface">{selectedAssignment ? `#${selectedAssignment.id}` : '—'}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-on-surface-variant">题目编号</dt>
                      <dd className="font-medium text-on-surface">{selectedAssignment ? `#${selectedAssignment.problem_id}` : '—'}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-on-surface-variant">截止时间</dt>
                      <dd className="font-medium text-on-surface">{selectedAssignment ? formatDateTime(selectedAssignment.deadline) : '—'}</dd>
                    </div>
                  </dl>
                </Card>
              </div>
            ) : (
              <EmptyState
                className="border-0 p-0 shadow-none"
                title="请选择班级"
                description="先从左侧筛选一个班级，再查看该班级的学生和作业完成情况。"
              />
            )}
          </Card>

          <Card variant="surface" className="p-5">
            <h2 className="font-headline text-lg font-extrabold text-on-surface">导出说明</h2>
            <p className="mt-1 text-sm text-on-surface-variant">导出的表格按当前班级和作业筛选结果生成。</p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-on-surface-variant">
              <li>最佳成绩按分数最高优先，同分取更晚提交。</li>
              <li>逾期判断取最佳成绩那次提交的逾期状态。</li>
              <li>没有提交的学生仍会保留在表格中，便于定位未完成情况。</li>
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  )
}
