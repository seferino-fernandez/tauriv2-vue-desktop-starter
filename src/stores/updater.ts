import type { AvailableUpdate, DownloadProgress } from '@/lib/updater-commands'
import { isTauri } from '@tauri-apps/api/core'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { logError } from '@/lib/log'
import * as updaterCommands from '@/lib/updater-commands'

/** Where the update dialog is; `closed` hides it */
export type UpdateStep = 'closed' | 'checking' | 'upToDate' | 'available' | 'downloading' | 'installed' | 'checkFailed' | 'installFailed'

/**
 * In-app updates, in builds with the `updater` cargo feature. Nothing happens until the user
 * asks: `check` opens the dialog, `install` runs only when they choose it, and `restart` is
 * offered only once the install has finished.
 */
export const useUpdaterStore = defineStore('updater', () => {
  /** Whether this build can update itself; `init` finds out */
  const available = ref(false)
  const step = ref<UpdateStep>('closed')
  const update = ref<AvailableUpdate | null>(null)
  const progress = ref<DownloadProgress | null>(null)
  /** While checking or downloading the dialog stays open */
  const busy = computed(() => step.value === 'checking' || step.value === 'downloading')
  /** The download in percent, or `null` while its size is unknown */
  const percent = computed(() => {
    const { downloaded = 0, total = null } = progress.value ?? {}
    return total
      ? Math.min(100, Math.round(downloaded / total * 100))
      : null
  })

  async function init() {
    if (isTauri())
      available.value = await updaterCommands.updaterAvailable().catch(() => false)
  }

  async function check() {
    if (busy.value)
      return
    step.value = 'checking'
    update.value = null
    progress.value = null
    try {
      update.value = await updaterCommands.checkForUpdate()
      step.value = update.value ? 'available' : 'upToDate'
    }
    catch (error) {
      logError('Could not check for updates', error)
      step.value = 'checkFailed'
    }
  }

  async function install() {
    step.value = 'downloading'
    try {
      await updaterCommands.installUpdate((next) => {
        progress.value = next
      })
      step.value = 'installed'
    }
    catch (error) {
      logError('Could not install the update', error)
      step.value = 'installFailed'
    }
  }

  function restart() {
    updaterCommands.restartApp().catch(error => logError('Could not restart', error))
  }

  function close() {
    if (!busy.value)
      step.value = 'closed'
  }

  return {
    available,
    step,
    update,
    progress,
    busy,
    percent,
    init,
    check,
    install,
    restart,
    close,
  }
})
