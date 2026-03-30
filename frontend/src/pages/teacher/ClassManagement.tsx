import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { classesService } from '@/services/classes'
import { cn, formatDateTime } from '@/lib/utils'

function TableCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn('px-4 py-3 text-sm text-on-surface', className)}>{children}</td>
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
    queryClient.invalidateQueries({ queryKey: ['classes'] })
    if (highlightedClass?.id) {
      queryClient.invalidateQueries({ queryKey: ['classStudents', highlightedClass.id] })
      queryClient.invalidateQueries({ queryKey: ['classAssignments', highlightedClass.id] })
    }
    if (activeAssignmentId) {
      queryClient.invalidateQueries({ queryKey: ['assignmentSubmissions', activeAssignmentId] })
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
        <LoadingState message="加载班级中..." />
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        title="班级加载失败"
        description="当前无法读取班级列表，写操作也不会展示假结果"
        action={{ label: '重试', onClick: () => refetch() }}
      />
    )
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
            教师工作台 / 班级 / 班级管理
          </p>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface md:text-5xl">
            班级管理
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-on-surface-variant">
            保留真实写路径：建班、按邮箱添加学生、批量导入、创建作业、发布作业，以及按作业查看真实提交。
          </p>
        </div>
        <div className="rounded-full bg-surface-container-high px-4 py-2 text-sm font-medium text-on-surface-variant">
          真实写路径已接通
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card variant="default" className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">班级总数</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-on-surface">{total}</p>
          <p className="mt-2 text-sm text-on-surface-variant">当前教师可见班级总数</p>
        </Card>
        <Card variant="surface" className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">当前焦点</p>
          <p className="mt-4 font-headline text-2xl font-bold text-on-surface">{highlightedClass?.name || '未选择'}</p>
          <p className="mt-2 text-sm text-on-surface-variant">{highlightedClass?.semester || '未设置学期'}</p>
        </Card>
        <Card variant="surface" className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">邀请码</p>
          <p className="mt-4 font-headline text-2xl font-bold text-primary font-mono">{highlightedClass?.enrollment_code || '—'}</p>
          <p className="mt-2 text-sm text-on-surface-variant">学生可通过真实邀请码入班</p>
        </Card>
        <Card variant="surface" className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">作业数量</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-tertiary">{assignments.length}</p>
          <p className="mt-2 text-sm text-on-surface-variant">学生 {students.length} 人</p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Create Class */}
          <Card variant="default" className="p-6">
            <div className="mb-4">
              <h2 className="font-headline text-xl font-extrabold text-on-surface">创建班级</h2>
              <p className="mt-2 text-sm text-on-surface-variant">新班级创建后会回到当前列表</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-on-surface">班级名称</label>
                <Input value={newClassName} onChange={(e) => setNewClassName(e.target.value)} placeholder="班级名称" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-on-surface">学期</label>
                <Input value={newSemester} onChange={(e) => setNewSemester(e.target.value)} placeholder="学期，例如 2026 春" />
              </div>
              <Button
                fullWidth
                onClick={() => createClassMutation.mutate()}
                disabled={!newClassName || createClassMutation.isPending}
              >
                {createClassMutation.isPending ? '创建中...' : '创建班级'}
              </Button>
            </div>
          </Card>

          {/* Class Members */}
          <Card variant="default" className="p-6">
            <div className="mb-4">
              <h2 className="font-headline text-xl font-extrabold text-on-surface">班级成员管理</h2>
              <p className="mt-2 text-sm text-on-surface-variant">当前班级：{highlightedClass?.name || '先选择班级'}</p>
            </div>
            <div className="space-y-5">
              <Card variant="surface" className="border-dashed p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-on-surface">
                  <span className="material-symbols-outlined text-lg text-tertiary">school</span>
                  邀请码
                </div>
                <div className="mt-3 rounded-lg bg-surface px-4 py-3 font-mono text-base text-on-surface">
                  {highlightedClass?.enrollment_code || '—'}
                </div>
                <p className="mt-2 text-sm text-on-surface-variant">学生可通过真实邀请码入班接口加入</p>
              </Card>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface">按邮箱添加学生</label>
                  <Input value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} placeholder="学生邮箱" />
                </div>
                <Button
                  fullWidth
                  variant="outline"
                  onClick={() => addStudentMutation.mutate()}
                  disabled={!highlightedClass || !studentEmail || addStudentMutation.isPending}
                >
                  {addStudentMutation.isPending ? '添加中...' : '按邮箱添加学生'}
                </Button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface">批量导入学生</label>
                  <p className="text-xs text-on-surface-variant">每行一个邮箱地址</p>
                  <Textarea
                    value={studentImport}
                    onChange={(e) => setStudentImport(e.target.value)}
                    placeholder="批量导入邮箱，每行一个"
                    rows={6}
                  />
                </div>
                <Button
                  fullWidth
                  variant="outline"
                  onClick={() => importStudentsMutation.mutate()}
                  disabled={!highlightedClass || !studentImport.trim() || importStudentsMutation.isPending}
                >
                  {importStudentsMutation.isPending ? '导入中...' : '批量导入学生'}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Filters */}
          <Card className="p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative min-w-0 flex-1">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant">search</span>
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索班级 / 学期 / 邀请码"
                  className="pl-12"
                />
              </div>
              <div className="text-sm text-on-surface-variant">
                {page} / {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page <= 1}>
                  上一页
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={page >= totalPages}>
                  下一页
                </Button>
              </div>
            </div>
          </Card>

          {/* Class List */}
          <Card variant="default" className="p-6">
            <div className="mb-4">
              <h2 className="font-headline text-xl font-extrabold text-on-surface">班级列表</h2>
              <p className="mt-2 text-sm text-on-surface-variant">显式选择班级后，成员与作业写操作都会绑定到该班级</p>
            </div>

            {filteredClasses.length === 0 ? (
              <EmptyState
                title="没有匹配的班级"
                description={classes.length === 0 ? '先创建一个班级以开始教学管理' : '调整搜索条件后再试'}
                icon={<span className="material-symbols-outlined text-6xl text-on-surface-variant">class</span>}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-outline-variant/10">
                  <thead className="bg-surface-container-low/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">班级</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">学期</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">邀请码</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-on-surface-variant">学生数</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-on-surface-variant">选择</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {filteredClasses.map((item) => (
                      <tr
                        key={item.id}
                        className={cn(
                          'cursor-pointer transition-colors hover:bg-surface-container-low/30',
                          highlightedClass?.id === item.id && 'bg-primary-container/30',
                        )}
                        onClick={() => {
                          setSelectedClassId(item.id)
                          setSelectedAssignmentId(null)
                        }}
                      >
                        <TableCell className="font-medium text-on-surface">{item.name}</TableCell>
                        <TableCell>{item.semester || '未设置'}</TableCell>
                        <TableCell className="font-mono text-primary">{item.enrollment_code}</TableCell>
                        <TableCell className="text-right">{item.student_count ?? 0}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant={highlightedClass?.id === item.id ? 'default' : 'outline'}
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
          </Card>

          <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
            {/* Create Assignment */}
            <Card variant="default" className="p-6">
              <div className="mb-4">
                <h2 className="font-headline text-xl font-extrabold text-on-surface">创建作业</h2>
                <p className="mt-2 text-sm text-on-surface-variant">新作业会写入当前选中班级</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface">题目 ID</label>
                  <Input value={assignmentProblemId} onChange={(e) => setAssignmentProblemId(e.target.value)} placeholder="题目 ID" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface">截止时间</label>
                  <Input
                    type="datetime-local"
                    value={assignmentDeadline}
                    onChange={(e) => setAssignmentDeadline(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface">分值</label>
                  <Input value={assignmentPoints} onChange={(e) => setAssignmentPoints(e.target.value)} />
                </div>
                <Button
                  fullWidth
                  onClick={() => createAssignmentMutation.mutate()}
                  disabled={!highlightedClass || !assignmentProblemId || !assignmentDeadline || createAssignmentMutation.isPending}
                >
                  {createAssignmentMutation.isPending ? '创建中...' : '创建作业'}
                </Button>
              </div>
            </Card>

            {/* Students & Assignments */}
            <div className="space-y-6">
              {/* Students */}
              <Card variant="default" className="p-6">
                <div className="mb-4">
                  <h2 className="font-headline text-xl font-extrabold text-on-surface">班级学生</h2>
                  <p className="mt-2 text-sm text-on-surface-variant">当前选中班级的真实学生清单</p>
                </div>
                {students.length === 0 ? (
                  <EmptyState
                    title="当前班级暂无学生记录"
                    description="可通过邀请码、邮箱或批量导入添加学生"
                    icon={<span className="material-symbols-outlined text-6xl text-on-surface-variant">person_off</span>}
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-outline-variant/10">
                      <thead className="bg-surface-container-low/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">学生</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">邮箱</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-on-surface-variant">进度</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-on-surface-variant">平均分</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/10">
                        {students.map((student) => (
                          <tr key={student.student_id}>
                            <TableCell className="font-medium text-on-surface">{student.username}</TableCell>
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
              </Card>

              {/* Assignments */}
              <Card variant="default" className="p-6">
                <div className="mb-4">
                  <h2 className="font-headline text-xl font-extrabold text-on-surface">作业与提交记录</h2>
                  <p className="mt-2 text-sm text-on-surface-variant">发布作业后可直接查看真实提交记录</p>
                </div>
                <div className="space-y-5">
                  {assignments.length === 0 ? (
                    <EmptyState
                      title="当前班级暂无作业"
                      description="先为这个班级创建至少一个作业"
                      icon={<span className="material-symbols-outlined text-6xl text-on-surface-variant">assignment</span>}
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-outline-variant/10">
                        <thead className="bg-surface-container-low/50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">作业</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">截止时间</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-on-surface-variant">已发布</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-on-surface-variant">操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/10">
                          {assignments.map((assignment) => (
                            <tr key={assignment.id} className={cn(activeAssignmentId === assignment.id && 'bg-primary-container/30')}>
                              <TableCell className="font-medium text-on-surface">题目 #{assignment.problem_id}</TableCell>
                              <TableCell>{formatDateTime(assignment.deadline)}</TableCell>
                              <TableCell className="text-center">{assignment.published_at ? '是' : '否'}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button size="sm" variant="outline" onClick={() => setSelectedAssignmentId(assignment.id)}>
                                    查看提交
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => publishAssignmentMutation.mutate(assignment.id)}
                                    disabled={publishAssignmentMutation.isPending}
                                  >
                                    发布
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="border-error-container text-error hover:bg-error-container/10"
                                    onClick={() => {
                                      if (window.confirm('确认删除此作业？')) {
                                        deleteAssignmentMutation.mutate(assignment.id)
                                      }
                                    }}
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

                  {/* Submissions */}
                  {assignmentSubmissions.length > 0 ? (
                    <Card variant="surface" className="overflow-hidden p-0">
                      <div className="border-b border-outline-variant/10 px-5 py-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-on-surface">
                          <span className="material-symbols-outlined text-lg text-tertiary">menu_book</span>
                          作业提交记录
                        </div>
                      </div>
                      <div className="overflow-x-auto px-5 py-4">
                        <table className="min-w-full divide-y divide-outline-variant/10">
                          <thead className="bg-surface-container-low/50">
                            <tr>
                              <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">提交号</th>
                              <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">用户</th>
                              <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">分数</th>
                              <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">逾期</th>
                              <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">提交时间</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/10">
                            {assignmentSubmissions.map((submission) => (
                              <tr key={submission.id}>
                                <td className="px-2 py-3 text-sm text-on-surface">#{submission.submission_id}</td>
                                <td className="px-2 py-3 font-mono text-xs text-on-surface-variant">{submission.user_id}</td>
                                <td className="px-2 py-3 text-sm text-on-surface">{submission.score}</td>
                                <td className="px-2 py-3 text-sm text-on-surface">
                                  {submission.is_late ? `是 (${submission.late_days}天)` : '否'}
                                </td>
                                <td className="px-2 py-3 text-sm text-on-surface-variant">{formatDateTime(submission.submitted_at)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  ) : null}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Info Footer */}
      <Card variant="surface" className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 text-sm text-on-surface-variant">
          <span className="material-symbols-outlined text-lg text-tertiary">groups</span>
          班级选择、作业写入和提交浏览都以当前高亮班级为准
        </div>
        <div className="text-sm text-on-surface-variant">统一教师工作台布局</div>
      </Card>
    </div>
  )
}

export default ClassManagement
