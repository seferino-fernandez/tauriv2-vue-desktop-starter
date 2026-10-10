import { platform } from '@tauri-apps/plugin-os'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { applyPlatformAttribute, currentPlatform } from './platform'

vi.mock('@tauri-apps/plugin-os', () => ({
  platform: vi.fn(),
}))

const mockedPlatform = vi.mocked(platform)

describe('currentPlatform', () => {
  beforeEach(() => {
    mockedPlatform.mockReset()
  })

  it('returns the platform reported by the os plugin', () => {
    mockedPlatform.mockReturnValue('linux')
    expect(currentPlatform()).toBe('linux')
  })

  it('returns undefined outside the Tauri webview', () => {
    mockedPlatform.mockImplementation(() => {
      throw new TypeError('window.__TAURI_OS_PLUGIN_INTERNALS__ is undefined')
    })
    expect(currentPlatform()).toBeUndefined()
  })
})

describe('applyPlatformAttribute', () => {
  beforeEach(() => {
    mockedPlatform.mockReset()
  })

  it('sets data-platform on the given element', () => {
    mockedPlatform.mockReturnValue('windows')
    const root = document.createElement('html')
    applyPlatformAttribute(root)
    expect(root.dataset.platform).toBe('windows')
  })

  it('defaults to the document root', () => {
    mockedPlatform.mockReturnValue('macos')
    applyPlatformAttribute()
    expect(document.documentElement.dataset.platform).toBe('macos')
    delete document.documentElement.dataset.platform
  })

  it('leaves the element untouched outside the Tauri webview', () => {
    mockedPlatform.mockImplementation(() => {
      throw new TypeError('window.__TAURI_OS_PLUGIN_INTERNALS__ is undefined')
    })
    const root = document.createElement('html')
    applyPlatformAttribute(root)
    expect(root.dataset.platform).toBeUndefined()
  })
})
