/**
 * Turns off what the webview does because it is a browser: find, print, view source and
 * downloads always, and in production builds reload and the right-click menu too (both stay in
 * development, where they help). Text fields keep their right-click menu for copy and paste.
 *
 * Links that open a new window would get a webview popup on Windows, so they navigate this window
 * instead, where the navigation guard (src-tauri/src/navigation.rs) opens them in the browser.
 *
 * A shortcut a command uses still runs that command: `useKeybindings` handles it as well.
 */
import { keybindingFromEvent } from '@/lib/keybindings'
import { isMacOS } from '@/lib/platform'

const ALWAYS_BLOCKED = [
  'Mod+KeyF', // find
  'Mod+KeyG', // find next
  'Mod+Shift+KeyG', // find previous
  'F3', // find next
  'Mod+KeyP', // print
  'Mod+KeyU', // view source
  'Mod+KeyJ', // downloads
  'F7', // caret browsing
]

const BLOCKED_IN_PRODUCTION = [
  'Mod+KeyR', // reload
  'Mod+Shift+KeyR', // reload, skipping the cache
  'F5', // reload
]

/** Whether the webview's own action for this shortcut should be cancelled */
export function isBrowserKeybinding(binding: string, production: boolean): boolean {
  return ALWAYS_BLOCKED.includes(binding) || (production && BLOCKED_IN_PRODUCTION.includes(binding))
}

const EDITABLE = 'input, textarea, [contenteditable]:not([contenteditable="false"])'

export function blockBrowserDefaults() {
  const mac = isMacOS()
  const production = import.meta.env.PROD
  window.addEventListener('keydown', (event) => {
    const binding = keybindingFromEvent(event, mac)
    if (binding && isBrowserKeybinding(binding, production))
      event.preventDefault()
  }, { capture: true })
  window.addEventListener('click', (event) => {
    const link = event.target instanceof Element && event.target.closest('a[target="_blank"]')
    if (link instanceof HTMLAnchorElement && new URL(link.href).origin !== window.location.origin) {
      event.preventDefault()
      window.location.assign(link.href)
    }
  }, { capture: true })
  if (production) {
    window.addEventListener('contextmenu', (event) => {
      if (!(event.target instanceof Element && event.target.closest(EDITABLE)))
        event.preventDefault()
    }, { capture: true })
  }
}
