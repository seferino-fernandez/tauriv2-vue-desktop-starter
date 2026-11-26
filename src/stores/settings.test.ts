import { mockIPC } from '@tauri-apps/api/mocks'
import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import i18n from '@/i18n'
import { PANEL_MAX_WIDTH } from '@/lib/layout'
import { mockSettingsIpc, nothingSaved, unmockSettingsIpc } from '@/test/settings-ipc'
import { useSettingsStore } from './settings'

const html = document.documentElement

beforeEach(() => {
  localStorage.clear()
  html.className = ''
  html.style.removeProperty('--app-font-family')
  setActivePinia(createPinia())
})

afterEach(() => {
  unmockSettingsIpc()
  vi.restoreAllMocks()
})

describe('settings store: theme', () => {
  it('applies the saved theme', async () => {
    mockSettingsIpc({ theme: 'dark' })
    await useSettingsStore().load()
    await flushPromises()
    expect(html.classList.contains('dark')).toBe(true)
  })

  it('follows the system when no theme is saved', async () => {
    mockSettingsIpc()
    const settingsStore = useSettingsStore()
    await settingsStore.load()
    await flushPromises()
    expect(settingsStore.theme).toBe('auto')
    expect(html.classList.contains('dark')).toBe(false)
  })

  it('saves a new theme to the database only', async () => {
    const ipc = mockSettingsIpc()
    const settingsStore = useSettingsStore()
    await settingsStore.setTheme('dark')
    await flushPromises()
    expect(html.classList.contains('dark')).toBe(true)
    expect(ipc.sent).toEqual([
      [
        'set_theme',
        { theme: 'dark' },
      ],
    ])
    expect(localStorage.length).toBe(0)

    await settingsStore.setTheme('light')
    await flushPromises()
    expect(html.classList.contains('dark')).toBe(false)
    expect(ipc.sent.at(-1)).toEqual([
      'set_theme',
      { theme: 'light' },
    ])
  })
})

describe('settings store: loading', () => {
  it('applies every saved setting', async () => {
    mockSettingsIpc({
      language: 'es',
      fontFamily: 'Inter',
      sidebarOpen: false,
      sidebarWidth: 9000,
      keybindings: { togglePanel: 'Mod+KeyJ', notACommand: 'Mod+KeyK' },
    })
    const settingsStore = useSettingsStore()
    expect(settingsStore.sidebarOpen).toBeUndefined()
    expect(settingsStore.fontReady).toBe(false)

    await settingsStore.load()
    await flushPromises()

    expect(settingsStore.language).toBe('es')
    expect(settingsStore.fontFamily).toBe('Inter')
    expect(html.style.getPropertyValue('--app-font-family')).toContain('Inter')
    expect(settingsStore.fontReady).toBe(true)
    expect(settingsStore.sidebarOpen).toBe(false)
    expect(settingsStore.sidebarWidth).toBe(PANEL_MAX_WIDTH)
    expect(settingsStore.keybindingOverrides).toEqual({ togglePanel: 'Mod+KeyJ' })
  })

  it('keeps the defaults when the settings cannot be read', async () => {
    mockSettingsIpc()
    mockIPC(() => {
      throw new Error('database is locked')
    })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const settingsStore = useSettingsStore()

    await settingsStore.load()

    expect(consoleError).toHaveBeenCalledOnce()
    expect(settingsStore.sidebarOpen).toBe(true)
    expect(settingsStore.fontReady).toBe(true)
    expect(settingsStore.theme).toBe('auto')
  })

  it('keeps the defaults and saves nothing outside the app', async () => {
    const ipc = mockSettingsIpc({ theme: 'dark' })
    vi.stubGlobal('isTauri', false)
    const settingsStore = useSettingsStore()

    await settingsStore.load()
    await settingsStore.setTheme('light')
    await settingsStore.setSidebarWidth(300)

    expect(settingsStore.sidebarOpen).toBe(true)
    expect(settingsStore.fontReady).toBe(true)
    expect(settingsStore.sidebarWidth).toBe(300)
    expect(ipc.sent).toEqual([])
  })
})

describe('settings store: saving', () => {
  it('sends each change to its command', async () => {
    const ipc = mockSettingsIpc()
    const settingsStore = useSettingsStore()

    await settingsStore.setLanguage('zh')
    await settingsStore.setFontFamily('Inter')
    await settingsStore.setFontFamily(null)
    await settingsStore.setSidebarOpen(false)
    await settingsStore.setSidebarWidth(9000)
    await settingsStore.setKeybinding('togglePanel', 'Mod+KeyJ')
    await settingsStore.resetKeybinding('togglePanel')

    expect(ipc.sent).toEqual([
      [
        'set_language',
        { language: 'zh' },
      ],
      [
        'set_font_family',
        { fontFamily: 'Inter' },
      ],
      [
        'set_font_family',
        { fontFamily: null },
      ],
      [
        'set_sidebar_open',
        { open: false },
      ],
      [
        'set_sidebar_width',
        { width: PANEL_MAX_WIDTH },
      ],
      [
        'set_keybinding',
        { command: 'togglePanel', binding: 'Mod+KeyJ' },
      ],
      [
        'reset_keybinding',
        { command: 'togglePanel' },
      ],
    ])
  })
})

/** Settings load, but every save fails */
function mockFailingSaves() {
  mockSettingsIpc()
  mockIPC((command) => {
    if (command === 'get_settings')
      return nothingSaved()
    throw new Error('disk full')
  })
  vi.spyOn(console, 'error').mockImplementation(() => {})
  return vi.spyOn(toast, 'error')
}

describe('settings store: failed saves', () => {
  it('puts the theme back and says so', async () => {
    const toastError = mockFailingSaves()
    const settingsStore = useSettingsStore()

    await settingsStore.setTheme('dark')
    await flushPromises()

    expect(settingsStore.theme).toBe('auto')
    expect(html.classList.contains('dark')).toBe(false)
    expect(toastError).toHaveBeenCalledOnce()
  })

  it('puts the language back and says so', async () => {
    const toastError = mockFailingSaves()
    const settingsStore = useSettingsStore()
    i18n.global.locale.value = 'zh'

    await settingsStore.setLanguage('zh')

    expect(settingsStore.language).toBeNull()
    expect(i18n.global.locale.value).toBe('en')
    expect(toastError).toHaveBeenCalledOnce()
  })

  it('keeps the shortcut that was saved before and says so', async () => {
    const toastError = mockFailingSaves()
    const settingsStore = useSettingsStore()

    await settingsStore.setKeybinding('togglePanel', 'Mod+KeyJ')

    expect(settingsStore.keybindingOverrides).toEqual({})
    expect(toastError).toHaveBeenCalledOnce()
  })

  it('keeps a panel change without a toast', async () => {
    const toastError = mockFailingSaves()
    const settingsStore = useSettingsStore()

    await settingsStore.setSidebarOpen(false)
    await settingsStore.setSidebarWidth(300)

    expect(settingsStore.sidebarOpen).toBe(false)
    expect(settingsStore.sidebarWidth).toBe(300)
    expect(toastError).not.toHaveBeenCalled()
  })

  it('rejects a font that was not saved, so the font picker can say so', async () => {
    const toastError = mockFailingSaves()
    const settingsStore = useSettingsStore()

    await expect(settingsStore.setFontFamily('Inter')).rejects.toThrow()

    expect(settingsStore.fontFamily).toBeNull()
    expect(toastError).not.toHaveBeenCalled()
  })
})
