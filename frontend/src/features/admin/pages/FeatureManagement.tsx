import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Puzzle } from 'lucide-react'
import api from '@/shared/services/api'
import {
  useFeatureRegistry,
  useSetFeatureFlag,
  useDeleteFeatureFlag,
  type FeatureRegistryEntry,
} from '@/shared/services/featureGateway'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { FeatureToggle } from '@/shared/components/FeatureToggle'
import { EmptyState } from '@/shared/components/EmptyState'
import { InlineError } from '@/shared/components/InlineError'
import { Badge } from '@/shared/components/badge'
import { TableSkeleton } from '@/shared/components/TableSkeleton'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/shared/components/table'

type Scope = 'global' | 'campus' | 'grade'

interface FeatureFlagEntry {
  enabled: boolean
  scope: string
  scope_id: number | null
}

/** Determine which scopes a user can write to, per D-06. */
function getWritableScopes(role: string): Scope[] {
  switch (role) {
    case 'root':
      return ['global', 'campus']
    case 'campusAdmin':
      return ['campus', 'grade']
    case 'gradeAdmin':
      return ['grade']
    default:
      return []
  }
}

/** Fetch per-feature flag overrides for the admin matrix. */
function useAdminFeatureMatrix(registry: FeatureRegistryEntry[] | undefined) {
  return useQuery({
    queryKey: ['features', 'admin-flags'],
    queryFn: async (): Promise<Record<string, FeatureFlagEntry[]>> => {
      if (!registry || registry.length === 0) return {}
      const result: Record<string, FeatureFlagEntry[]> = {}
      await Promise.all(
        registry.map(async (entry) => {
          const { data } = await api.get(`/features/${entry.slug}/flags`)
          result[entry.slug] = data as FeatureFlagEntry[]
        }),
      )
      return result
    },
    enabled: !!registry && registry.length > 0,
    staleTime: 30_000,
  })
}

/** Find the most-specific override for a given scope, or return undefined. */
function findOverride(
  flags: FeatureFlagEntry[],
  scope: string,
  scopeId: number | null | undefined,
): FeatureFlagEntry | undefined {
  if (!flags) return undefined
  return flags.find((f) => {
    if (f.scope !== scope) return false
    if (scope === 'global') return f.scope_id === null
    return f.scope_id === scopeId
  })
}

export function FeatureManagement() {
  const { data: registry, isLoading, error, refetch } = useFeatureRegistry()
  const { data: flagsMap } = useAdminFeatureMatrix(registry)
  const setFlag = useSetFeatureFlag()
  const deleteFlag = useDeleteFeatureFlag()
  const { user } = useAuth()

  const userRole = user?.role ?? 'student'
  const writableScopes = getWritableScopes(userRole)
  const userCampusId = user?.campus_id ?? null
  const userGradeId = user?.grade_id ?? null

  const scopeColumns: Array<{
    scope: Scope
    label: string
    scopeId: number | null | undefined
  }> = [
    { scope: 'global', label: '全局', scopeId: null },
    { scope: 'campus', label: '校区', scopeId: userCampusId },
    { scope: 'grade', label: '年级', scopeId: userGradeId },
  ]

  if (isLoading) {
    return <TableSkeleton rows={5} columns={5} />
  }

  if (error || !registry) {
    return (
      <InlineError
        title="功能列表加载失败"
        message="无法加载功能列表，请重试"
        onRetry={() => refetch()}
      />
    )
  }

  if (registry.length === 0) {
    return (
      <EmptyState
        icon={Puzzle}
        title="未注册功能"
        description="功能注册表为空，请确认后端迁移已执行。"
      />
    )
  }

  const handleToggle = (
    slug: string,
    scope: string,
    enabled: boolean,
  ) => {
    const scopeId =
      scope === 'campus' ? userCampusId : scope === 'grade' ? userGradeId : undefined

    // If toggling to match default, delete the override instead
    const feature = registry.find((f) => f.slug === slug)
    const override = findOverride(
      flagsMap?.[slug] ?? [],
      scope,
      scopeId,
    )

    if (override && enabled === feature?.default_enabled) {
      deleteFlag.mutate({
        slug,
        scope,
        scope_id: scopeId ?? undefined,
      })
    } else {
      setFlag.mutate({
        slug,
        enabled,
        scope,
        scope_id: scopeId ?? undefined,
      })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">功能开关管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          管理系统功能的启用/禁用和作用域覆盖
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-border/40 hover:bg-transparent">
              <TableHead className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">功能名称</TableHead>
              <TableHead className="w-[100px] text-center text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">默认值</TableHead>
              {scopeColumns.map((col) => (
                <TableHead key={col.scope} className="w-[140px] text-center text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {registry.map((feature) => {
              const featureFlags = flagsMap?.[feature.slug] ?? []

              return (
                <TableRow key={feature.slug} className="border-border/40 hover:bg-muted/50">
                  <TableCell className="align-top pt-4">
                    <div>
                      <div className="text-sm font-medium text-foreground">{feature.name}</div>
                      {feature.description && (
                        <div className="text-[13px] text-muted-foreground mt-0.5">
                          {feature.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center align-top pt-4">
                    <Badge variant={feature.default_enabled ? 'default' : 'secondary'}>
                      {feature.default_enabled ? '启用' : '禁用'}
                    </Badge>
                  </TableCell>
                  {scopeColumns.map((col) => {
                    const override = findOverride(featureFlags, col.scope, col.scopeId)
                    const effectiveEnabled = override
                      ? override.enabled
                      : feature.default_enabled
                    const isWritable = writableScopes.includes(col.scope)
                    return (
                      <TableCell key={col.scope} className="align-top pt-4">
                        <div className="flex justify-center">
                          <FeatureToggle
                            slug={feature.slug}
                            scope={col.scope}
                            enabled={effectiveEnabled}
                            onToggle={handleToggle}
                            disabled={!isWritable}
                            source={override ? col.scope : 'default'}
                            showLabel={false}
                          />
                        </div>
                      </TableCell>
                    )
                  })}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
