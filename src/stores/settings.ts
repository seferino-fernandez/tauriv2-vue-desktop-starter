import type { CommandId, KeybindingOverrides, KeybindingProblem, Keybindings } from '@/lib/keybindings'
import { LazyStore } from '@tauri-apps/plugin-store'
import { useColorMode } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { fontStack } from '@/lib/fonts'
import { commands, defaultKeybindings, keybindingProblem, normalizeKeybinding, sanitizeKeybindings } from '@/lib/keybindings'
import { clampPanelWidth, PANEL_DEFAULT_WIDTH } from '@/lib/layout'

const store: LazyStore = new LazyStore('settings.json')

/** `auto` follows the system's light or dark setting */
export type Theme = 'light' | 'dark' | 'auto'
const themes: readonly unknown[] = ['light', 'dark', 'auto'] satisfies Theme[]

export const useSettingsStore = defineStore('settings', () => {
  async function getSetting<T>(key: string): Promise<T | undefined> {
    const value = await store.get<T>(key)
    return value ?? undefined
  }

  async function setSetting<T>(key: string, value: T) {
    await store.set(key, value)
    return await store.save()
  }

  async function getSettings() {
    return await store.entries<any>()
  }

  /** Whether the nested panel is open (on every page); `undefined` until the saved layout has loaded */
  const sidebarOpen = ref<boolean>()
  /** Nested panel width in px */
  const sidebarWidth = ref(PANEL_DEFAULT_WIDTH)

  async function loadSidebar() {
    try {
      const [open, width] = await Promise.all([
        getSetting<boolean>('sidebarOpen'),
        getSetting<number>('sidebarWidth'),
      ])
      if (typeof width === 'number')
        sidebarWidth.value = clampPanelWidth(width)
      sidebarOpen.value = open ?? true
    }
    catch {
      // No store outside the Tauri webview (e.g. the Vite dev server in a browser)
      sidebarOpen.value = true
    }
  }

  async function setSidebarOpen(open: boolean) {
    sidebarOpen.value = open
    await setSetting('sidebarOpen', open)
  }

  async function setSidebarWidth(width: number) {
    sidebarWidth.value = clampPanelWidth(width)
    await setSetting('sidebarWidth', sidebarWidth.value)
  }

  // Applies the theme to <html>. storageKey null: settings.json is its only store, not localStorage
  const colorMode = useColorMode({ storageKey: null })

  async function loadTheme() {
    try {
      const saved = await getSetting<unknown>('theme')
      if (themes.includes(saved))
        colorMode.value = saved as Theme
    }
    catch {
      // No store outside the Tauri webview: the theme follows the system
    }
  }

  /** The chosen theme, `auto` included (the color mode ref itself only reports light or dark) */
  const theme = computed(() => colorMode.store.value as Theme)

  async function setTheme(theme: Theme) {
    colorMode.value = theme
    await setSetting('theme', theme)
  }

  const fontFamily = ref<string | null>(null)
  const fontReady = ref(false)

  watch(fontFamily, (family) => {
    const style = document.documentElement.style
    if (family)
      style.setProperty('--app-font-family', fontStack(family))
    else
      style.removeProperty('--app-font-family')
  })

  async function loadFont() {
    try {
      const saved = await getSetting<unknown>('fontFamily')
      if (typeof saved === 'string' && saved.trim())
        fontFamily.value = saved
    }
    catch {
      // Keep the system font if the settings store isn't available.
    }
    finally {
      fontReady.value = true
    }
  }

  async function setFontFamily(family: string | null) {
    await setSetting('fontFamily', family)
    fontFamily.value = family
  }

  /** Shortcuts the user changed, saved as `keybindings`; the rest use their defaults */
  const keybindingOverrides = ref<KeybindingOverrides>({})
  /** Every command's current shortcut */
  const keybindings = computed<Keybindings>(() => ({
    ...defaultKeybindings(),
    ...keybindingOverrides.value,
  }))
  /** True while a settings field is recording a shortcut, so pressing one does not also run it */
  const recordingKeybinding = ref(false)

  async function loadKeybindings() {
    try {
      keybindingOverrides.value = sanitizeKeybindings(await getSetting<unknown>('keybindings'))
    }
    catch {
      // No store outside the Tauri webview: every command keeps its default
    }
  }

  /**
   * Gives `command` a new shortcut and saves it, unless the shortcut is refused; then nothing
   * changes and the reason is returned. Setting the default removes the override.
   */
  async function setKeybinding(command: CommandId, binding: string): Promise<KeybindingProblem | undefined> {
    const problem = keybindingProblem(binding, command, keybindings.value)
    if (problem)
      return problem
    const { [command]: _, ...others } = keybindingOverrides.value
    const normalized = normalizeKeybinding(binding)!
    keybindingOverrides.value = normalized === commands[command].defaultBinding
      ? others
      : { ...others, [command]: normalized }
    await setSetting('keybindings', keybindingOverrides.value)
    return undefined
  }

  async function resetKeybinding(command: CommandId) {
    await setKeybinding(command, commands[command].defaultBinding)
  }

  return {
    getSetting,
    setSetting,
    getSettings,
    sidebarOpen,
    sidebarWidth,
    loadSidebar,
    setSidebarOpen,
    setSidebarWidth,
    theme,
    loadTheme,
    setTheme,
    fontFamily,
    fontReady,
    loadFont,
    setFontFamily,
    keybindingOverrides,
    keybindings,
    recordingKeybinding,
    loadKeybindings,
    setKeybinding,
    resetKeybinding,
  }
})
