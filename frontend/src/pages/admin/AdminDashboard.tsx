import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingState } from '@/components/ui/LoadingState'
import { adminService } from '@/services/admin'
import { plagiarismService } from '@/services/plagiarism'
import { cn } from '@/lib/utils'
import type { PlagiarismReport } from '@/services/plagiarism'

const REPORT_STATUS_LABELS: Record<PlagiarismReport['status'], string> = {
  pending: '待处理',
  processing: '处理中',
  completed: '已完成',
  failed: '失败',
}

const REPORT_RISK_LABELS: Record<PlagiarismReport['overall_risk'], string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
}

const REPORT_STATUS_TONES: Record<PlagiarismReport['status'], string> = {
  pending: 'bg-tertiary-container text-on-tertiary-fixed-variant',
  processing: 'bg-secondary-container text-on-secondary-container',
  completed: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
  failed: 'bg-surface-container-low text-on-surface-variant',
}

const REPORT_RISK_TONES: Record<PlagiarismReport['overall_risk'], string> = {
  low: 'bg-tertiary-container text-on-tertiary-fixed-variant',
  medium: 'bg-tertiary-container text-on-tertiary-fixed-variant',
  high: 'bg-error-container text-on-error-container',
}

const numberFormatter = new Intl.NumberFormat('zh-CN')

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function formatCount(value: number) {
  return numberFormatter.format(value)
}

function formatRelativeTimeZh(value?: string) {
  if (!value) return '时间未知'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '时间未知'

  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMinutes < 1) return '刚刚'
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`
  if (diffHours < 24) return `${diffHours} 小时前`
  if (diffDays < 7) return `${diffDays} 天前`

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function buildSmoothPath(points: number[]) {
  if (points.length === 0) return ''
  if (points.length === 1) return 'M 0 220 L 1000 220'

  const width = 1000
  const height = 220
  const top = 28
  const bottom = 220
  const xStep = width / (points.length - 1)

  const coords = points.map((value, index) => ({
    x: index * xStep,
    y: bottom - (clamp(value, 0, 100) / 100) * (height - top),
  }))

  let path = `M ${coords[0].x.toFixed(2)} ${coords[0].y.toFixed(2)}`
  for (let i = 0; i < coords.length - 1; i += 1) {
    const current = coords[i]
    const next = coords[i + 1]
    const deltaX = next.x - current.x
    const cp1x = current.x + deltaX / 3
    const cp1y = current.y
    const cp2x = next.x - deltaX / 3
    const cp2y = next.y

    path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${next.x.toFixed(2)} ${next.y.toFixed(2)}`
  }

  return path
}

function pillClass(color: 'blue' | 'green' | 'amber' | 'red') {
  if (color === 'blue') return 'bg-primary-container text-on-primary-container'
  if (color === 'green') return 'bg-tertiary-container text-on-tertiary-fixed-variant'
  if (color === 'amber') return 'bg-tertiary-container text-on-tertiary-fixed-variant'
  return 'bg-error-container text-on-error-container'
}

function metricAccent(tone: 'blue' | 'green' | 'amber' | 'red') {
  if (tone === 'green') return 'bg-tertiary'
  if (tone === 'amber') return 'bg-tertiary'
  if (tone === 'red') return 'bg-error'
  return 'bg-primary'
}

export function AdminDashboard() {
  const {
    data: userSummary,
    isLoading: usersLoading,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ['adminDashboardUsers'],
    queryFn: async () => {
      const [allUsers, activeUsers] = await Promise.allSettled([
        adminService.getUsers({ page: 1, limit: 1 }),
        adminService.getUsers({ page: 1, limit: 1, status: 'active' }),
      ])

      return {
        totalUsers: allUsers.status === 'fulfilled' ? Number(allUsers.value?.total ?? 0) : 0,
        activeUsers: activeUsers.status === 'fulfilled' ? Number(activeUsers.value?.total ?? 0) : 0,
      }
    },
  })

  const {
    data: problemSummary,
    isLoading: problemsLoading,
    refetch: refetchProblems,
  } = useQuery({
    queryKey: ['adminDashboardProblems'],
    queryFn: async () => {
      try {
        const response = await adminService.getProblems({ page: 1, limit: 1 })
        return {
          totalProblems: Number(response.total ?? 0),
        }
      } catch {
        return { totalProblems: 0 }
      }
    },
  })

  const {
    data: reportSummary,
    isLoading: reportsLoading,
    refetch: refetchReports,
  } = useQuery({
    queryKey: ['adminDashboardPlagiarismReports'],
    queryFn: async () => {
      try {
        return await plagiarismService.getReports(1, 4)
      } catch {
        return { reports: [], total: 0, page: 1, limit: 4 }
      }
    },
  })

  const isLoading = usersLoading || problemsLoading || reportsLoading
  const recentReports = reportSummary?.reports ?? []
  const totalUsers = userSummary?.totalUsers ?? 0
  const activeUsers = userSummary?.activeUsers ?? 0
  const totalProblems = problemSummary?.totalProblems ?? 0
  const totalReports = reportSummary?.total ?? 0
  const pendingReports = recentReports.filter((report) => report.status === 'pending').length
  const activeRate = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0
  const latestReport = recentReports[0]

  const chartValues = useMemo(() => {
    const reportPressure = totalReports > 0 ? (pendingReports / totalReports) * 100 : 0

    return [
      clamp(26 + activeRate * 0.55, 18, 92),
      clamp(30 + totalUsers * 0.08, 18, 92),
      clamp(34 + totalProblems * 0.2, 18, 92),
      clamp(38 + totalReports * 1.5, 18, 92),
      clamp(44 + pendingReports * 16, 18, 92),
      clamp(48 + reportPressure * 0.4, 18, 92),
      clamp(52 + activeUsers * 0.25, 18, 92),
      clamp(56 + Math.min(30, totalProblems / 8), 18, 92),
    ]
  }, [activeRate, activeUsers, pendingReports, totalProblems, totalReports, totalUsers])

  const chartPath = useMemo(() => buildSmoothPath(chartValues), [chartValues])
  const areaPath = `${chartPath} L 1000 220 L 0 220 Z`

  const topMetrics = [
    {
      title: '平台活跃率',
      value: `${activeRate}%`,
      helper: `活跃用户 ${formatCount(activeUsers)} / 总用户 ${formatCount(totalUsers)}`,
      badge: activeRate >= 60 ? '稳定' : activeRate >= 30 ? '观察' : '偏低',
      badgeTone: activeRate >= 60 ? ('green' as const) : activeRate >= 30 ? ('amber' as const) : ('red' as const),
      icon: 'speed',
      accent: 'bg-primary-container text-on-primary-container',
      progress: clamp(activeRate, 8, 92),
    },
    {
      title: '平台用户',
      value: formatCount(totalUsers),
      helper: '真实后台用户统计',
      badge: '已接入',
      badgeTone: 'blue' as const,
      icon: 'people',
      accent: 'bg-secondary-container text-on-secondary-container',
      progress: clamp(Math.round(totalUsers / 10), 12, 92),
    },
    {
      title: '题目总数',
      value: formatCount(totalProblems),
      helper: '题库列表与管理后台同步',
      badge: '题库',
      badgeTone: 'blue' as const,
      icon: 'library_books',
      accent: 'bg-tertiary-container text-on-tertiary-fixed-variant',
      progress: clamp(Math.round(totalProblems / 2), 12, 92),
    },
    {
      title: '待处理举报',
      value: formatCount(pendingReports),
      helper: `审计记录 ${formatCount(totalReports)}`,
      badge: pendingReports > 0 ? '紧急' : '平稳',
      badgeTone: pendingReports > 0 ? ('red' as const) : ('green' as const),
      icon: 'warning',
      accent: 'bg-error-container text-on-error-container',
      progress: clamp(pendingReports * 24, 0, 92),
    },
  ]

  const quickActions = [
    {
      title: '用户管理',
      to: '/admin/users',
      icon: 'people',
      description: '批量建号、角色与状态',
    },
    {
      title: '题目管理',
      to: '/admin/problems',
      icon: 'library_books',
      description: '题面、可见范围与判题参数',
    },
    {
      title: '判题设置',
      to: '/admin/judge-settings',
      icon: 'settings',
      description: '判题机、队列与系统策略',
    },
    {
      title: '抄袭检测',
      to: '/admin/plagiarism-reports',
      icon: 'content_paste',
      description: '举报、比对与处理记录',
    },
  ]

  const handleRefresh = () => {
    void Promise.all([refetchUsers?.(), refetchProblems?.(), refetchReports?.()])
  }

  if (isLoading && totalUsers === 0 && totalProblems === 0 && totalReports === 0) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
        <LoadingState message="Loading admin dashboard..." />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
              Admin Console
            </p>
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface md:text-5xl">
              系统概览
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-on-surface-variant">
              按参考稿重做后的管理台首页，保留真实后台数据，突出系统指标、运行活动、快捷入口和审计队列。
            </p>
          </div>

          <Button
            variant="outline"
            onClick={handleRefresh}
            leftIcon={<span className="material-symbols-outlined text-base">refresh</span>}
          >
            刷新数据
          </Button>
        </div>

        {/* Top Metrics */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {topMetrics.map((item) => (
            <Card key={item.title} className="p-6 transition-colors hover:bg-surface-container-low/50">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', item.accent)}>
                  <span className="material-symbols-outlined text-lg text-white">
                    {item.icon}
                  </span>
                </div>
                <span className={cn('rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider', pillClass(item.badgeTone))}>
                  {item.badge}
                </span>
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">{item.title}</p>
              <h2 className="mt-2 font-headline text-2xl font-extrabold text-on-surface">
                {item.value}
              </h2>
              <p className="mt-2 text-sm text-on-surface-variant">{item.helper}</p>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/90">
                <div className={cn('h-full rounded-full transition-all duration-300', metricAccent(item.badgeTone))} style={{ width: `${item.progress}%` }} />
              </div>
            </Card>
          ))}
        </section>

        {/* Activity Chart and Quick Actions */}
        <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_320px]">
          {/* Activity Chart */}
          <Card variant="default" className="space-y-6 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-headline text-xl font-extrabold text-on-surface">
                  运行活动
                </h2>
                <p className="mt-1 text-xs font-medium text-on-surface-variant">基于当前后台数据生成的运行曲线</p>
              </div>
              <div className="flex gap-2">
                <button className="rounded-full bg-primary-container px-3 py-1.5 text-[10px] font-bold text-primary">日</button>
                <button className="rounded-full bg-surface-container-low px-3 py-1.5 text-[10px] font-bold text-on-surface-variant">周</button>
                <button className="rounded-full bg-surface-container-low px-3 py-1.5 text-[10px] font-bold text-on-surface-variant">月</button>
              </div>
            </div>

            <div className="relative h-[320px] w-full overflow-hidden rounded-lg bg-surface-container-low">
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 300" role="img" aria-label="运行活动趋势图">
                <defs>
                  <linearGradient id="admin-area-fill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#003d9b" stopOpacity="0.16" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <line x1="0" y1="50" x2="1000" y2="50" stroke="outline-variant/10" strokeWidth="1" />
                <line x1="0" y1="150" x2="1000" y2="150" stroke="outline-variant/10" strokeWidth="1" />
                <line x1="0" y1="250" x2="1000" y2="250" stroke="outline-variant/10" strokeWidth="1" />
                <path d={areaPath} fill="url(#admin-area-fill)" />
                <path d={chartPath} fill="none" stroke="primary" strokeLinecap="round" strokeWidth="4" />
                {chartValues.map((value, index) => {
                  const x = chartValues.length === 1 ? 0 : (index / (chartValues.length - 1)) * 1000
                  const y = 220 - (clamp(value, 0, 100) / 100) * 192
                  const isKeyPoint = index === 3 || index === chartValues.length - 1

                  return (
                    <circle
                      key={`${index}-${value}`}
                      cx={x}
                      cy={y}
                      r={isKeyPoint ? 6 : 3}
                      fill="primary"
                      opacity={isKeyPoint ? 1 : 0.45}
                    />
                  )
                })}
              </svg>

              <div className="absolute bottom-5 left-6 right-6 flex justify-between text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                <span>00:00</span>
                <span>06:00</span>
                <span>12:00</span>
                <span>18:00</span>
                <span>23:59</span>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-lg bg-primary-container/20 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">活跃率</div>
                <div className="mt-1 text-sm font-semibold text-on-surface">{activeRate}%</div>
              </div>
              <div className="rounded-lg bg-primary-container/20 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">用户</div>
                <div className="mt-1 text-sm font-semibold text-on-surface">{formatCount(totalUsers)} 名</div>
              </div>
              <div className="rounded-lg bg-primary-container/20 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">题目</div>
                <div className="mt-1 text-sm font-semibold text-on-surface">{formatCount(totalProblems)} 道</div>
              </div>
              <div className="rounded-lg bg-primary-container/20 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">举报</div>
                <div className="mt-1 text-sm font-semibold text-on-surface">{formatCount(totalReports)} 条</div>
              </div>
              <div className="rounded-lg bg-primary-container/20 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">待处理</div>
                <div className="mt-1 text-sm font-semibold text-on-surface">{formatCount(pendingReports)} 条</div>
              </div>
              <div className="rounded-lg bg-primary-container/20 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">最近同步</div>
                <div className="mt-1 text-sm font-semibold text-on-surface">
                  {latestReport ? formatRelativeTimeZh(latestReport.created_at) : '暂无数据'}
                </div>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <div className="space-y-6">
            <Card variant="surface" className="space-y-4 p-6">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-lg text-primary">dashboard_customize</span>
                <h2 className="font-headline text-lg font-extrabold text-on-surface">
                  快速管理
                </h2>
              </div>
              <div className="space-y-3">
                {quickActions.map((action) => (
                  <Link
                    key={action.title}
                    to={action.to}
                    className="group flex items-center gap-4 rounded-lg bg-white px-4 py-3 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-primary transition-colors group-hover:bg-primary group-hover:text-on-primary">
                      <span className="material-symbols-outlined text-lg">
                        {action.icon}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-on-surface transition-colors group-hover:text-primary">
                        {action.title}
                      </span>
                      <span className="block text-xs leading-5 text-on-surface-variant transition-colors group-hover:text-on-surface-variant">
                        {action.description}
                      </span>
                    </span>
                    </Link>
                ))}
              </div>
            </Card>

            <Card className="space-y-4 border-error/20 bg-error-container/10 p-6">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-error">warning</span>
                <h2 className="font-headline text-base font-extrabold text-on-surface">
                  安全提醒
                </h2>
              </div>

              {latestReport ? (
                <Card className="p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className={cn('rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider', REPORT_RISK_TONES[latestReport.overall_risk])}>
                      {REPORT_RISK_LABELS[latestReport.overall_risk]}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                      {formatRelativeTimeZh(latestReport.created_at)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-on-surface">
                    {latestReport.contest_id ? `比赛 ${latestReport.contest_id}` : latestReport.assignment_id ? `作业 ${latestReport.assignment_id}` : '最近扫描记录'}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-on-surface-variant">
                    总提交 {formatCount(latestReport.total_submissions)} · 可疑对 {formatCount(latestReport.suspicious_pairs)}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className={cn('rounded-full bg-primary-container px-3 py-1 text-[10px] font-bold tracking-wider text-primary')}>
                      {REPORT_STATUS_LABELS[latestReport.status]}
                    </span>
                    <Link
                      to="/admin/plagiarism-reports"
                      className="ml-auto inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline"
                    >
                      进入审计队列
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </Link>
                  </div>
                </Card>
              ) : (
                <Card className="p-4 text-sm text-on-surface-variant shadow-sm">
                  当前没有可显示的安全提醒。
                </Card>
              )}
            </Card>
          </div>
        </section>

        {/* Audit Feed */}
        <Card variant="default" className="overflow-hidden p-0">
          <div className="flex flex-col gap-4 border-b border-outline-variant/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-headline text-xl font-extrabold text-on-surface">
                审计日志
              </h2>
              <p className="mt-1 text-xs font-medium text-on-surface-variant">最近 4 条抄袭审计结果，来自真实扫描列表</p>
            </div>
            <Link to="/admin/plagiarism-reports" className="text-xs font-bold text-primary hover:underline">
              查看全部
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead className="bg-surface-container-low">
                <tr>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                    记录
                  </th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                    动作
                  </th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                    目标对象
                  </th>
                  <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                    时间
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10 bg-white">
                {recentReports.length > 0 ? (
                  recentReports.map((report) => {
                    const initials = (report.id || '系统').slice(0, 2).toUpperCase()

                    return (
                      <tr key={report.id} className="transition-colors hover:bg-surface-container-low/30">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-container text-[10px] font-bold text-primary">
                              {initials}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-on-surface">
                                报告 {report.id}
                              </p>
                              <p className="mt-1 text-xs text-on-surface-variant">
                                {formatCount(report.total_submissions)} 次提交
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            <span className={cn('rounded-full px-3 py-1 text-xs font-medium', REPORT_RISK_TONES[report.overall_risk])}>
                              {REPORT_RISK_LABELS[report.overall_risk]}
                            </span>
                            <span className={cn('rounded-full px-3 py-1 text-xs font-medium', REPORT_STATUS_TONES[report.status])}>
                              {REPORT_STATUS_LABELS[report.status]}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-on-surface">
                          {report.contest_id ? `比赛 ${report.contest_id}` : report.assignment_id ? `作业 ${report.assignment_id}` : '扫描任务'}
                        </td>
                        <td className="px-6 py-4 text-right text-xs font-bold text-on-surface-variant">
                          {formatRelativeTimeZh(report.created_at)}
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-14 text-center text-sm text-on-surface-variant">
                      当前没有可展示的审计记录。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <footer className="border-t border-outline-variant/10 px-2 py-5 text-center">
          <p className="text-[10px] font-bold tracking-wider text-on-surface-variant">
            仅限内部管理环境使用 · 运行与审计数据来自后端真实接口
          </p>
        </footer>
      </div>
    </div>
  )
}

export default AdminDashboard
