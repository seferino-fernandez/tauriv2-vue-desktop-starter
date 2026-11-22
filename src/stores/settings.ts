import { LazyStore } from '@tauri-apps/plugin-store'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { clampPanelWidth, PANEL_DEFAULT_WIDTH } from '@/lib/layout'

const store: LazyStore = new LazyStore('settings.json')
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

  return {
    getSetting,
    setSetting,
    getSettings,
    sidebarOpen,
    sidebarWidth,
    loadSidebar,
    setSidebarOpen,
    setSidebarWidth,
  }
})
