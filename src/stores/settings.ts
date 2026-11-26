import type { CommandId, KeybindingOverrides, KeybindingProblem, Keybindings } from '@/lib/keybindings'
import type { Theme } from '@/lib/settings-commands'
import { isTauri } from '@tauri-apps/api/core'
import { useColorMode } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { fontStack } from '@/lib/fonts'
import { commands, defaultKeybindings, keybindingProblem, normalizeKeybinding, sanitizeKeybindings } from '@/lib/keybindings'
import { clampPanelWidth, PANEL_DEFAULT_WIDTH } from '@/lib/layout'
import * as settingsCommands from '@/lib/settings-commands'

export type { Theme }

/**
 * Saves through `save` when running in the app. In a plain browser (the Vite dev server) there is
 * nowhere to save, so changes last until the page reloads.
 */
async function persist(save: () => Promise<void>) {
  if (isTauri())
    await save()
}

export const useSettingsStore = defineStore('settings', () => {
  /** Whether the nested panel is open (on every page); `undefined` until the saved settings have loaded */
  const sidebarOpen = ref<boolean>()
  /** Nested panel width in px */
  const sidebarWidth = ref(PANEL_DEFAULT_WIDTH)

  async function setSidebarOpen(open: boolean) {
    sidebarOpen.value = open
    await persist(() => settingsCommands.setSidebarOpen(open))
  }

  async function setSidebarWidth(width: number) {
    sidebarWidth.value = clampPanelWidth(width)
    await persist(() => settingsCommands.setSidebarWidth(sidebarWidth.value))
  }

  // Applies the theme to <html>. storageKey null: the database is its only store, not localStorage
  const colorMode = useColorMode({ storageKey: null })

  /** The chosen theme, `auto` included (the color mode ref itself only reports light or dark) */
  const theme = computed(() => colorMode.store.value as Theme)

  async function setTheme(theme: Theme) {
    colorMode.value = theme
    await persist(() => settingsCommands.setTheme(theme))
  }

  /** The saved interface language, `null` until the user picks one; main.ts applies it to i18n */
  const language = ref<string | null>(null)

  async function setLanguage(locale: string) {
    language.value = locale
    await persist(() => settingsCommands.setLanguage(locale))
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

  async function setFontFamily(family: string | null) {
    await persist(() => settingsCommands.setFontFamily(family))
    fontFamily.value = family
  }

  /** Shortcuts the user changed (the only ones saved); the rest use their defaults */
  const keybindingOverrides = ref<KeybindingOverrides>({})
  /** Every command's current shortcut */
  const keybindings = computed<Keybindings>(() => ({
    ...defaultKeybindings(),
    ...keybindingOverrides.value,
  }))
  /** True while a settings field is recording a shortcut, so pressing one does not also run it */
  const recordingKeybinding = ref(false)

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
    const isDefault = normalized === commands[command].defaultBinding
    keybindingOverrides.value = isDefault
      ? others
      : { ...others, [command]: normalized }
    await persist(() => isDefault
      ? settingsCommands.resetKeybinding(command)
      : settingsCommands.setKeybinding(command, normalized))
    return undefined
  }

  async function resetKeybinding(command: CommandId) {
    await setKeybinding(command, commands[command].defaultBinding)
  }

  /**
   * Applies everything the user saved. Until it settles the shell stays hidden
   * (`sidebarOpen` is `undefined`) and the font picker waits (`fontReady` is false). Outside
   * the app, or if the settings cannot be read, every setting keeps its default.
   */
  async function load() {
    try {
      if (!isTauri())
        return
      const saved = await settingsCommands.getSettings()
      if (saved.theme)
        colorMode.value = saved.theme
      language.value = saved.language
      fontFamily.value = saved.fontFamily
      if (saved.sidebarWidth !== null)
        sidebarWidth.value = clampPanelWidth(saved.sidebarWidth)
      sidebarOpen.value = saved.sidebarOpen ?? true
      keybindingOverrides.value = sanitizeKeybindings(saved.keybindings)
    }
    catch (error) {
      console.error('Could not load the saved settings', error)
    }
    finally {
      sidebarOpen.value ??= true
      fontReady.value = true
    }
  }

  return {
    load,
    sidebarOpen,
    sidebarWidth,
    setSidebarOpen,
    setSidebarWidth,
    theme,
    setTheme,
    language,
    setLanguage,
    fontFamily,
    fontReady,
    setFontFamily,
    keybindingOverrides,
    keybindings,
    recordingKeybinding,
    setKeybinding,
    resetKeybinding,
  }
})
