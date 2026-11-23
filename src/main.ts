import { useColorMode } from '@vueuse/core'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { applyPlatformAttribute } from '@/lib/platform'
import { useSettingsStore } from '@/stores/settings'
import App from './App.vue'
import i18n from './i18n'
import router from './router'
import './assets/css/base.css'

// Expose the OS to CSS before the first paint (e.g. the titlebar's traffic-light gap is macOS-only)
applyPlatformAttribute()

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(i18n)

initAppSettings()

// Mount right away: decorum adopts our titlebar only if it exists when the DOM is ready.
// The shell stays hidden until the saved panel layout arrives (see AppShell.vue).
app.mount('#app')
useSettingsStore().loadSidebar()
useSettingsStore().loadKeybindings()

async function initAppSettings() {
  const settingsStore = useSettingsStore()
  const mode = useColorMode()
  // Sets the theme based on the user's settings
  const theme = await settingsStore.getSetting<string>('theme') as 'light' | 'dark' | 'auto'
  if (!theme) {
    settingsStore.setSetting('theme', mode.value)
  }
  else {
    mode.value = theme
  }

  // Set the language based on the user's settings
  const language = await settingsStore.getSetting<string>('language')
  if (language)
    i18n.global.locale.value = language
}
