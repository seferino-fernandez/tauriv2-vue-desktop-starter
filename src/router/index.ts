import type { Component } from 'vue'
import type { RouteLocationNormalizedLoaded, RouteLocationResolved, RouteRecordRaw } from 'vue-router'
import { createMemoryHistory, createRouter } from 'vue-router'
import IconGear from '~icons/ph/gear-duotone'
import IconHouse from '~icons/ph/house-duotone'

declare module 'vue-router' {
  interface RouteMeta {
    /** i18n key of the page title, shown in the titlebar and as the nested panel's label */
    titleKey?: string
    /** Activity bar icon */
    icon?: Component
    /** Activity bar section that lists the page; unlisted when omitted */
    nav?: NavSection
  }
}

/** `main` sits at the top of the activity bar, `footer` is pinned to its bottom */
export type NavSection = 'main' | 'footer'

export interface NavItem {
  name: string
  titleKey: string
  icon?: Component
}

// The routes are the single source for the activity bar: give a page `meta.nav` to list it.
// A page gets a nested panel by adding a `sidebar` named view next to its `default` one;
// pages without one show no panel (see docs/layout.md).
export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/home',
    children: [
      {
        path: 'home',
        name: 'home',
        components: {
          default: () => import('@/pages/home/index.vue'),
          sidebar: () => import('@/pages/home/panel.vue'),
        },
        meta: { titleKey: 'home.label', icon: IconHouse, nav: 'main' },
      },
      {
        path: 'settings',
        name: 'settings',
        components: {
          default: () => import('@/pages/settings/index.vue'),
          sidebar: () => import('@/pages/settings/panel.vue'),
        },
        meta: { titleKey: 'settings.label', icon: IconGear, nav: 'footer' },
      },
    ],
  },
]

/** Named routes listed in an activity bar section, in declaration order */
export function navItems(section: NavSection, records: readonly RouteRecordRaw[] = routes): NavItem[] {
  return records.flatMap((record) => {
    const { name, meta } = record
    const own = meta?.nav === section && typeof name === 'string' && meta.titleKey
      ? [
          { name, titleKey: meta.titleKey, icon: meta.icon },
        ]
      : []
    return [
      ...own,
      ...navItems(section, record.children ?? []),
    ]
  })
}

/** Whether the page shown for a route has a nested panel (a `sidebar` named view) */
export function hasPanel(route: RouteLocationNormalizedLoaded | RouteLocationResolved): boolean {
  return Boolean(route.matched[route.matched.length - 1]?.components?.sidebar)
}

const router = createRouter({
  history: createMemoryHistory(),
  routes,
})

export default router
