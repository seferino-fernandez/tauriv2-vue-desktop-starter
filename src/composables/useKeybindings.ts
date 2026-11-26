import type { CommandId } from '@/lib/keybindings'
import { useEventListener } from '@vueuse/core'
import { computed } from 'vue'
import { keybindingKeys, matchesKeybinding } from '@/lib/keybindings'
import { isMacOS } from '@/lib/platform'
import { useSettingsStore } from '@/stores/settings'

/**
 * Runs a command when its shortcut is pressed anywhere in the window, text fields included.
 * Shortcuts come from the settings store, so a changed one applies at once. Nothing runs while
 * a settings field is recording a shortcut, and holding the keys down runs it once.
 */
export function useKeybindings(handlers: Partial<Record<CommandId, () => void>>) {
  const settingsStore = useSettingsStore()
  const mac = isMacOS()
  useEventListener(window, 'keydown', (event: KeyboardEvent) => {
    if (event.repeat || settingsStore.recordingKeybinding)
      return
    for (const [command, run] of Object.entries(handlers) as [CommandId, () => void][]) {
      if (matchesKeybinding(event, settingsStore.keybindings[command], mac)) {
        event.preventDefault()
        run()
        return
      }
    }
  })
}

/** A command's current shortcut as its keys, the way the platform shows them (⌘ B, Ctrl B) */
export function useKeybindingKeys(command: CommandId) {
  const settingsStore = useSettingsStore()
  const mac = isMacOS()
  return computed(() => keybindingKeys(settingsStore.keybindings[command], mac))
}
