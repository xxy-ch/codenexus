import { EmptyState } from '@/components/page/EmptyState'
import { PageHeader } from '@/components/page/PageHeader'
import { StatCard } from '@/components/page/StatCard'
import { SurfaceCard } from '@/components/page/SurfaceCard'

export function ReportManagement() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="管理台"
        breadcrumb={['审核中心', '举报']}
        title="举报管理"
        description="当前版本仅接通抄袭检测审计流。通用举报工作流尚未在后端开放真实写读接口。"
        actions={
          <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
            诚实降级
          </div>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="通用举报工作流" value="未接通" helper="后端暂无 `/admin/reports`" />
        <StatCard label="抄袭检测审计" value="已接通" helper="使用真实 `/admin/plagiarism/*`" />
        <StatCard label="用户可见状态" value="诚实提示" helper="不再渲染伪列表与伪处理结果" />
        <StatCard label="下一步" value="后端补齐" helper="数据模型、列表查询与状态流转" />
      </section>

      <SurfaceCard className="space-y-6">
        <EmptyState
          title="当前版本未接通通用举报工作流"
          description="为避免前端继续调用不存在的 `/admin/reports` 读写接口，这里改为诚实提示。需要继续审核时，请使用已接通的抄袭检测与审计页面。"
          action={
            <a
              href="/admin/plagiarism-reports"
              className="inline-flex items-center justify-center rounded-[14px] bg-[linear-gradient(135deg,#003d9b,#0052cc)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(0,61,155,0.18)] transition hover:translate-y-[-1px]"
            >
              进入抄袭检测与审计
            </a>
          }
        />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-base font-semibold text-slate-900">平台已接入抄袭检测与审计记录</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              可继续使用抄袭配置、扫描任务、报告列表和报告详情，不再让用户误以为通用举报流已经具备真实写读能力。
            </p>
          </div>
          <div className="rounded-[24px] border border-dashed border-slate-300 bg-white p-5">
            <h2 className="text-base font-semibold text-slate-900">后端补齐建议</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              若要恢复本页真实功能，需补通用举报数据模型、列表查询、状态流转和处理备注接口，再回接前端交互。
            </p>
          </div>
        </div>
      </SurfaceCard>
    </div>
  )
}
