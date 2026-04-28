import { useQuery } from '@tanstack/react-query'
import { Puzzle } from 'lucide-react'
import api from '@/services/api'
import {
  useFeatureRegistry,
  useSetFeatureFlag,
  useDeleteFeatureFlag,
  type FeatureRegistryEntry,
} from '@/services/featureGateway'
import { useAuth } from '@/hooks/useAuth'
import { FeatureToggle } from '@/components/ui/FeatureToggle'
import { EmptyState } from '@/components/ui/EmptyState'
import { InlineError } from '@/components/ui/InlineError'
import { Badge } from '@/components/ui/Badge'
import { TableSkeleton } from '@/components/skeletons/TableSkeleton'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'

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
    { scope: 'global', label: 'Global', scopeId: null },
    { scope: 'campus', label: 'Campus', scopeId: userCampusId },
    { scope: 'grade', label: 'Grade', scopeId: userGradeId },
  ]

  if (isLoading) {
    return <TableSkeleton rows={5} columns={5} />
  }

  if (error || !registry) {
    return (
      <InlineError
        title="Feature list load failed"
        message="Unable to load feature list, please retry"
        onRetry={() => refetch()}
      />
    )
  }

  if (registry.length === 0) {
    return (
      <EmptyState
        icon={Puzzle}
        title="No features registered"
        description="Feature registry is empty. Please verify backend migration has been executed."
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
        <h1 className="text-2xl font-semibold">Feature Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage system feature enable/disable and scope
        </p>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Feature Name</TableHead>
              <TableHead className="w-[100px]">Default</TableHead>
              {scopeColumns.map((col) => (
                <TableHead key={col.scope} className="w-[150px]">
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {registry.map((feature) => {
              const featureFlags = flagsMap?.[feature.slug] ?? []

              return (
                <TableRow key={feature.slug}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{feature.name}</div>
                      {feature.description && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {feature.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={feature.default_enabled ? 'default' : 'secondary'}>
                      {feature.default_enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </TableCell>
                  {scopeColumns.map((col) => {
                    const override = findOverride(featureFlags, col.scope, col.scopeId)
                    const effectiveEnabled = override
                      ? override.enabled
                      : feature.default_enabled
                    const isWritable = writableScopes.includes(col.scope)

                    return (
                      <TableCell key={col.scope}>
                        <FeatureToggle
                          slug={feature.slug}
                          scope={col.scope}
                          enabled={effectiveEnabled}
                          onToggle={handleToggle}
                          disabled={!isWritable}
                          source={override ? col.scope : 'default'}
                        />
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
