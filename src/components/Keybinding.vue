<script setup lang="ts">
import type { CommandId } from '@/lib/keybindings'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { useKeybindingKeys } from '@/composables/useKeybindings'
import { isMacOS } from '@/lib/platform'

const props = defineProps<{
  command: CommandId
}>()

const mac = isMacOS()
const keys = useKeybindingKeys(props.command)
</script>

<template>
  <!--
    A command's current shortcut, one chip per key. Windows and Linux put a + between keys and
    macOS does not, so the text reads the same as formatKeybinding (Ctrl+B, ⌘B).
  -->
  <KbdGroup>
    <template v-for="(key, index) in keys" :key="index">
      <span v-if="!mac && index > 0" class="text-xs opacity-60">+</span>
      <Kbd class="font-ui">{{ key }}</Kbd>
    </template>
  </KbdGroup>
</template>
