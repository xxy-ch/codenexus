import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, ArrowUpRight, BarChart3, BookOpen, ChevronRight, Download, FileSpreadsheet, GraduationCap, Search, Users } from 'lucide-react'
import { classesService } from '@/services/classes'
import { Loading } from '@/components/ui/Loading'

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

export function AssignmentReport() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['assignment-report-classes'],
    queryFn: () => classesService.getClasses(1, 10),
  })

  const classes = data?.classes || []

  const summary = useMemo(() => {
    const totalStudents = classes.reduce((sum, cls) => sum + Number(cls.student_count || 0), 0)
    const averageClassSize = classes.length > 0 ? Math.round(totalStudents / classes.length) : 0
    const mostRecentClass = [...classes].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0]

    return {
      totalClasses: classes.length,
      totalStudents,
      averageClassSize,
      mostRecentClass,
      activeSemesters: Array.from(new Set(classes.map((cls) => cls.semester).filter(Boolean))).length,
    }
  }, [classes])

  if (isLoading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <Loading message="加载教学报告..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-rose-600">
          <AlertCircle className="h-5 w-5" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-950">作业报告加载失败</h2>
        <p className="mt-2 text-sm text-slate-600">当前无法读取班级数据，不能展示假的分析结果。</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-5 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          重试
        </button>
      </div>
    )
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
                参考稿里的分析页结构已经落到真实数据上。当前报告只使用仓库中真实可用的班级与学生统计，不再渲染不存在的作业明细。
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
          <p className="mt-2 text-sm text-slate-600">当前报告覆盖的教学班级数。</p>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Students</span>
            <Users className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">{summary.totalStudents}</div>
          <p className="mt-2 text-sm text-slate-600">按班级统计聚合得到的学生总数。</p>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Average Size</span>
            <BarChart3 className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">{summary.averageClassSize}</div>
          <p className="mt-2 text-sm text-slate-600">每个班级的平均学生规模。</p>
        </div>

        <div className="rounded-[28px] border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Semesters</span>
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">{summary.activeSemesters}</div>
          <p className="mt-2 text-sm text-emerald-800">当前覆盖的学期分布。</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]">
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Class Coverage</h2>
              <p className="mt-1 text-sm text-slate-600">用真实班级数据替代静态作业明细，先交付稳定可用的班级报告视图。</p>
            </div>
            <div className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-medium uppercase tracking-[0.22em] text-slate-500">
              Live Data
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Class</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Semester</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Students</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Created</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {classes.map((cls) => (
                  <tr key={cls.id} className="transition hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-950">{cls.name}</div>
                      <div className="mt-1 text-xs text-slate-500">Teacher ID: {cls.teacher_id}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{cls.semester || 'Unassigned'}</td>
                    <td className="px-6 py-4">
                      <div className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                        {cls.student_count ?? 0} students
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{formatDate(cls.created_at)}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        <ArrowUpRight className="h-3.5 w-3.5" />
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
                {classes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">
                      当前没有可用于生成报告的班级数据。
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
              Reporting Scope
            </div>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <li>当前只展示已落库的班级和班级规模数据。</li>
              <li>未落地的作业提交细粒度分析不再用假数据补齐。</li>
              <li>后续若补齐 assignment submissions，再扩展此页的维度。</li>
            </ul>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-slate-900 p-6 text-white shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">Most Recent Class</div>
            <div className="mt-4 text-2xl font-semibold">
              {summary.mostRecentClass?.name || 'No class data'}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {summary.mostRecentClass
                ? `创建于 ${formatDate(summary.mostRecentClass.created_at)}，当前记录 ${summary.mostRecentClass.student_count ?? 0} 名学生。`
                : '当前没有最近创建班级可供分析。'}
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}
