import type { SavedSettings } from '@/lib/settings-commands'
import { clearMocks, mockIPC } from '@tauri-apps/api/mocks'
import { vi } from 'vitest'

/** What `get_settings` returns for a new database: nothing chosen yet */
export function nothingSaved(): SavedSettings {
  return {
    theme: null,
    language: null,
    fontFamily: null,
    sidebarOpen: null,
    sidebarWidth: null,
    keybindings: {},
  }
}

/**
 * Stands in for the Rust settings commands. `get_settings` returns `saved` (unset fields are
 * `null`), and every other command is recorded in `sent` as `[command, args]`. Undo it with
 * `unmockSettingsIpc`.
 */
export function mockSettingsIpc(saved: Partial<SavedSettings> = {}) {
  const ipc = {
    saved: {
      ...nothingSaved(),
      ...saved,
    },
    sent: [] as [command: string, args: unknown][],
  }
  // `isTauri()` reads this global, which the real webview sets and `mockIPC` does not
  vi.stubGlobal('isTauri', true)
  // Events stay in the page: `emit` reaches `listen` without being recorded in `sent`
  mockIPC((command, args) => {
    if (command === 'get_settings')
      return structuredClone(ipc.saved)
    ipc.sent.push([command, args])
    return null
  }, { shouldMockEvents: true })
  return ipc
}

export function unmockSettingsIpc() {
  clearMocks()
  vi.unstubAllGlobals()
}
