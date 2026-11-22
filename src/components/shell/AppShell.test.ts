import type { RouteRecordRaw } from 'vue-router'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from '@/App.vue'
import en from '@/i18n/locales/en.json'
import { PANEL_DEFAULT_WIDTH, PANEL_MAX_WIDTH } from '@/lib/layout'
import { routes } from '@/router'
import { useSettingsStore } from '@/stores/settings'

const store = vi.hoisted(() => ({
  saved: {} as Record<string, unknown>,
  get: vi.fn(),
  set: vi.fn(),
  save: vi.fn(),
}))

vi.mock('@tauri-apps/plugin-store', () => {
  class MockLazyStore {
    get = store.get
    set = store.set
    save = store.save
    entries = vi.fn().mockResolvedValue([])
  }
  return { LazyStore: MockLazyStore }
})

// A page with no nested panel: just a default view
const plainRoute: RouteRecordRaw = {
  path: '/plain',
  name: 'plain',
  component: {
    render: () => h('p', 'Plain page'),
  },
  meta: { titleKey: 'languages.label', nav: 'main' },
}

// Unmount between tests, or earlier apps keep handling ⌘/Ctrl+B on window
enableAutoUnmount(afterEach)

async function mountApp(path = '/home') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [...routes, plainRoute],
  })
  const i18n = createI18n({
    locale: 'en',
    legacy: false,
    messages: { en },
  })
  await useSettingsStore().loadSidebar()
  router.push(path)
  await router.isReady()
  const wrapper = mount(App, {
    global: {
      plugins: [router, i18n],
    },
    attachTo: document.body,
  })
  await flushPromises()
  return { wrapper, router }
}

const panel = () => document.querySelector<HTMLElement>('[data-slot="nested-panel"]')
const panelState = () => panel()?.getAttribute('data-state')
const icon = (label: string) => document.querySelector<HTMLElement>(`[data-slot="activity-bar"] a[aria-label="${label}"]`)!

async function click(element: HTMLElement) {
  element.click()
  await flushPromises()
}

describe('appShell', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    store.saved = {}
    store.get.mockImplementation(async (key: string) => store.saved[key])
    document.body.innerHTML = ''
  })

  it('lists pages in the activity bar from route meta, as icons only', async () => {
    await mountApp()
    const bar = document.querySelector('[data-slot="activity-bar"]')!
    const content = bar.querySelector('[data-sidebar="content"]')!
    const footer = bar.querySelector('[data-sidebar="footer"]')!
    expect([
      ...content.querySelectorAll('a'),
    ].map(a => a.getAttribute('aria-label'))).toEqual(['Home', 'Languages'])
    expect([
      ...footer.querySelectorAll('a'),
    ].map(a => a.getAttribute('aria-label'))).toEqual(['Settings'])
    expect(bar.textContent?.trim()).toBe('')
  })

  it('shows an icon\'s tooltip while the panel is open', async () => {
    await mountApp()
    expect(panelState()).toBe('expanded')
    icon('Settings').dispatchEvent(new FocusEvent('focus'))
    await flushPromises()
    expect(document.querySelector('[role="tooltip"]')?.textContent).toContain('Settings')
  })

  it('highlights the current page and labels the titlebar and the panel with it', async () => {
    const { router } = await mountApp()
    expect(icon('Home').getAttribute('data-active')).toBe('true')
    expect(document.querySelector('header h1')?.textContent?.trim()).toBe('Home')
    expect(panel()?.querySelector('[data-sidebar="header"]')?.textContent?.trim()).toBe('Home')

    await router.push('/settings')
    await flushPromises()
    expect(icon('Home').getAttribute('data-active')).toBe('false')
    expect(icon('Settings').getAttribute('data-active')).toBe('true')
    expect(document.querySelector('header h1')?.textContent?.trim()).toBe('Settings')
    expect(panel()?.querySelector('[data-sidebar="header"]')?.textContent?.trim()).toBe('Settings')
  })

  it('renders each page\'s own panel', async () => {
    const { router } = await mountApp()
    expect(panel()?.textContent).toContain('Projects')

    await router.push('/settings')
    await flushPromises()
    expect(panel()?.textContent).toContain('Appearance')
    expect(panel()?.textContent).not.toContain('Projects')
  })

  it('toggles the panel from the current page\'s icon and saves the state', async () => {
    await mountApp()
    await click(icon('Home'))
    expect(panelState()).toBe('collapsed')
    expect(panel()?.hasAttribute('inert')).toBe(true)
    expect(store.set).toHaveBeenCalledWith('sidebarOpen', false)

    await click(icon('Home'))
    expect(panelState()).toBe('expanded')
    expect(store.set).toHaveBeenLastCalledWith('sidebarOpen', true)
  })

  it('opens the panel when going to another page that has one', async () => {
    const { router } = await mountApp()
    await click(icon('Home'))
    expect(panelState()).toBe('collapsed')

    await click(icon('Settings'))
    expect(router.currentRoute.value.name).toBe('settings')
    expect(panelState()).toBe('expanded')
  })

  it('toggles the panel from the titlebar and with ⌘/Ctrl+B', async () => {
    await mountApp()
    await click(document.querySelector<HTMLElement>('header [data-sidebar="trigger"]')!)
    expect(panelState()).toBe('collapsed')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', metaKey: true }))
    await flushPromises()
    expect(panelState()).toBe('expanded')
    expect(store.set).toHaveBeenLastCalledWith('sidebarOpen', true)
  })

  it('opens the panel when coming from a page without one', async () => {
    store.saved = { sidebarOpen: false }
    const { router } = await mountApp('/plain')
    await click(icon('Home'))
    expect(router.currentRoute.value.name).toBe('home')
    expect(panelState()).toBe('expanded')
    expect(store.set).toHaveBeenCalledWith('sidebarOpen', true)
  })

  it('shows no panel or toggle on a page without one, and ⌘/Ctrl+B does nothing there', async () => {
    await mountApp('/plain')
    expect(document.querySelector('main')?.textContent).toContain('Plain page')
    expect(panel()).toBeNull()
    expect(document.querySelector('header [data-sidebar="trigger"]')).toBeNull()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', metaKey: true }))
    await click(icon('Languages'))
    expect(store.set).not.toHaveBeenCalled()
  })

  it('restores the saved open state and width', async () => {
    store.saved = { sidebarOpen: false, sidebarWidth: 300 }
    await mountApp()
    expect(panelState()).toBe('collapsed')
    expect(panel()?.style.width).toBe('0px')

    await click(icon('Home'))
    expect(panel()?.style.width).toBe('300px')
  })

  it('resizes the panel by dragging its edge, saving once when the drag ends', async () => {
    await mountApp()
    const handle = document.querySelector<HTMLElement>('[data-slot="nested-panel-resize"]')!
    handle.setPointerCapture = vi.fn()
    handle.dispatchEvent(new PointerEvent('pointerdown', { button: 0, pointerId: 1, clientX: 256 }))
    handle.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 320 }))
    await flushPromises()
    expect(panel()?.style.width).toBe('320px')
    handle.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 900 }))
    await flushPromises()
    expect(panel()?.style.width).toBe(`${PANEL_MAX_WIDTH}px`)
    expect(store.set).not.toHaveBeenCalled()

    handle.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }))
    await flushPromises()
    expect(store.set).toHaveBeenCalledTimes(1)
    expect(store.set).toHaveBeenCalledWith('sidebarWidth', PANEL_MAX_WIDTH)

    handle.dispatchEvent(new MouseEvent('dblclick'))
    await flushPromises()
    expect(panel()?.style.width).toBe(`${PANEL_DEFAULT_WIDTH}px`)
    expect(store.set).toHaveBeenLastCalledWith('sidebarWidth', PANEL_DEFAULT_WIDTH)
  })
})
