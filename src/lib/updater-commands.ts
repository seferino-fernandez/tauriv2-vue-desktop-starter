/**
 * Typed wrappers for the updater commands in `src-tauri/src/updater.rs`. Those exist only in
 * builds with the `updater` cargo feature; `updaterAvailable` says whether this one has it.
 */
import { Channel, invoke } from '@tauri-apps/api/core'

/** A newer version than the one running */
export interface AvailableUpdate {
  version: string
  currentVersion: string
}

/** How much of the update has downloaded, in bytes; `total` is `null` if the server did not say */
export interface DownloadProgress {
  downloaded: number
  total: number | null
}

export function updaterAvailable(): Promise<boolean> {
  return invoke('updater_available')
}

/** `null` means the running version is the latest */
export function checkForUpdate(): Promise<AvailableUpdate | null> {
  return invoke('check_for_update')
}

/** Downloads and installs the update `checkForUpdate` found */
export function installUpdate(onProgress: (progress: DownloadProgress) => void): Promise<void> {
  const channel = new Channel<DownloadProgress>()
  channel.onmessage = onProgress
  return invoke('install_update', { onProgress: channel })
}

export function restartApp(): Promise<void> {
  return invoke('restart_app')
}
