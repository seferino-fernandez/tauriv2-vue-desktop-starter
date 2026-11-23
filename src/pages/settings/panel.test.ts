import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import { createI18n } from 'vue-i18n'
import { SidebarProvider } from '@/components/ui/sidebar'
import en from '@/i18n/locales/en.json'
import { CONTENT_ID } from '@/lib/layout'
import SettingsPage from './index.vue'
import SettingsPanel from './panel.vue'
import { sectionElementId, settingsSections } from './sections'

vi.mock('@tauri-apps/plugin-store', () => ({
  LazyStore: class {
    get = vi.fn()
    set = vi.fn()
    save = vi.fn()
  },
}))

enableAutoUnmount(afterEach)

// The settings page in the shell's scroll container, next to its panel
function mountSettings() {
  const i18n = createI18n({
    locale: 'en',
    legacy: false,
    messages: { en },
  })
  return mount(() => h(SidebarProvider, () => [
    h(SettingsPanel),
    h('main', { id: CONTENT_ID }, [
      h(SettingsPage),
    ]),
  ]), {
    global: {
      plugins: [i18n],
    },
    attachTo: document.body,
  })
}

function entry(label: string) {
  return [
    ...document.querySelectorAll<HTMLElement>('[data-sidebar="menu-button"]'),
  ]
    .find(button => button.textContent?.trim() === label)!
}

/** Lay the sections out as if the page were scrolled: each one's top, relative to the container's */
function placeSections(tops: Record<string, number>) {
  for (const [id, top] of Object.entries(tops))
    document.getElementById(sectionElementId(id))!.getBoundingClientRect = () => ({ top }) as DOMRect
}

describe('settings panel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    document.body.innerHTML = ''
    Element.prototype.scrollIntoView = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('has a section on the page for every entry', async () => {
    mountSettings()
    await flushPromises()
    for (const section of settingsSections)
      expect(document.getElementById(sectionElementId(section.id))).not.toBeNull()
  })

  it('jumps to a section and highlights it', async () => {
    mountSettings()
    await flushPromises()
    expect(entry('Appearance').getAttribute('data-active')).toBe('true')

    entry('Languages').click()
    await flushPromises()
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
    expect(vi.mocked(Element.prototype.scrollIntoView).mock.contexts[0]).toBe(document.getElementById(sectionElementId('language')))
    expect(entry('Languages').getAttribute('data-active')).toBe('true')
    expect(entry('Appearance').getAttribute('data-active')).toBe('false')
  })

  it('highlights the section being read as the page scrolls', async () => {
    mountSettings()
    await flushPromises()
    const content = document.getElementById(CONTENT_ID)!

    placeSections({ appearance: -200, language: 10, shortcuts: 400 })
    content.dispatchEvent(new Event('scroll'))
    await flushPromises()
    expect(entry('Languages').getAttribute('data-active')).toBe('true')

    placeSections({ appearance: 0, language: 300, shortcuts: 600 })
    content.dispatchEvent(new Event('scroll'))
    await flushPromises()
    expect(entry('Appearance').getAttribute('data-active')).toBe('true')
  })
})
