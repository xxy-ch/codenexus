import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Puzzle } from 'lucide-react'
import api from '@/services/api'
import {
  useFeatureRegistry,
  useSetFeatureFlag,
  type FeatureRegistryEntry,
  type FeatureState,
} from '@/services/featureGateway'
import { FeatureToggle } from '@/components/ui/FeatureToggle'
import { EmptyState } from '@/components/ui/EmptyState'
import { InlineError } from '@/components/ui/InlineError'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'

interface ClassInfo {
  id: number
  name: string
  student_count?: number
}

interface FeatureFlagEntry {
  enabled: boolean
  scope: string
  scope_id: number | null
}

interface FeatureDisplay {
  slug: string
  name: string
  description: string | null
  enabled: boolean
  source: string
  hasClassOverride: boolean
}

export function ClassFeatureSettings() {
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null)

  const {
    data: registry,
    isLoading: registryLoading,
    error: registryError,
    refetch,
  } = useFeatureRegistry()

  const setFlag = useSetFeatureFlag()

  // Fetch teacher's classes
  const { data: classesData } = useQuery({
    queryKey: ['teacher-classes'],
    queryFn: async () => {
      const { data } = await api.get('/classes')
      return data as { classes: ClassInfo[] }
    },
  })

  const classes = classesData?.classes ?? []

  // Auto-select first class when available and none selected
  const effectiveClassId = selectedClassId ?? (classes.length > 0 ? classes[0].id : null)

  // Fetch resolved features (inherited baseline without class context)
  const { data: resolvedFeatures } = useQuery({
    queryKey: ['features', 'resolved'],
    queryFn: async () => {
      const { data } = await api.get('/features/resolved')
      return data as Record<string, FeatureState>
    },
    enabled: !!registry && registry.length > 0,
    staleTime: 60_000,
  })

  // Fetch class-level flags for the selected class
  const { data: classFlagsMap } = useQuery({
    queryKey: ['features', 'class-flags', effectiveClassId],
    queryFn: async (): Promise<Record<string, FeatureFlagEntry[]>> => {
      if (!registry || !effectiveClassId) return {}
      const result: Record<string, FeatureFlagEntry[]> = {}
      await Promise.all(
        registry.map(async (entry) => {
          const { data } = await api.get(
            `/features/${entry.slug}/flags?scope=class&scope_id=${effectiveClassId}`,
          )
          result[entry.slug] = data as FeatureFlagEntry[]
        }),
      )
      return result
    },
    enabled: !!registry && registry.length > 0 && !!effectiveClassId,
    staleTime: 30_000,
  })

  if (registryLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    )
  }

  if (registryError || !registry) {
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

  // Build display objects for each feature
  const featureDisplays: FeatureDisplay[] = registry.map((feature) => {
    const resolved = resolvedFeatures?.[feature.slug]
    const classFlags = classFlagsMap?.[feature.slug] ?? []
    const classOverride = classFlags.length > 0 ? classFlags[0] : null

    if (classOverride) {
      return {
        slug: feature.slug,
        name: feature.name,
        description: feature.description,
        enabled: classOverride.enabled,
        source: 'class',
        hasClassOverride: true,
      }
    }

    return {
      slug: feature.slug,
      name: feature.name,
      description: feature.description,
      enabled: resolved?.enabled ?? feature.default_enabled,
      source: resolved?.source ?? 'default',
      hasClassOverride: false,
    }
  })

  const handleToggle = (slug: string, _scope: string, enabled: boolean) => {
    if (!effectiveClassId) return
    setFlag.mutate({
      slug,
      enabled,
      scope: 'class',
      scope_id: effectiveClassId,
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Class Feature Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View and manage effective feature state for your classes
        </p>
      </div>

      {classes.length > 1 && (
        <div className="flex items-center gap-3">
          <label htmlFor="class-select" className="text-sm font-medium">
            Select Class:
          </label>
          <select
            id="class-select"
            value={effectiveClassId ?? ''}
            onChange={(e) => setSelectedClassId(Number(e.target.value))}
            className="rounded-md border bg-background px-3 py-1.5 text-sm"
          >
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {!effectiveClassId && classes.length > 1 && (
        <p className="text-sm text-muted-foreground">Please select a class to view features.</p>
      )}

      {effectiveClassId && (
        <div className="space-y-4">
          {featureDisplays.map((feature) => (
            <Card key={feature.slug}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{feature.name}</CardTitle>
                    {feature.description && (
                      <CardDescription className="mt-1">
                        {feature.description}
                      </CardDescription>
                    )}
                  </div>
                  <Badge variant={feature.enabled ? 'default' : 'secondary'}>
                    {feature.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <FeatureToggle
                  slug={feature.slug}
                  scope="class"
                  enabled={feature.enabled}
                  onToggle={handleToggle}
                  source={feature.hasClassOverride ? 'class' : feature.source}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
