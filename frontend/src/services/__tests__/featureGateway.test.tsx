import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/services/api', () => ({
  default: mockApi,
}))

import { useFeatureEnabled, useFeatureRegistry, useSetFeatureFlag, useDeleteFeatureFlag } from '../featureGateway'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

describe('featureGateway service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useFeatureEnabled', () => {
    it('returns enabled=true when API resolves feature as enabled', async () => {
      mockApi.get.mockResolvedValue({
        data: {
          direct_messages: { slug: 'direct_messages', enabled: true, source: 'default' },
          plagiarism: { slug: 'plagiarism', enabled: false, source: 'default' },
        },
      })

      const { result } = renderHook(() => useFeatureEnabled('direct_messages'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.enabled).toBe(true)
    })

    it('returns enabled=false when API resolves feature as disabled', async () => {
      mockApi.get.mockResolvedValue({
        data: {
          direct_messages: { slug: 'direct_messages', enabled: true, source: 'default' },
          plagiarism: { slug: 'plagiarism', enabled: false, source: 'default' },
        },
      })

      const { result } = renderHook(() => useFeatureEnabled('plagiarism'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.enabled).toBe(false)
    })

    it('returns enabled=true during loading (fail-open)', () => {
      // API has not resolved yet -- default state is loading
      mockApi.get.mockReturnValue(new Promise(() => { /* never resolves */ }))

      const { result } = renderHook(() => useFeatureEnabled('direct_messages'), {
        wrapper: createWrapper(),
      })

      expect(result.current.enabled).toBe(true)
      expect(result.current.isLoading).toBe(true)
    })

    it('returns enabled=true when API call fails (fail-open)', async () => {
      mockApi.get.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useFeatureEnabled('direct_messages'), {
        wrapper: createWrapper(),
      })

      // Wait for query to settle (initial attempt + 1 retry from hook config)
      await waitFor(() => {
        expect(result.current.enabled).toBe(true)
      }, { timeout: 3000 })

      // Verify that API was called at least once
      expect(mockApi.get).toHaveBeenCalledWith('/features/resolved')
    })

    it('calls GET /features/resolved endpoint', async () => {
      mockApi.get.mockResolvedValue({ data: {} })

      renderHook(() => useFeatureEnabled('direct_messages'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith('/features/resolved')
      })
    })
  })

  describe('useFeatureRegistry', () => {
    it('returns array of FeatureRegistryEntry objects', async () => {
      const mockRegistry = [
        {
          id: '1',
          slug: 'direct_messages',
          name: 'Direct Messages',
          description: 'Direct messaging between users',
          default_enabled: true,
          category: 'communication',
          created_at: '2026-01-01T00:00:00Z',
        },
        {
          id: '2',
          slug: 'plagiarism',
          name: 'Plagiarism Detection',
          description: 'Code similarity detection',
          default_enabled: true,
          category: 'academic',
          created_at: '2026-01-01T00:00:00Z',
        },
      ]

      mockApi.get.mockResolvedValue({ data: mockRegistry })

      const { result } = renderHook(() => useFeatureRegistry(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.data).toEqual(mockRegistry)
    })

    it('calls GET /features/registry endpoint', async () => {
      mockApi.get.mockResolvedValue({ data: [] })

      renderHook(() => useFeatureRegistry(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith('/features/registry')
      })
    })
  })

  describe('useSetFeatureFlag', () => {
    it('calls POST /features/{slug}/flags with payload', async () => {
      mockApi.post.mockResolvedValue({ data: { ok: true } })

      const { result } = renderHook(() => useSetFeatureFlag(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        slug: 'plagiarism',
        enabled: true,
        scope: 'campus',
        scope_id: 1,
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockApi.post).toHaveBeenCalledWith('/features/plagiarism/flags', {
        enabled: true,
        scope: 'campus',
        scope_id: 1,
      })
    })
  })

  describe('useDeleteFeatureFlag', () => {
    it('calls DELETE /features/{slug}/flags with query params', async () => {
      mockApi.delete.mockResolvedValue({ data: { ok: true } })

      const { result } = renderHook(() => useDeleteFeatureFlag(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        slug: 'plagiarism',
        scope: 'campus',
        scope_id: 1,
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockApi.delete).toHaveBeenCalledWith(
        '/features/plagiarism/flags?scope=campus&scope_id=1'
      )
    })
  })
})
