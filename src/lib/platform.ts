import type { Platform } from '@tauri-apps/plugin-os'
import { platform } from '@tauri-apps/plugin-os'

/**
 * Returns the OS the app is running on, or `undefined` outside the Tauri
 * webview (e.g. the Vite dev server opened in a regular browser).
 *
 * `platform()` is synchronous: it reads a global the os plugin injects before
 * any page script runs, so it is safe to call before the app mounts.
 */
export function currentPlatform(): Platform | undefined {
  try {
    return platform()
  }
  catch {
    return undefined
  }
}

/**
 * Sets `data-platform` on the root element so CSS can adapt per OS,
 * e.g. Tailwind's `in-data-[platform=linux]:hidden`.
 */
export function applyPlatformAttribute(root: HTMLElement = document.documentElement): void {
  const current = currentPlatform()
  if (current)
    root.dataset.platform = current
}
