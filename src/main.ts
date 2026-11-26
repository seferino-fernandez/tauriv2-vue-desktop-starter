import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { blockBrowserDefaults } from '@/lib/browser-defaults'
import { logError } from '@/lib/log'
import { applyPlatformAttribute } from '@/lib/platform'
import { useSettingsStore } from '@/stores/settings'
import App from './App.vue'
import i18n from './i18n'
import router from './router'
import './assets/css/base.css'

// Expose the OS to CSS before the first paint (e.g. the titlebar's traffic-light gap is macOS-only)
applyPlatformAttribute()
blockBrowserDefaults()

const pinia = createPinia()
const app = createApp(App)

// Errors nothing else caught go to the log file, so a bug report can include them
app.config.errorHandler = (error, _instance, info) => logError(`Vue error (${info})`, error)
window.addEventListener('unhandledrejection', event => logError('Unhandled promise rejection', event.reason))

app.use(pinia)
app.use(router)
app.use(i18n)

// Nothing else holds the theme, so ask for the saved settings before anything else
loadSettings()

// Mount right away: decorum adopts our titlebar only if it exists when the DOM is ready.
// The shell stays hidden until the saved panel layout arrives (see AppShell.vue).
app.mount('#app')

async function loadSettings() {
  const settingsStore = useSettingsStore()
  await settingsStore.load()
  // Set the language based on the user's settings
  if (settingsStore.language)
    i18n.global.locale.value = settingsStore.language
}
