import type { Store } from '@tauri-apps/plugin-store'
import { createStore } from '@tauri-apps/plugin-store'
import { defineStore } from 'pinia'

let store: Store = null
export const useSettingsStore = defineStore('settings', () => {
  async function init(): Promise<void> {
    if (store === null) {
      store = await createStore('settings.json')
    }
  }

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

  return { init, getSetting, setSetting, getSettings }
})
