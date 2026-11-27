import type { CommandId } from "@/lib/keybindings";
import { isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { tryOnScopeDispose, useEventListener } from "@vueuse/core";
import { computed } from "vue";
import { commandIds, isCommandId, keybindingKeys, matchesKeybinding } from "@/lib/keybindings";
import { isMacOS } from "@/lib/platform";
import { useSettingsStore } from "@/stores/settings";

/** The event the macOS app menu sends to run a command, with its id (`COMMAND_EVENT` in src-tauri/src/menu.rs) */
const COMMAND_EVENT = "command";

/**
 * Runs a command when its shortcut is pressed anywhere in the window, text fields included, or
 * when the app menu sends it. Shortcuts come from the settings store, so a changed one applies at
 * once. No shortcut runs while a settings field is recording one, and holding the keys down runs
 * it once.
 */
export function useKeybindings(handlers: Partial<Record<CommandId, () => void>>) {
  const settingsStore = useSettingsStore();
  const mac = isMacOS();
  useEventListener(window, "keydown", (event: KeyboardEvent) => {
    if (event.repeat || settingsStore.recordingKeybinding) {
      return;
    }
    for (const command of commandIds) {
      const run = handlers[command];
      if (run && matchesKeybinding(event, settingsStore.keybindings[command], mac)) {
        event.preventDefault();
        run();
        return;
      }
    }
  });
  if (isTauri()) {
    const unlisten = listen<string>(COMMAND_EVENT, ({ payload }) => {
      if (isCommandId(payload)) {
        handlers[payload]?.();
      }
    });
    tryOnScopeDispose(() => {
      void unlisten.then((stop) => stop());
    });
  }
}

/** A command's current shortcut as its keys, the way the platform shows them (⌘ B, Ctrl B) */
export function useKeybindingKeys(command: CommandId) {
  const settingsStore = useSettingsStore();
  const mac = isMacOS();
  return computed(() => keybindingKeys(settingsStore.keybindings[command], mac));
}
