import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, GraduationCap, Mail, Users } from 'lucide-react'
import { ActionBar } from '@/components/page/ActionBar'
import { EmptyState } from '@/components/page/EmptyState'
import { FieldGroup } from '@/components/page/FieldGroup'
import { FilterBar } from '@/components/page/FilterBar'
import { PageHeader } from '@/components/page/PageHeader'
import { SectionBlock } from '@/components/page/SectionBlock'
import { StatCard } from '@/components/page/StatCard'
import { SurfaceCard } from '@/components/page/SurfaceCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Loading } from '@/components/ui/Loading'
import { classesService } from '@/services/classes'
import { cn, formatDateTime } from '@/lib/utils'

function TableCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn('px-4 py-3 text-sm text-slate-600', className)}>{children}</td>
}

export function ClassManagement() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [newClassName, setNewClassName] = useState('')
  const [newSemester, setNewSemester] = useState('')
  const [studentEmail, setStudentEmail] = useState('')
  const [studentImport, setStudentImport] = useState('')
  const [assignmentProblemId, setAssignmentProblemId] = useState('')
  const [assignmentDeadline, setAssignmentDeadline] = useState('')
  const [assignmentPoints, setAssignmentPoints] = useState('100')
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null)
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null)
  const limit = 20

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['classes', page],
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

  const { data: students = [] } = useQuery({
    queryKey: ['classStudents', highlightedClass?.id],
    queryFn: () => classesService.getClassStudents(highlightedClass!.id),
    enabled: !!highlightedClass?.id,
  })

  const { data: assignments = [] } = useQuery({
    queryKey: ['classAssignments', highlightedClass?.id],
    queryFn: () => classesService.listAssignments(highlightedClass!.id),
    enabled: !!highlightedClass?.id,
  })

  const activeAssignmentId = selectedAssignmentId ?? assignments[0]?.id ?? null

  const { data: assignmentSubmissions = [] } = useQuery({
    queryKey: ['assignmentSubmissions', activeAssignmentId],
    queryFn: () => classesService.getAssignmentSubmissions(activeAssignmentId!),
    enabled: !!activeAssignmentId,
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['classes'] })
    if (highlightedClass?.id) {
      void queryClient.invalidateQueries({ queryKey: ['classStudents', highlightedClass.id] })
      void queryClient.invalidateQueries({ queryKey: ['classAssignments', highlightedClass.id] })
    }
    if (activeAssignmentId) {
      void queryClient.invalidateQueries({ queryKey: ['assignmentSubmissions', activeAssignmentId] })
    }
  }

  const createClassMutation = useMutation({
    mutationFn: () =>
      classesService.createClass({
        organization_id: 1,
        campus_id: 1,
        name: newClassName,
        semester: newSemester || undefined,
      }),
    onSuccess: () => {
      setNewClassName('')
      setNewSemester('')
      setSelectedClassId(null)
      invalidate()
    },
  })

  const addStudentMutation = useMutation({
    mutationFn: () => classesService.addStudent(highlightedClass!.id, studentEmail),
    onSuccess: () => {
      setStudentEmail('')
      invalidate()
    },
  })

  const importStudentsMutation = useMutation({
    mutationFn: () =>
      classesService.batchImportStudents(
        highlightedClass!.id,
        studentImport
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    onSuccess: () => {
      setStudentImport('')
      invalidate()
    },
  })

  const createAssignmentMutation = useMutation({
    mutationFn: () =>
      classesService.createAssignment(highlightedClass!.id, {
        problem_id: Number(assignmentProblemId),
        deadline: assignmentDeadline,
        points: Number(assignmentPoints),
      }),
    onSuccess: (created) => {
      setAssignmentProblemId('')
      setAssignmentDeadline('')
      setAssignmentPoints('100')
      setSelectedAssignmentId(created.id)
      invalidate()
    },
  })

  const publishAssignmentMutation = useMutation({
    mutationFn: (assignmentId: number) => classesService.publishAssignment(assignmentId),
    onSuccess: (_, assignmentId) => {
      setSelectedAssignmentId(assignmentId)
      invalidate()
    },
  })

  const deleteAssignmentMutation = useMutation({
    mutationFn: (assignmentId: number) => classesService.deleteAssignment(assignmentId),
    onSuccess: () => {
      setSelectedAssignmentId(null)
      invalidate()
    },
  })

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loading message="加载班级中..." />
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        title="班级加载失败"
        description="当前无法读取班级列表，写操作也不会展示假结果。"
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
        eyebrow="Teacher Workspace"
        breadcrumb={['Classes', 'Class Management']}
        title="班级管理"
        description="保留真实写路径：建班、按邮箱添加学生、批量导入、创建作业、发布作业，以及按作业查看真实提交。所有写操作都绑定当前显式选中的班级。"
        actions={
          <div className="rounded-full border border-slate-200/90 bg-[rgba(246,249,253,0.92)] px-4 py-2 text-sm font-medium text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
            Live write paths enabled
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Classes" value={total} helper="当前教师可见班级总数" />
        <StatCard
          label="Current Focus"
          value={highlightedClass?.name || '未选择'}
          helper={highlightedClass?.semester || '未设置学期'}
        />
        <StatCard
          label="Enrollment Code"
          value={<span className="font-mono text-[1.65rem] text-sky-700">{highlightedClass?.enrollment_code || '—'}</span>}
          helper="学生可通过真实邀请码入班"
        />
        <StatCard
          label="Assignments"
          value={assignments.length}
          helper={`Students ${students.length}`}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(320px,360px)_minmax(0,1fr)]">
        <div className="space-y-6">
          <SectionBlock
            title="创建班级"
            description="新班级创建后会回到当前列表，并继续使用真实邀请码和学生写路径。"
          >
            <div className="space-y-4">
              <FieldGroup label="班级名称">
                <Input value={newClassName} onChange={(e) => setNewClassName(e.target.value)} placeholder="班级名称" />
              </FieldGroup>
              <FieldGroup label="学期">
                <Input value={newSemester} onChange={(e) => setNewSemester(e.target.value)} placeholder="学期，例如 2026 春" />
              </FieldGroup>
              <ActionBar className="border-0 bg-transparent p-0 shadow-none">
                <Button
                  type="button"
                  fullWidth
                  onClick={() => createClassMutation.mutate()}
                  disabled={!newClassName || createClassMutation.isPending}
                >
                  {createClassMutation.isPending ? '创建中...' : '创建班级'}
                </Button>
              </ActionBar>
            </div>
          </SectionBlock>

          <SectionBlock
            title="班级成员管理"
            description={`当前班级：${highlightedClass?.name || '先选择班级'}`}
          >
            <div className="space-y-5">
              <SurfaceCard tone="muted" className="border-dashed p-4 shadow-none">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <GraduationCap className="h-4 w-4 text-sky-700" />
                  邀请码
                </div>
                <div className="mt-3 rounded-[24px] border border-slate-200/90 bg-[rgba(255,255,255,0.88)] px-4 py-3 font-mono text-base text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                  {highlightedClass?.enrollment_code || '—'}
                </div>
                <p className="mt-2 text-sm text-slate-500">学生可通过真实邀请码入班接口加入该班级。</p>
              </SurfaceCard>

              <div className="space-y-4">
                <FieldGroup label="按邮箱添加学生">
                  <Input value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} placeholder="学生邮箱" />
                </FieldGroup>
                <Button
                  type="button"
                  fullWidth
                  variant="outline"
                  onClick={() => addStudentMutation.mutate()}
                  disabled={!highlightedClass || !studentEmail || addStudentMutation.isPending}
                >
                  {addStudentMutation.isPending ? '添加中...' : '按邮箱添加学生'}
                </Button>
              </div>

              <div className="space-y-4">
                <FieldGroup label="批量导入学生" description="每行一个邮箱地址。">
                  <textarea
                    value={studentImport}
                    onChange={(e) => setStudentImport(e.target.value)}
                    placeholder="批量导入邮箱，每行一个"
                    className="min-h-[132px] w-full rounded-[24px] border border-slate-200/90 bg-[rgba(255,255,255,0.88)] px-4 py-3 text-sm text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.05)] outline-none transition-colors focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  />
                </FieldGroup>
                <Button
                  type="button"
                  fullWidth
                  variant="outline"
                  onClick={() => importStudentsMutation.mutate()}
                  disabled={!highlightedClass || !studentImport.trim() || importStudentsMutation.isPending}
                >
                  {importStudentsMutation.isPending ? '导入中...' : '批量导入学生'}
                </Button>
              </div>
            </div>
          </SectionBlock>
        </div>

        <div className="space-y-6">
          <FilterBar>
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[24px] border border-slate-200/90 bg-[rgba(246,249,253,0.92)] px-3 py-2 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
              <Mail className="h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索班级 / 学期 / 邀请码"
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>
            <div className="text-sm text-slate-500">
              {page} / {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page <= 1}>
                Prev
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={page >= totalPages}>
                Next
              </Button>
            </div>
          </FilterBar>

          <SectionBlock
            title="班级列表"
            description="显式选择班级后，成员与作业写操作都会绑定到该班级。"
          >
            {filteredClasses.length === 0 ? (
              <EmptyState
                className="border-0 p-0 shadow-none"
                title="没有匹配的班级"
                description={classes.length === 0 ? '先创建一个班级以开始教学管理。' : '调整搜索条件后再试。'}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Class</th>
                      <th className="px-4 py-3">Semester</th>
                      <th className="px-4 py-3">Invite Code</th>
                      <th className="px-4 py-3 text-right">Students</th>
                      <th className="px-4 py-3 text-right">Select</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredClasses.map((item) => (
                      <tr
                        key={item.id}
                        className={cn(
                          'cursor-pointer transition-colors hover:bg-slate-50',
                          highlightedClass?.id === item.id && 'bg-sky-50/60',
                        )}
                        onClick={() => {
                          setSelectedClassId(item.id)
                          setSelectedAssignmentId(null)
                        }}
                      >
                        <TableCell className="font-medium text-slate-900">{item.name}</TableCell>
                        <TableCell>{item.semester || '未设置'}</TableCell>
                        <TableCell className="font-mono text-sky-700">{item.enrollment_code}</TableCell>
                        <TableCell className="text-right">{item.student_count ?? 0}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant={highlightedClass?.id === item.id ? 'primary' : 'outline'}
                            onClick={(event) => {
                              event.stopPropagation()
                              setSelectedClassId(item.id)
                              setSelectedAssignmentId(null)
                            }}
                          >
                            {highlightedClass?.id === item.id ? `已选中 ${item.name}` : `选择 ${item.name}`}
                          </Button>
                        </TableCell>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionBlock>

          <div className="grid gap-6 xl:grid-cols-[minmax(280px,320px)_minmax(0,1fr)]">
            <SectionBlock
              title="创建作业"
              description="新作业会写入当前选中班级，并自动切换到该作业的真实提交记录。"
            >
              <div className="space-y-4">
                <FieldGroup label="题目 ID">
                  <Input value={assignmentProblemId} onChange={(e) => setAssignmentProblemId(e.target.value)} placeholder="题目 ID" />
                </FieldGroup>
                <FieldGroup label="截止时间">
                  <input
                    aria-label="assignment deadline"
                    type="datetime-local"
                    value={assignmentDeadline}
                    onChange={(e) => setAssignmentDeadline(e.target.value)}
                    className="w-full rounded-[24px] border border-slate-200/90 bg-[rgba(255,255,255,0.88)] px-4 py-3 text-sm text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.05)] outline-none transition-colors focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  />
                </FieldGroup>
                <FieldGroup label="分值">
                  <Input value={assignmentPoints} onChange={(e) => setAssignmentPoints(e.target.value)} placeholder="分值" />
                </FieldGroup>
                <ActionBar className="border-0 bg-transparent p-0 shadow-none">
                  <Button
                    type="button"
                    fullWidth
                    onClick={() => createAssignmentMutation.mutate()}
                    disabled={!highlightedClass || !assignmentProblemId || !assignmentDeadline || createAssignmentMutation.isPending}
                  >
                    {createAssignmentMutation.isPending ? '创建中...' : '创建作业'}
                  </Button>
                </ActionBar>
              </div>
            </SectionBlock>

            <div className="space-y-6">
              <SectionBlock
                title="班级学生"
                description="当前选中班级的真实学生清单与完成情况。"
              >
                {students.length === 0 ? (
                  <EmptyState
                    className="border-0 p-0 shadow-none"
                    title="当前班级暂无学生记录"
                    description="可先通过邀请码、邮箱或批量导入添加学生。"
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Student</th>
                          <th className="px-4 py-3">Email</th>
                          <th className="px-4 py-3 text-right">Progress</th>
                          <th className="px-4 py-3 text-right">Average</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {students.map((student) => (
                          <tr key={student.student_id}>
                            <TableCell className="font-medium text-slate-900">{student.username}</TableCell>
                            <TableCell>{student.email}</TableCell>
                            <TableCell className="text-right">
                              {student.completed_assignments}/{student.total_assignments}
                            </TableCell>
                            <TableCell className="text-right">{student.average_score}</TableCell>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionBlock>

              <SectionBlock
                title="作业与提交记录"
                description="发布作业后可直接查看当前班级该题目的真实提交记录。"
              >
                <div className="space-y-5">
                  {assignments.length === 0 ? (
                    <EmptyState
                      className="border-0 p-0 shadow-none"
                      title="当前班级暂无作业"
                      description="先为这个班级创建至少一个作业。"
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          <tr>
                            <th className="px-4 py-3">Assignment</th>
                            <th className="px-4 py-3">Deadline</th>
                            <th className="px-4 py-3 text-center">Published</th>
                            <th className="px-4 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {assignments.map((assignment) => (
                            <tr key={assignment.id} className={cn(activeAssignmentId === assignment.id && 'bg-sky-50/60')}>
                              <TableCell className="font-medium text-slate-900">Problem #{assignment.problem_id}</TableCell>
                              <TableCell>{formatDateTime(assignment.deadline)}</TableCell>
                              <TableCell className="text-center">{assignment.published_at ? 'Yes' : 'No'}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button type="button" size="sm" variant="outline" onClick={() => setSelectedAssignmentId(assignment.id)}>
                                    查看提交
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => publishAssignmentMutation.mutate(assignment.id)}
                                    disabled={publishAssignmentMutation.isPending}
                                  >
                                    发布
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="danger"
                                    onClick={() => deleteAssignmentMutation.mutate(assignment.id)}
                                    disabled={deleteAssignmentMutation.isPending}
                                  >
                                    删除
                                  </Button>
                                </div>
                              </TableCell>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <SurfaceCard tone="muted" className="p-0 shadow-none">
                    <div className="border-b border-slate-200 px-5 py-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <BookOpen className="h-4 w-4 text-sky-700" />
                        Assignment Submissions
                      </div>
                    </div>
                    <div className="overflow-x-auto px-5 py-4">
                      {assignmentSubmissions.length === 0 ? (
                        <EmptyState
                          className="border-0 p-0 shadow-none"
                          title="当前作业暂无提交记录"
                          description="学生提交后，这里会显示真实得分和逾期信息。"
                        />
                      ) : (
                        <table className="min-w-full">
                          <thead className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            <tr>
                              <th className="px-2 py-3">Submission</th>
                              <th className="px-2 py-3">User</th>
                              <th className="px-2 py-3">Score</th>
                              <th className="px-2 py-3">Late</th>
                              <th className="px-2 py-3">Submitted At</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {assignmentSubmissions.map((submission) => (
                              <tr key={submission.id}>
                                <td className="px-2 py-3 text-sm text-slate-700">#{submission.submission_id}</td>
                                <td className="px-2 py-3 font-mono text-xs text-slate-500">{submission.user_id}</td>
                                <td className="px-2 py-3 text-sm text-slate-700">{submission.score}</td>
                                <td className="px-2 py-3 text-sm text-slate-700">
                                  {submission.is_late ? `Yes (${submission.late_days}d)` : 'No'}
                                </td>
                                <td className="px-2 py-3 text-sm text-slate-700">{formatDateTime(submission.submitted_at)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </SurfaceCard>
                </div>
              </SectionBlock>
            </div>
          </div>
        </div>
      </div>

      <SurfaceCard tone="muted" className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Users className="h-4 w-4 text-sky-700" />
          班级选择、作业写入和提交浏览都以当前高亮班级为准，不再使用首条列表作为隐式目标。
        </div>
        <div className="text-sm text-slate-500">Chrome 96+ safe layout</div>
      </SurfaceCard>
    </div>
  )
}
