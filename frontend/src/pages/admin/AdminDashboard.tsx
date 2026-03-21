import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, AlertTriangle, RefreshCcw, ServerCog, ShieldCheck, Users } from 'lucide-react'
import { PageHeader } from '@/components/page/PageHeader'
import { SurfaceCard } from '@/components/page/SurfaceCard'
import { StatCard } from '@/components/page/StatCard'
import { Button } from '@/components/ui/Button'
import { adminService } from '@/services/admin'

function systemTone(health: 'healthy' | 'warning' | 'error') {
  if (health === 'healthy') return 'bg-[#d8f8e3] text-[#006847]'
  if (health === 'warning') return 'bg-[#fff3d6] text-[#8a5a00]'
  return 'bg-[#ffe7e1] text-[#93000a]'
}

export function AdminDashboard() {
  const {
    data: stats,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['adminStats'],
    queryFn: () => adminService.getStats(),
  })

  const { data: systemHealth } = useQuery({
    queryKey: ['adminSystemHealth'],
    queryFn: () => adminService.getSystemHealth(),
  })

  const quickRows = useMemo(() => {
    if (!systemHealth) {
      return []
    }

    return [
      ['CPU Usage', `${systemHealth.cpu_usage}%`],
      ['Memory Usage', `${systemHealth.memory_usage}%`],
      ['Disk Usage', `${systemHealth.disk_usage}%`],
      ['Active Judges', String(systemHealth.active_judges)],
      ['Queue Length', String(systemHealth.queue_length)],
      ['Avg Response', `${systemHealth.avg_response_time} ms`],
    ]
  }, [systemHealth])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SurfaceCard className="text-sm text-[#6b7ca7]">管理台加载中...</SurfaceCard>
      </div>
    )
  }

  if (isError || !stats) {
    return (
      <div className="space-y-6">
        <SurfaceCard className="space-y-4 bg-[rgba(255,247,247,0.95)]">
          <div>
            <h1 className="font-['Manrope'] text-[1.8rem] font-extrabold tracking-[-0.04em] text-[#7b1e2b]">管理台加载失败</h1>
            <p className="mt-2 text-sm text-[#7d5260]">当前无法读取后台运行概览。</p>
          </div>
          <Button onClick={() => refetch()}>
            <RefreshCcw className="h-4 w-4" />
            重试
          </Button>
        </SurfaceCard>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin workspace"
        breadcrumb={['Operations']}
        title="系统概览"
        description="后台首页只保留真正需要盯住的系统指标、风险入口和当日活动，不再堆砌演示型大屏。"
        actions={(
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCcw className="h-4 w-4" />
            刷新
          </Button>
        )}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Users" value={stats.total_users} helper={`今日活跃 ${stats.active_users_today}`} />
        <StatCard label="Problems" value={stats.total_problems} helper="题库总量" />
        <StatCard label="Submissions" value={stats.total_submissions} helper={`今日 ${stats.submissions_today} 条`} />
        <StatCard label="Contests" value={stats.total_contests} helper="比赛总量" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SurfaceCard className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-['Manrope'] text-[1.4rem] font-extrabold tracking-[-0.03em] text-[#131b2e]">今日运行态</h2>
              <p className="mt-1 text-sm text-[#65748d]">系统健康、异常积压和活跃请求保持在同一视图里。</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${systemTone(stats.system_health)}`}>
              {stats.system_health}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[10px] bg-[rgba(242,243,255,0.78)] p-5">
              <div className="flex items-center gap-3 text-[#17305e]">
                <ServerCog className="h-5 w-5" />
                <p className="text-sm font-semibold">Judging throughput</p>
              </div>
              <p className="mt-4 font-['Manrope'] text-[2rem] font-extrabold tracking-[-0.05em] text-[#131b2e]">{stats.submissions_today}</p>
              <p className="mt-2 text-sm text-[#65748d]">今日新增提交</p>
            </div>
            <div className="rounded-[10px] bg-[rgba(242,243,255,0.78)] p-5">
              <div className="flex items-center gap-3 text-[#17305e]">
                <Users className="h-5 w-5" />
                <p className="text-sm font-semibold">Active users</p>
              </div>
              <p className="mt-4 font-['Manrope'] text-[2rem] font-extrabold tracking-[-0.05em] text-[#131b2e]">{stats.active_users_today}</p>
              <p className="mt-2 text-sm text-[#65748d]">今日活跃账号</p>
            </div>
            <div className="rounded-[10px] bg-[rgba(242,243,255,0.78)] p-5">
              <div className="flex items-center gap-3 text-[#17305e]">
                <AlertTriangle className="h-5 w-5" />
                <p className="text-sm font-semibold">Pending reports</p>
              </div>
              <p className="mt-4 font-['Manrope'] text-[2rem] font-extrabold tracking-[-0.05em] text-[#131b2e]">{stats.pending_reports}</p>
              <p className="mt-2 text-sm text-[#65748d]">待处理举报</p>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard tone="muted" className="space-y-4">
          <div className="flex items-center gap-3 text-[#17305e]">
            <ShieldCheck className="h-5 w-5" />
            <h2 className="font-['Manrope'] text-[1.35rem] font-extrabold tracking-[-0.03em] text-[#131b2e]">系统细项</h2>
          </div>
          <div className="space-y-3">
            {quickRows.length === 0 ? (
              <div className="rounded-[8px] bg-white/92 px-4 py-4 text-sm text-[#65748d]">当前没有可展示的系统细项。</div>
            ) : (
              quickRows.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between rounded-[8px] bg-white/92 px-4 py-3">
                  <span className="text-sm text-[#5f6d87]">{label}</span>
                  <span className="font-semibold text-[#131b2e]">{value}</span>
                </div>
              ))
            )}
          </div>
        </SurfaceCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <SurfaceCard>
          <div className="flex items-center gap-3 text-[#17305e]">
            <Activity className="h-5 w-5" />
            <h2 className="font-['Manrope'] text-[1.25rem] font-extrabold tracking-[-0.03em] text-[#131b2e]">需要盯住的入口</h2>
          </div>
          <div className="mt-5 grid gap-3">
            {[
              ['用户管理', '批量建号、角色开关、状态调整'],
              ['题目管理', '题面、判题参数、可见范围'],
              ['举报中心', '讨论、博客和用户举报处理'],
            ].map(([title, detail]) => (
              <div key={title} className="rounded-[8px] bg-[rgba(242,243,255,0.78)] px-4 py-4">
                <p className="text-sm font-semibold text-[#131b2e]">{title}</p>
                <p className="mt-1 text-xs leading-5 text-[#65748d]">{detail}</p>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6b7ca7]">健康状态</p>
          <div className="mt-4 font-['Manrope'] text-[2rem] font-extrabold tracking-[-0.04em] text-[#131b2e]">{stats.system_health}</div>
          <p className="mt-2 text-sm text-[#65748d]">系统综合健康度来自真实后台统计。</p>
        </SurfaceCard>

        <SurfaceCard>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6b7ca7]">Moderation queue</p>
          <div className="mt-4 font-['Manrope'] text-[2rem] font-extrabold tracking-[-0.04em] text-[#131b2e]">{stats.pending_reports}</div>
          <p className="mt-2 text-sm text-[#65748d]">等待处理的审核与举报项。</p>
        </SurfaceCard>
      </div>
    </div>
  )
}
