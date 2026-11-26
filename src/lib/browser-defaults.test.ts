import { describe, expect, it } from 'vitest'
import { isBrowserKeybinding } from './browser-defaults'

describe('isBrowserKeybinding', () => {
  it('blocks find, print and view source in every build', () => {
    for (const binding of [
      'Mod+KeyF',
      'Mod+KeyP',
      'Mod+KeyU',
      'F3',
    ]) {
      expect(isBrowserKeybinding(binding, false)).toBe(true)
      expect(isBrowserKeybinding(binding, true)).toBe(true)
    }
  })

  it('keeps reload in development only', () => {
    for (const binding of ['Mod+KeyR', 'Mod+Shift+KeyR', 'F5']) {
      expect(isBrowserKeybinding(binding, false)).toBe(false)
      expect(isBrowserKeybinding(binding, true)).toBe(true)
    }
  })

  it('leaves other shortcuts alone', () => {
    for (const binding of [
      'Mod+KeyB',
      'Mod+KeyC',
      'Mod+Shift+KeyP',
      'KeyF',
    ])
      expect(isBrowserKeybinding(binding, true)).toBe(false)
  })
})
