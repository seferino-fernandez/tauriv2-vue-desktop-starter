import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSettingsStore } from './settings'

const saved = vi.hoisted(() => new Map<string, unknown>())

vi.mock('@tauri-apps/plugin-store', () => ({
  LazyStore: class {
    get = vi.fn(async (key: string) => saved.get(key))
    set = vi.fn(async (key: string, value: unknown) => {
      saved.set(key, value)
    })

    save = vi.fn()
  },
}))

const html = document.documentElement

describe('settings store: theme', () => {
  beforeEach(() => {
    saved.clear()
    localStorage.clear()
    html.className = ''
    setActivePinia(createPinia())
  })

  it('applies the theme saved in settings.json', async () => {
    saved.set('theme', 'dark')
    await useSettingsStore().loadTheme()
    await flushPromises()
    expect(html.classList.contains('dark')).toBe(true)
  })

  it('follows the system when no valid theme is saved', async () => {
    saved.set('theme', 'purple')
    await useSettingsStore().loadTheme()
    await flushPromises()
    expect(html.classList.contains('dark')).toBe(false)
    expect(saved.get('theme')).toBe('purple')
  })

  it('saves a new theme to settings.json only', async () => {
    const settingsStore = useSettingsStore()
    await settingsStore.setTheme('dark')
    await flushPromises()
    expect(html.classList.contains('dark')).toBe(true)
    expect(saved.get('theme')).toBe('dark')
    expect(localStorage.length).toBe(0)

    await settingsStore.setTheme('light')
    await flushPromises()
    expect(html.classList.contains('dark')).toBe(false)
    expect(saved.get('theme')).toBe('light')
  })
})
