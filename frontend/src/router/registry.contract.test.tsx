import { describe, expect, it } from 'vitest'
import { FEATURE_FLAGS } from '@/services/config'
import {
  getAdminRoutes,
  getNavigationItemsForUser,
  getPublicRoutes,
  getTeacherRoutes,
  getWorkspaceRoutes,
  routeModules,
} from './registry'

type MutableFeatureFlags = {
  directMessages: boolean
  plagiarism: boolean
}

function routeKey(route: { id: string }) {
  return route.id
}

describe('modular route registry contract', () => {
  it('keeps route modules importable by feature area', () => {
    expect(routeModules.map((module) => module.id)).toEqual(['auth', 'workspace', 'teacher', 'admin'])
  })

  it('exposes unique route ids across all module groups', () => {
    const routes = [
      ...getPublicRoutes(),
      ...getWorkspaceRoutes(),
      ...getTeacherRoutes(),
      ...getAdminRoutes(),
    ]
    const ids = routes.map(routeKey)

    expect(new Set(ids).size).toBe(ids.length)
  })

  it('filters feature-gated routes without mutating module definitions', () => {
    Object.assign(FEATURE_FLAGS as MutableFeatureFlags, {
      directMessages: false,
      plagiarism: false,
    })

    expect(getWorkspaceRoutes().some((route) => route.id === 'messages')).toBe(false)
    expect(getAdminRoutes().some((route) => route.id === 'admin-similarity-scan')).toBe(false)

    Object.assign(FEATURE_FLAGS as MutableFeatureFlags, {
      directMessages: true,
      plagiarism: true,
    })

    expect(getWorkspaceRoutes().some((route) => route.id === 'messages')).toBe(true)
    expect(getAdminRoutes().some((route) => route.id === 'admin-similarity-scan')).toBe(true)
  })

  it('derives role-aware navigation from module metadata', () => {
    expect(getNavigationItemsForUser('user').map((item) => item.path)).not.toContain('/admin')
    expect(getNavigationItemsForUser('teacher').map((item) => item.path)).toContain('/teacher/classes')
    expect(getNavigationItemsForUser('admin').map((item) => item.path)).toContain('/admin')
    expect(getNavigationItemsForUser('root').map((item) => item.path)).toContain('/admin')
  })
})
