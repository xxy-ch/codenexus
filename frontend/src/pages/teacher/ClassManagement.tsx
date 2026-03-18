import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { classesService } from '@/services/classes'
import { Loading } from '@/components/ui/Loading'

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
    return classes.filter((item) => [item.name, item.semester || '', item.enrollment_code || '', String(item.id)].some((value) => value.toLowerCase().includes(keyword)))
  }, [classes, search])

  useEffect(() => {
    if (filteredClasses.length === 0) {
      setSelectedClassId(null)
      return
    }

    const nextSelectedClass = filteredClasses.find((item) => item.id === selectedClassId) ?? filteredClasses[0]
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
    mutationFn: () => classesService.batchImportStudents(
      highlightedClass!.id,
      studentImport.split('\n').map((item) => item.trim()).filter(Boolean),
    ),
    onSuccess: () => {
      setStudentImport('')
      invalidate()
    },
  })

  const createAssignmentMutation = useMutation({
    mutationFn: () => classesService.createAssignment(highlightedClass!.id, {
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
    return <div className="flex min-h-[400px] items-center justify-center"><Loading message="加载班级中..." /></div>
  }

  if (error) {
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-slate-600">班级加载失败</p>
        <button type="button" onClick={() => refetch()} className="rounded bg-primary px-4 py-2 text-white">重试</button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="relative px-6 py-7 md:px-8">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_58%,#eff6ff_100%)]" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>Teacher</span>
                <span>/</span>
                <span className="font-medium text-slate-900">Classes</span>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950">班级管理</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  当前页面已接通真实写路径：建班、邀请码入班、按邮箱加人、批量导入、创建作业、发布作业，以及按作业查看提交记录。
                </p>
              </div>
            </div>
            <div className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Live write paths enabled</div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Classes</div>
          <div className="mt-3 text-3xl font-semibold text-slate-950">{total}</div>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Current Focus</div>
          <div className="mt-3 text-lg font-semibold text-slate-950">{highlightedClass?.name || '未选择'}</div>
          <div className="mt-1 text-sm text-slate-500">{highlightedClass?.semester || '未设置学期'}</div>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Enrollment Code</div>
          <div className="mt-3 font-mono text-2xl font-semibold text-blue-700">{highlightedClass?.enrollment_code || '—'}</div>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Assignments</div>
          <div className="mt-3 text-3xl font-semibold text-slate-950">{assignments.length}</div>
          <div className="mt-1 text-sm text-slate-500">Students {students.length}</div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">创建班级</h2>
            <div className="mt-4 space-y-3">
              <input value={newClassName} onChange={(e) => setNewClassName(e.target.value)} placeholder="班级名称" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400" />
              <input value={newSemester} onChange={(e) => setNewSemester(e.target.value)} placeholder="学期，例如 2026 春" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400" />
              <button type="button" onClick={() => createClassMutation.mutate()} disabled={!newClassName || createClassMutation.isPending} className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">创建班级</button>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">班级成员管理</h2>
            <p className="mt-1 text-sm text-slate-500">当前班级：{highlightedClass?.name || '先选择班级'}</p>
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-semibold text-slate-950">邀请码</div>
                <div className="mt-2 rounded-2xl bg-slate-50 px-4 py-3 font-mono text-base text-slate-800">{highlightedClass?.enrollment_code || '—'}</div>
                <p className="mt-2 text-xs text-slate-500">学生可通过真实邀请码入班接口加入该班级。</p>
              </div>
              <div>
                <input value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} placeholder="学生邮箱" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400" />
                <button type="button" onClick={() => addStudentMutation.mutate()} disabled={!highlightedClass || !studentEmail || addStudentMutation.isPending} className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50">按邮箱添加学生</button>
              </div>
              <div>
                <textarea value={studentImport} onChange={(e) => setStudentImport(e.target.value)} placeholder="批量导入邮箱，每行一个" className="min-h-[120px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400" />
                <button type="button" onClick={() => importStudentsMutation.mutate()} disabled={!highlightedClass || !studentImport.trim() || importStudentsMutation.isPending} className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50">批量导入学生</button>
              </div>
            </div>
          </div>
        </aside>

        <div className="space-y-6">
          <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">班级列表</h2>
                  <p className="mt-1 text-sm text-slate-500">显式选择班级后，成员与作业写操作都会绑定到该班级。</p>
                </div>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索班级 / 学期 / 邀请码" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 lg:max-w-sm" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Class</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Semester</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Invite Code</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Students</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Select</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClasses.map((item) => (
                    <tr
                      key={item.id}
                      className={highlightedClass?.id === item.id ? 'bg-blue-50/70' : 'cursor-pointer hover:bg-slate-50'}
                      onClick={() => {
                        setSelectedClassId(item.id)
                        setSelectedAssignmentId(null)
                      }}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{item.semester || '未设置'}</td>
                      <td className="px-6 py-4 font-mono text-sm text-blue-700">{item.enrollment_code}</td>
                      <td className="px-6 py-4 text-right text-sm text-slate-600">{item.student_count ?? 0}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            setSelectedClassId(item.id)
                            setSelectedAssignmentId(null)
                          }}
                          className={highlightedClass?.id === item.id
                            ? 'rounded-xl bg-slate-950 px-3 py-2 text-sm font-medium text-white'
                            : 'rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700'}
                        >
                          {highlightedClass?.id === item.id ? `已选中 ${item.name}` : `选择 ${item.name}`}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">创建作业</h2>
              <div className="mt-4 space-y-3">
                <input value={assignmentProblemId} onChange={(e) => setAssignmentProblemId(e.target.value)} placeholder="题目 ID" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400" />
                <label className="block text-sm text-slate-500">
                  <span className="sr-only">assignment deadline</span>
                  <input aria-label="assignment deadline" type="datetime-local" value={assignmentDeadline} onChange={(e) => setAssignmentDeadline(e.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400" />
                </label>
                <input value={assignmentPoints} onChange={(e) => setAssignmentPoints(e.target.value)} placeholder="分值" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400" />
                <button type="button" onClick={() => createAssignmentMutation.mutate()} disabled={!highlightedClass || !assignmentProblemId || !assignmentDeadline || createAssignmentMutation.isPending} className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">创建作业</button>
              </div>
            </div>

            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="text-lg font-semibold text-slate-950">班级学生</h2>
                <p className="mt-1 text-sm text-slate-500">当前选中班级的真实学生清单与完成情况。</p>
              </div>
              <div className="overflow-x-auto border-b border-slate-200">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Student</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Email</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Progress</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Average</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((student) => (
                      <tr key={student.student_id}>
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">{student.username}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{student.email}</td>
                        <td className="px-6 py-4 text-right text-sm text-slate-600">{student.completed_assignments}/{student.total_assignments}</td>
                        <td className="px-6 py-4 text-right text-sm text-slate-600">{student.average_score}</td>
                      </tr>
                    ))}
                    {students.length === 0 && (
                      <tr><td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-500">当前班级暂无学生记录</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="text-lg font-semibold text-slate-950">作业与提交记录</h2>
                <p className="mt-1 text-sm text-slate-500">发布作业后可直接查看当前班级该题目的真实提交记录。</p>
              </div>
              <div className="overflow-x-auto border-b border-slate-200">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Assignment</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Deadline</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Published</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {assignments.map((assignment) => (
                      <tr key={assignment.id} className={activeAssignmentId === assignment.id ? 'bg-blue-50' : ''}>
                        <td className="px-6 py-4 text-sm text-slate-900">Problem #{assignment.problem_id}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{new Date(assignment.deadline).toLocaleString('zh-CN')}</td>
                        <td className="px-6 py-4 text-center text-sm text-slate-600">{assignment.published_at ? 'Yes' : 'No'}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setSelectedAssignmentId(assignment.id)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">查看提交</button>
                            <button type="button" onClick={() => publishAssignmentMutation.mutate(assignment.id)} disabled={publishAssignmentMutation.isPending} className="rounded-xl border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 disabled:opacity-50">发布</button>
                            <button type="button" onClick={() => deleteAssignmentMutation.mutate(assignment.id)} disabled={deleteAssignmentMutation.isPending} className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-medium text-rose-600 disabled:opacity-50">删除</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {assignments.length === 0 && (
                      <tr><td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-500">当前班级暂无作业</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-5">
                <div className="mb-3 text-sm font-semibold text-slate-950">Assignment Submissions</div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        <th className="px-2 py-3">Submission</th>
                        <th className="px-2 py-3">User</th>
                        <th className="px-2 py-3">Score</th>
                        <th className="px-2 py-3">Late</th>
                        <th className="px-2 py-3">Submitted At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignmentSubmissions.map((submission) => (
                        <tr key={submission.id} className="border-b border-slate-100 text-sm text-slate-700">
                          <td className="px-2 py-3">#{submission.submission_id}</td>
                          <td className="px-2 py-3 font-mono text-xs">{submission.user_id}</td>
                          <td className="px-2 py-3">{submission.score}</td>
                          <td className="px-2 py-3">{submission.is_late ? `Yes (${submission.late_days}d)` : 'No'}</td>
                          <td className="px-2 py-3">{new Date(submission.submitted_at).toLocaleString('zh-CN')}</td>
                        </tr>
                      ))}
                      {assignmentSubmissions.length === 0 && (
                        <tr><td colSpan={5} className="px-2 py-10 text-center text-sm text-slate-500">当前作业暂无提交记录</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>

      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page <= 1} className="rounded border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-50">Prev</button>
        <span className="text-sm text-slate-600">{page} / {totalPages}</span>
        <button type="button" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={page >= totalPages} className="rounded border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-50">Next</button>
      </div>
    </div>
  )
}
