import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PackageOpen, Puzzle } from 'lucide-react'
import api from '@/shared/services/api'
import {
  importFeaturePackage,
  useFeatureRegistry,
  useSetFeatureFlag,
  useDeleteFeatureFlag,
  type FeaturePackageItem,
  type FeatureRegistryEntry,
} from '@/shared/services/featureGateway'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { FeatureToggle } from '@/shared/components/FeatureToggle'
import { EmptyState } from '@/shared/components/EmptyState'
import { InlineError } from '@/shared/components/InlineError'
import { Button } from '@/shared/components/Button'
import { Textarea } from '@/shared/components/Textarea'
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
  switch (role.toLowerCase()) {
    case 'root':
      return ['global', 'campus']
    case 'campusadmin':
      return ['campus', 'grade']
    case 'gradeadmin':
      return ['grade']
    default:
      return []
  }
}

function parseFeaturePackage(value: string): FeaturePackageItem[] {
  const parsed = JSON.parse(value)
  const items = Array.isArray(parsed) ? parsed : parsed?.flags
  if (!Array.isArray(items)) {
    throw new Error('功能包格式错误')
  }

  return items.map((item) => {
    if (
      !item ||
      typeof item.slug !== 'string' ||
      typeof item.enabled !== 'boolean' ||
      typeof item.scope !== 'string'
    ) {
      throw new Error('功能包条目格式错误')
    }
    return {
      slug: item.slug,
      enabled: item.enabled,
      scope: item.scope,
      scope_id: typeof item.scope_id === 'number' ? item.scope_id : undefined,
    }
  })
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
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [packageText, setPackageText] = useState('')
  const [packageMessage, setPackageMessage] = useState('')

  const importMutation = useMutation({
    mutationFn: async (text: string) => {
      const items = parseFeaturePackage(text)
      await importFeaturePackage(items)
      return items.length
    },
    onSuccess: (count) => {
      setPackageText('')
      setPackageMessage(`已导入 ${count} 条覆盖`)
      queryClient.invalidateQueries({ queryKey: ['features'] })
    },
    onError: (err) => {
      setPackageMessage(err instanceof Error ? err.message : '导入失败')
    },
  })

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

  const handleImport = (e: FormEvent) => {
    e.preventDefault()
    if (!packageText.trim()) return
    importMutation.mutate(packageText)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">功能开关管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          管理系统功能的启用/禁用和作用域覆盖
        </p>
      </div>

      <form onSubmit={handleImport} className="rounded-xl border border-border/40 bg-background/60 p-4 shadow-sm backdrop-blur-xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
          <div className="flex min-w-48 items-center gap-2 text-sm font-semibold text-foreground">
            <PackageOpen className="h-4 w-4 text-primary" />
            功能包导入
          </div>
          <div className="flex-1 space-y-2">
            <Textarea
              value={packageText}
              onChange={(e) => setPackageText(e.target.value)}
              placeholder='{"flags":[{"slug":"plagiarism","enabled":true,"scope":"global"}]}'
              className="min-h-24 font-mono text-xs"
            />
            {packageMessage && (
              <div className="text-xs text-muted-foreground">{packageMessage}</div>
            )}
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={importMutation.isPending || !packageText.trim()}
          >
            导入
          </Button>
        </div>
      </form>

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
                    const hasScopeTarget = col.scope === 'global' || col.scopeId != null
                    const isWritable = writableScopes.includes(col.scope) && hasScopeTarget
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
