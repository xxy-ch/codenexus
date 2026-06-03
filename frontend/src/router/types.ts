import type { ReactNode } from 'react'
import type { FEATURE_FLAGS } from '@/services/config'
import type { User } from '@/types/auth'

export type FeatureFlagName = keyof typeof FEATURE_FLAGS
export type RouteRole = User['role']

export interface RouteEntry {
  id: string
  path?: string
  index?: boolean
  element: ReactNode
  featureFlag?: FeatureFlagName
}

export interface NavigationItem {
  id: string
  label: string
  path: string
  icon: string
  roles?: RouteRole[]
  featureFlag?: FeatureFlagName
}

export interface AppRouteModule {
  id: string
  publicRoutes?: RouteEntry[]
  workspaceRoutes?: RouteEntry[]
  teacherRoutes?: RouteEntry[]
  adminRoutes?: RouteEntry[]
  navigation?: NavigationItem[]
}
