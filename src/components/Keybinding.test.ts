import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isMacOS } from '@/lib/platform'
import { useSettingsStore } from '@/stores/settings'
import { mockSettingsIpc, unmockSettingsIpc } from '@/test/settings-ipc'
import Keybinding from './Keybinding.vue'

vi.mock('@/lib/platform', () => ({
  isMacOS: vi.fn(() => true),
}))

enableAutoUnmount(afterEach)

async function mountKeybinding(mac: boolean) {
  vi.mocked(isMacOS).mockReturnValue(mac)
  await useSettingsStore().load()
  const wrapper = mount(Keybinding, {
    props: { command: 'togglePanel' },
  })
  await flushPromises()
  return wrapper
}

function chips(wrapper: Awaited<ReturnType<typeof mountKeybinding>>) {
  return wrapper.findAll('[data-slot="kbd-group"] > kbd').map(chip => chip.text())
}

describe('keybinding', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockSettingsIpc({
      keybindings: { togglePanel: 'Mod+Shift+KeyK' },
    })
  })

  afterEach(unmockSettingsIpc)

  it('shows one chip per key on macOS, with nothing between them', async () => {
    const wrapper = await mountKeybinding(true)
    expect(chips(wrapper)).toEqual(['⇧', '⌘', 'K'])
    expect(wrapper.text()).toBe('⇧⌘K')
  })

  it('puts a + between the chips elsewhere', async () => {
    const wrapper = await mountKeybinding(false)
    expect(chips(wrapper)).toEqual(['Ctrl', 'Shift', 'K'])
    expect(wrapper.text()).toBe('Ctrl+Shift+K')
  })
})
