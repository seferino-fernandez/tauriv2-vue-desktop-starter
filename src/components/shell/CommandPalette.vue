<script setup lang="ts">
import type { CommandId } from '@/lib/keybindings'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Keybinding from '@/components/Keybinding.vue'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command'
import { commandIds, commands } from '@/lib/keybindings'

const props = defineProps<{
  /** What each command does; commands without one are left out */
  handlers: Partial<Record<CommandId, () => void>>
}>()

const open = defineModel<boolean>('open', { required: true })
const { t } = useI18n()

// Every command the app can run, except opening the palette itself
const available = computed(() =>
  commandIds.filter(id => id !== 'openCommandPalette' && props.handlers[id]))

function run(command: CommandId) {
  open.value = false
  props.handlers[command]?.()
}
</script>

<template>
  <!-- Lists the commands with their current shortcuts, so the palette also teaches them -->
  <CommandDialog
    v-model:open="open"
    :title="t('commands.openCommandPalette')"
    :description="t('commandPalette.placeholder')"
  >
    <CommandInput :placeholder="t('commandPalette.placeholder')" />
    <CommandList>
      <CommandEmpty>{{ t('commandPalette.empty') }}</CommandEmpty>
      <CommandGroup>
        <CommandItem
          v-for="command in available"
          :key="command"
          :value="command"
          @select="run(command)"
        >
          {{ t(commands[command].titleKey) }}
          <CommandShortcut>
            <Keybinding :command="command" />
          </CommandShortcut>
        </CommandItem>
      </CommandGroup>
    </CommandList>
  </CommandDialog>
</template>
