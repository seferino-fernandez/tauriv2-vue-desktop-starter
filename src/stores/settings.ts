import { defineStore } from 'pinia'
import { Store } from '@tauri-apps/plugin-store'

export const useSettingsStore = defineStore('settings', () => {
  const store = new Store('settings.json')

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

  return { getSetting, setSetting, getSettings }
})
