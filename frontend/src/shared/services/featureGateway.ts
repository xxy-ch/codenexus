import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from './api'

export interface FeatureState {
  slug: string
  enabled: boolean
  source: 'default' | 'global' | 'campus' | 'grade' | 'class' | 'system_emergency_off'
}

export interface FeatureRegistryEntry {
  id: string
  slug: string
  name: string
  description: string | null
  default_enabled: boolean
  category: string
  created_at: string
}

interface SetFlagPayload {
  slug: string
  enabled: boolean
  scope: string
  scope_id?: number
}

interface DeleteFlagPayload {
  slug: string
  scope: string
  scope_id?: number
}

const FEATURE_QUERY_KEY = ['features'] as const

export type FeaturePackageItem = SetFlagPayload

/**
 * Resolves whether a feature is enabled for the current user context.
 *
 * Fail-open design: returns `enabled: true` when data is unavailable
 * (loading or error). Backend still enforces feature gates with 404,
 * so the frontend fail-open is UX-only.
 */
export function useFeatureEnabled(slug: string): { enabled: boolean; isLoading: boolean } {
  const { data: features, isLoading } = useQuery({
    queryKey: [...FEATURE_QUERY_KEY, 'resolved'],
    queryFn: async () => {
      const { data } = await api.get('/features/resolved')
      return data as Record<string, FeatureState>
    },
    staleTime: 60_000,
    retry: 1,
  })

  return {
    enabled: features?.[slug]?.enabled ?? true,
    isLoading,
  }
}

/**
 * Fetches the full feature registry (all registered features with metadata).
 */
export function useFeatureRegistry() {
  return useQuery({
    queryKey: [...FEATURE_QUERY_KEY, 'registry'],
    queryFn: async () => {
      const { data } = await api.get('/features/registry')
      return data as FeatureRegistryEntry[]
    },
    staleTime: 5 * 60_000,
  })
}

/**
 * Mutation hook to set (create or update) a feature flag override.
 * Invalidates both resolved and registry caches on success.
 */
export function useSetFeatureFlag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: SetFlagPayload) => {
      const { slug, ...body } = payload
      const { data } = await api.post(`/features/${slug}/flags`, body)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...FEATURE_QUERY_KEY, 'resolved'] })
      queryClient.invalidateQueries({ queryKey: [...FEATURE_QUERY_KEY, 'registry'] })
      queryClient.invalidateQueries({ queryKey: FEATURE_QUERY_KEY })
    },
  })
}

/**
 * Mutation hook to delete a feature flag override.
 * Invalidates both resolved and registry caches on success.
 */
export function useDeleteFeatureFlag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: DeleteFlagPayload) => {
      const { slug, scope, scope_id } = payload
      const params = new URLSearchParams({ scope })
      if (scope_id !== undefined) {
        params.set('scope_id', String(scope_id))
      }
      const { data } = await api.delete(`/features/${slug}/flags?${params.toString()}`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...FEATURE_QUERY_KEY, 'resolved'] })
      queryClient.invalidateQueries({ queryKey: [...FEATURE_QUERY_KEY, 'registry'] })
      queryClient.invalidateQueries({ queryKey: FEATURE_QUERY_KEY })
    },
  })
}

export async function importFeaturePackage(items: FeaturePackageItem[]) {
  await Promise.all(
    items.map(({ slug, ...body }) => api.post(`/features/${slug}/flags`, body)),
  )
}
