import { FEATURE_FLAGS } from '@/services/config'
import type { User } from '@/types/auth'
import type { AppRouteModule, NavigationItem, RouteEntry } from './types'
import { adminModule } from './modules/admin'
import { authModule } from './modules/auth'
import { teacherModule } from './modules/teacher'
import { workspaceModule } from './modules/workspace'

export const routeModules: AppRouteModule[] = [
  authModule,
  workspaceModule,
  teacherModule,
  adminModule,
]

function routeEnabled(route: RouteEntry) {
  return !route.featureFlag || FEATURE_FLAGS[route.featureFlag]
}

function navigationEnabled(item: NavigationItem, role?: User['role']) {
  const roleAllowed = !item.roles || (role ? item.roles.includes(role) : false)
  const featureAllowed = !item.featureFlag || FEATURE_FLAGS[item.featureFlag]
  return roleAllowed && featureAllowed
}

function collectRoutes(selector: (module: AppRouteModule) => RouteEntry[] | undefined) {
  return routeModules.flatMap((module) => selector(module) ?? []).filter(routeEnabled)
}

export function getPublicRoutes() {
  return collectRoutes((module) => module.publicRoutes)
}

export function getWorkspaceRoutes() {
  return collectRoutes((module) => module.workspaceRoutes)
}

export function getTeacherRoutes() {
  return collectRoutes((module) => module.teacherRoutes)
}

export function getAdminRoutes() {
  return collectRoutes((module) => module.adminRoutes)
}

export function getNavigationItemsForUser(role?: User['role']) {
  return routeModules
    .flatMap((module) => module.navigation ?? [])
    .filter((item) => navigationEnabled(item, role))
}
