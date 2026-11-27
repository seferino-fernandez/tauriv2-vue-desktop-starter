<script setup lang="ts">
import type { CommandId } from "@/lib/keybindings";
import { useI18n } from "vue-i18n";
import Keybinding from "@/components/Keybinding.vue";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { commandIds, commands } from "@/lib/keybindings";

const emit = defineEmits<{
  /** The command picked, for the shell to run */
  run: [command: CommandId];
}>();

const open = defineModel<boolean>("open", { required: true });
const { t } = useI18n();

// Every app command, except opening the palette itself
const available = commandIds.filter((id) => id !== "openCommandPalette");

function run(command: CommandId) {
  open.value = false;
  emit("run", command);
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
      <CommandEmpty>{{ t("commandPalette.empty") }}</CommandEmpty>
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
