import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createI18n } from 'vue-i18n'
import ThemeSwitch from './ThemeSwitch.vue'

// eslint-disable-next-line unused-imports/no-unused-vars
const mockSetSetting = vi.fn()

vi.mock('@tauri-apps/plugin-store', () => {
  class MockLazyStore {
    get = vi.fn()
    set = vi.fn()
    save = vi.fn()
    entries = vi.fn().mockResolvedValue([])
  }
  return { LazyStore: MockLazyStore }
})

const i18n = createI18n({
  locale: 'en',
  legacy: false,
  messages: {
    en: {
      settings: {
        theme: {
          label: 'Theme',
          light: 'Light',
          dark: 'Dark',
          system: 'System',
        },
      },
    },
  },
})

function mountThemeSwitch() {
  return mount(ThemeSwitch, {
    global: {
      plugins: [i18n],
    },
  })
}

describe('themeSwitch', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders the trigger button', () => {
    const wrapper = mountThemeSwitch()
    const button = wrapper.find('button')
    expect(button.exists()).toBe(true)
  })

  it('contains a screen-reader label', () => {
    const wrapper = mountThemeSwitch()
    const srOnly = wrapper.find('.sr-only')
    expect(srOnly.exists()).toBe(true)
    expect(srOnly.text()).toBe('Theme')
  })

  it('renders sun and moon icons', () => {
    const wrapper = mountThemeSwitch()
    const svgs = wrapper.findAll('svg')
    expect(svgs.length).toBe(2)
    expect(svgs[0].classes()).toContain('scale-100')
    expect(svgs[1].classes()).toContain('scale-0')
  })
})
