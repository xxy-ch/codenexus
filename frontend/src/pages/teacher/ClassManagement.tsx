import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { classesService } from '@/services/classes'
import { Loading } from '@/components/ui/Loading'
import { cn } from '@/lib/utils'

export function ClassManagement() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const limit = 20
  const [newClassName, setNewClassName] = useState('')
  const [newSemester, setNewSemester] = useState('')
  const [studentEmail, setStudentEmail] = useState('')
  const [studentImport, setStudentImport] = useState('')
  const [assignmentProblemId, setAssignmentProblemId] = useState('')
  const [assignmentDeadline, setAssignmentDeadline] = useState('')
  const [assignmentPoints, setAssignmentPoints] = useState('100')

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
    return classes.filter((cls) =>
      [cls.name, cls.semester || '', String(cls.id)].some((value) =>
        value.toLowerCase().includes(keyword),
      ),
    )
  }, [classes, search])

  const totalStudents = classes.reduce((sum, cls) => sum + Number(cls.student_count || 0), 0)
  const avgStudents = classes.length > 0 ? Math.round(totalStudents / classes.length) : 0
  const latestSemester = classes.find((cls) => cls.semester)?.semester || '未设置'
  const highlightedClass = filteredClasses[0]

  const { data: assignments = [] } = useQuery({
    queryKey: ['classAssignments', highlightedClass?.id],
    queryFn: () => classesService.listAssignments(highlightedClass!.id),
    enabled: !!highlightedClass?.id,
  })

  const invalidateClasses = () => {
    queryClient.invalidateQueries({ queryKey: ['classes'] })
    if (highlightedClass?.id) {
      queryClient.invalidateQueries({ queryKey: ['classAssignments', highlightedClass.id] })
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
      invalidateClasses()
    },
  })

  const addStudentMutation = useMutation({
    mutationFn: () => classesService.addStudent(highlightedClass!.id, studentEmail),
    onSuccess: () => {
      setStudentEmail('')
      invalidateClasses()
    },
  })

  const importStudentsMutation = useMutation({
    mutationFn: () =>
      classesService.batchImportStudents(
        highlightedClass!.id,
        studentImport.split('\n').map((item) => item.trim()).filter(Boolean),
      ),
    onSuccess: () => {
      setStudentImport('')
      invalidateClasses()
    },
  })

  const createAssignmentMutation = useMutation({
    mutationFn: () =>
      classesService.createAssignment(highlightedClass!.id, {
        problem_id: Number(assignmentProblemId),
        deadline: assignmentDeadline,
        points: Number(assignmentPoints),
      }),
    onSuccess: () => {
      setAssignmentProblemId('')
      setAssignmentDeadline('')
      setAssignmentPoints('100')
      invalidateClasses()
    },
  })

  const deleteAssignmentMutation = useMutation({
    mutationFn: (assignmentId: number) => classesService.deleteAssignment(assignmentId),
    onSuccess: () => invalidateClasses(),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading message="加载班级中..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-600 dark:text-slate-300 mb-4">班级加载失败</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="px-4 py-2 rounded bg-primary text-white"
        >
          重试
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <span>Classes</span>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span className="font-medium text-slate-900 dark:text-white">
              {highlightedClass?.name || 'Overview'}
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">班级管理</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            按当前 schema 展示班级 roster、规模和学期信息，未交付功能保持隐藏。
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="inline-flex items-center rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            <span className="material-symbols-outlined mr-2 text-base">archive</span>
            归档视图
          </button>
          <div className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm shadow-primary/20">
            <span className="material-symbols-outlined mr-2 text-base">school</span>
            当前共 {total} 个班级
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">班级总数</p>
          <div className="mt-2 flex items-end justify-between">
            <span className="text-2xl font-normal text-slate-900 dark:text-white">{total}</span>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
              当前页 {filteredClasses.length}
            </span>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">总学生数</p>
          <div className="mt-2 flex items-end justify-between">
            <span className="text-2xl font-normal text-slate-900 dark:text-white">{totalStudents}</span>
            <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-300">
              活跃 roster
            </span>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">平均班级规模</p>
          <div className="mt-2 flex items-end justify-between">
            <span className="text-2xl font-normal text-slate-900 dark:text-white">{avgStudents}</span>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
              students / class
            </span>
          </div>
        </div>
        <div className="rounded-lg border border-primary bg-gradient-to-br from-primary to-blue-700 p-4 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/80">最新学期</p>
          <div className="mt-2 flex items-start justify-between">
            <div>
              <div className="text-lg font-medium">{latestSemester}</div>
              <div className="mt-1 text-xs text-white/80">
                {highlightedClass ? `${highlightedClass.name} 已作为当前视图焦点` : '等待班级数据'}
              </div>
            </div>
            <span className="material-symbols-outlined text-4xl text-white/20">event_available</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Live Schema Flows</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              当前教师端已接通 live schema 可支持的替代流：建班、按邮箱加人、批量导入学生、布置作业和删除作业。邀请码入班与发布态切换仍不单独暴露，
              避免继续依赖不存在的字段和表。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-emerald-700 shadow-sm">create class live</span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-emerald-700 shadow-sm">add students live</span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-emerald-700 shadow-sm">assignments live</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">创建班级</h2>
            <div className="mt-4 space-y-3">
              <input
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="班级名称"
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
              />
              <input
                value={newSemester}
                onChange={(e) => setNewSemester(e.target.value)}
                placeholder="学期，如 2026 春"
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => createClassMutation.mutate()}
                disabled={!newClassName || createClassMutation.isPending}
                className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                创建班级
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">当前班级写操作</h2>
            <p className="mt-1 text-sm text-slate-500">{highlightedClass ? highlightedClass.name : '先选择或搜索班级'}</p>
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <input
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  placeholder="学生邮箱"
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => addStudentMutation.mutate()}
                  disabled={!highlightedClass || !studentEmail || addStudentMutation.isPending}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 disabled:opacity-50"
                >
                  按邮箱添加学生
                </button>
              </div>

              <div className="space-y-2">
                <textarea
                  value={studentImport}
                  onChange={(e) => setStudentImport(e.target.value)}
                  placeholder={'批量导入邮箱，每行一个'}
                  className="min-h-[110px] w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => importStudentsMutation.mutate()}
                  disabled={!highlightedClass || !studentImport.trim() || importStudentsMutation.isPending}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 disabled:opacity-50"
                >
                  批量导入学生
                </button>
              </div>

              <div className="space-y-2">
                <input
                  value={assignmentProblemId}
                  onChange={(e) => setAssignmentProblemId(e.target.value)}
                  placeholder="题目 ID"
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                />
                <input
                  type="datetime-local"
                  value={assignmentDeadline}
                  onChange={(e) => setAssignmentDeadline(e.target.value)}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                />
                <input
                  value={assignmentPoints}
                  onChange={(e) => setAssignmentPoints(e.target.value)}
                  placeholder="分值"
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => createAssignmentMutation.mutate()}
                  disabled={!highlightedClass || !assignmentProblemId || !assignmentDeadline || createAssignmentMutation.isPending}
                  className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  创建作业
                </button>
              </div>
            </div>
          </div>
        </aside>

      <div className="space-y-6">
      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="border-b border-slate-200 dark:border-slate-800">
          <nav className="-mb-px flex">
            {[
              ['班级名单', 'people'],
              ['作业概览', 'assignment'],
              ['趋势分析', 'analytics'],
              ['设置', 'settings'],
            ].map(([label, icon], index) => (
              <div
                key={label}
                className={cn(
                  'flex w-1/4 items-center justify-center gap-2 px-1 py-4 text-sm font-medium',
                  index === 0
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-slate-500 dark:text-slate-400',
                )}
              >
                <span className="material-symbols-outlined text-lg">{icon}</span>
                {label}
              </div>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-xs">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-base">search</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="筛选班级名称、学期或 ID..."
              className="block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 pl-10 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex items-center rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300"
            >
              <span className="material-symbols-outlined mr-2 text-sm">filter_list</span>
              Filter
            </button>
            <button
              type="button"
              className="inline-flex items-center rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300"
            >
              <span className="material-symbols-outlined mr-2 text-sm">file_upload</span>
              Export
            </button>
            <div className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white">
              <span className="material-symbols-outlined mr-2 text-sm">assignment_add</span>
              真实写路径未开放
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white dark:bg-slate-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">班级</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">学期</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">学生数</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">创建时间</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredClasses.map((cls) => (
                <tr key={cls.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{cls.name}</p>
                      <p className="mt-1 text-xs text-slate-500">Class ID #{cls.id}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                    {cls.semester || '未设置'}
                  </td>
                  <td className="px-4 py-4 text-right text-sm text-slate-700 dark:text-slate-300">
                    {cls.student_count ?? 0}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-300">
                    {new Date(cls.created_at).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-300">
                      roster ready
                    </span>
                  </td>
                </tr>
              ))}
              {filteredClasses.length === 0 && (
                <tr>
                  <td className="px-4 py-12 text-center text-sm text-slate-500" colSpan={5}>
                    暂无匹配的班级数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="border-b border-slate-200 dark:border-slate-800 px-4 py-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">作业列表</h2>
          <p className="mt-1 text-sm text-slate-500">当前聚焦班级的 live assignments。</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white dark:bg-slate-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Assignment</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Deadline</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Points</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {assignments.map((assignment) => (
                <tr key={assignment.id}>
                  <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-300">
                    Assignment #{assignment.id} · Problem #{assignment.problem_id}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-300">
                    {new Date(assignment.deadline).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-4 py-4 text-right text-sm text-slate-700 dark:text-slate-300">
                    {assignment.points}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`确认删除作业 #${assignment.id} ?`)) {
                          deleteAssignmentMutation.mutate(assignment.id)
                        }
                      }}
                      className="rounded border border-rose-200 px-3 py-1.5 text-sm text-rose-600"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
              {assignments.length === 0 && (
                <tr>
                  <td className="px-4 py-12 text-center text-sm text-slate-500" colSpan={4}>
                    当前班级暂无作业
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          disabled={page <= 1}
          className="rounded border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm disabled:opacity-50"
        >
          Prev
        </button>
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          disabled={page >= totalPages}
          className="rounded border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  )
}
