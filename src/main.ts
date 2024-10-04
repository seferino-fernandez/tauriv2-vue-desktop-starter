import { useSettingsStore } from '@/stores/settings'
import { useColorMode } from '@vueuse/core'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import i18n from './i18n'
import router from './router'
import '@/assets/css/base.css'

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(i18n)

initAppSettings()

app.mount('#app')

async function initAppSettings() {
  const settingsStore = useSettingsStore()
  await settingsStore.init()
  const mode = useColorMode()
  // Sets the theme based on the user's settings
  const theme = await settingsStore.getSetting<string>('theme')
  if (theme) {
    mode.value = theme as 'light' | 'dark'
  }
  else {
    // If the user hasn't set a theme, default to light
    settingsStore.setSetting('theme', 'light')
    mode.value = 'light'
  }

  // Set the language based on the user's settings
  const language = await settingsStore.getSetting<string>('language')
  if (language)
    i18n.global.locale.value = language
}
