<script setup lang="ts">
import type { CommandId, KeybindingProblem } from '@/lib/keybindings'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import IconReset from '~icons/ph/arrow-counter-clockwise'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useKeybindingLabel } from '@/composables/useKeybindings'
import { commands, formatKeybinding, isModifierCode, keybindingFromEvent } from '@/lib/keybindings'
import { isMacOS } from '@/lib/platform'
import { useSettingsStore } from '@/stores/settings'

const props = defineProps<{
  command: CommandId
}>()

const { t } = useI18n()
const settingsStore = useSettingsStore()
const mac = isMacOS()
const current = useKeybindingLabel(props.command)

const fieldId = computed(() => `keybinding-${props.command}`)
const messageId = computed(() => `${fieldId.value}-message`)
const customized = computed(() => props.command in settingsStore.keybindingOverrides)

const recording = ref(false)
/** Why the last shortcut pressed was refused, with that shortcut */
const refusal = ref<{ problem: KeybindingProblem, binding: string }>()

const message = computed(() => {
  if (!refusal.value)
    return ''
  const { problem, binding } = refusal.value
  const shortcut = formatKeybinding(binding, mac)
  switch (problem.kind) {
    case 'reserved':
      return t('settings.shortcuts.problems.reserved', { shortcut })
    case 'taken':
      return t('settings.shortcuts.problems.taken', {
        shortcut,
        command: t(commands[problem.command as CommandId].titleKey),
      })
    default:
      return t('settings.shortcuts.problems.needsModifier', {
        modifier: mac ? '⌘' : 'Ctrl',
      })
  }
})

function setRecording(value: boolean) {
  recording.value = value
  settingsStore.recordingKeybinding = value
}

function start() {
  refusal.value = undefined
  setRecording(true)
}

function stop() {
  setRecording(false)
}

// Saves on keydown: macOS sends no keyup for keys pressed while ⌘ is held
async function record(event: KeyboardEvent) {
  if (!recording.value)
    return
  event.preventDefault()
  event.stopPropagation()
  const plain = !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey
  if (event.code === 'Escape' && plain) {
    refusal.value = undefined
    stop()
    return
  }
  if (isModifierCode(event.code))
    return
  const binding = keybindingFromEvent(event, mac)
  if (!binding)
    return
  const problem = await settingsStore.setKeybinding(props.command, binding)
  refusal.value = problem && { problem, binding }
  if (!problem)
    stop()
}

async function reset() {
  refusal.value = undefined
  await settingsStore.resetKeybinding(props.command)
}
</script>

<template>
  <div class="space-y-1">
    <div class="flex items-center gap-2">
      <Label class="min-w-32 font-medium" :for="fieldId">{{ t(commands[command].titleKey) }}</Label>
      <!-- Click to record, press the new shortcut; Escape or clicking away cancels -->
      <Button
        :id="fieldId"
        variant="outline"
        size="sm"
        class="min-w-28"
        :class="recording && 'ring-3 ring-ring/50'"
        :aria-describedby="refusal ? messageId : undefined"
        data-slot="keybinding-field"
        @click="start"
        @keydown="record"
        @blur="stop"
      >
        <span v-if="recording" class="text-muted-foreground">{{ t('settings.shortcuts.recording') }}</span>
        <kbd v-else class="font-sans">{{ current }}</kbd>
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        :disabled="!customized"
        :aria-label="t('settings.shortcuts.reset')"
        :title="t('settings.shortcuts.reset')"
        data-slot="keybinding-reset"
        @click="reset"
      >
        <IconReset />
      </Button>
    </div>
    <p v-if="refusal" :id="messageId" role="alert" class="text-sm text-destructive">
      {{ message }}
    </p>
  </div>
</template>
