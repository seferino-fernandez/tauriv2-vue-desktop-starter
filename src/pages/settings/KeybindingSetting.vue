<script setup lang="ts">
import type { CommandId, KeybindingProblem } from "@/lib/keybindings";
import { computed, onBeforeUnmount, ref } from "vue";
import { useI18n } from "vue-i18n";
import IconReset from "~icons/ph/arrow-counter-clockwise";
import Keybinding from "@/components/Keybinding.vue";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { commands, formatKeybinding, isModifierCode, keybindingFromEvent } from "@/lib/keybindings";
import { isMacOS } from "@/lib/platform";
import { useSettingsStore } from "@/stores/settings";

const props = defineProps<{
  command: CommandId;
}>();

const { t } = useI18n();
const settingsStore = useSettingsStore();
const mac = isMacOS();

const fieldId = computed(() => `keybinding-${props.command}`);
const messageId = computed(() => `${fieldId.value}-message`);
const customized = computed(() => props.command in settingsStore.keybindingOverrides);

const recording = ref(false);
/** Why the last shortcut pressed was refused, with that shortcut */
const refusal = ref<{ problem: KeybindingProblem; binding: string }>();

const message = computed(() => {
  if (!refusal.value) {
    return "";
  }
  const { problem, binding } = refusal.value;
  const shortcut = formatKeybinding(binding, mac);
  switch (problem.kind) {
    case "reserved":
      return t("settings.shortcuts.problems.reserved", { shortcut });
    case "taken":
      return t("settings.shortcuts.problems.taken", {
        shortcut,
        command: t(commands[problem.command as CommandId].titleKey),
      });
    default:
      return t("settings.shortcuts.problems.needsModifier", {
        modifier: mac ? "⌘" : "Ctrl",
      });
  }
});

function setRecording(value: boolean) {
  recording.value = value;
  settingsStore.recordingKeybinding = value;
}

// WebKit does not focus a button on click; without focus the field gets no keys and no blur
function start(event: MouseEvent) {
  (event.currentTarget as HTMLElement).focus();
  refusal.value = undefined;
  setRecording(true);
}

function stop() {
  setRecording(false);
}

// Saves on keydown: macOS sends no keyup for keys pressed while ⌘ is held
async function record(event: KeyboardEvent) {
  if (!recording.value) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  const plain = !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey;
  if (event.code === "Escape" && plain) {
    refusal.value = undefined;
    stop();
    return;
  }
  if (isModifierCode(event.code)) {
    return;
  }
  const binding = keybindingFromEvent(event, mac);
  if (!binding) {
    return;
  }
  const problem = await settingsStore.setKeybinding(props.command, binding);
  refusal.value = problem && { problem, binding };
  if (!problem) {
    stop();
  }
}

// Leaving the page mid-recording must not leave every shortcut switched off
onBeforeUnmount(() => {
  if (recording.value) {
    stop();
  }
});

async function reset() {
  const problem = await settingsStore.resetKeybinding(props.command);
  refusal.value = problem && { problem, binding: commands[props.command].defaultBinding };
}
</script>

<template>
  <!-- Wraps when narrow: the label above the field, and a refusal under both -->
  <Field orientation="horizontal" class="flex-wrap gap-x-6 gap-y-2 px-4 py-3">
    <FieldLabel :for="fieldId" class="min-w-32 flex-1">
      {{ t(commands[command].titleKey) }}
    </FieldLabel>
    <div class="flex w-48 shrink-0 items-center gap-1">
      <!-- Click to record, press the new shortcut; Escape or clicking away cancels -->
      <Button
        :id="fieldId"
        variant="outline"
        class="flex-1 justify-start px-3 font-normal"
        :class="recording && 'ring-3 ring-ring/50'"
        :aria-describedby="refusal ? messageId : undefined"
        data-slot="keybinding-field"
        @click="start"
        @keydown="record"
        @blur="stop"
      >
        <span v-if="recording" class="text-muted-foreground">{{
          t("settings.shortcuts.recording")
        }}</span>
        <Keybinding v-else :command="command" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        :disabled="!customized"
        :aria-label="t('settings.shortcuts.reset')"
        :title="t('settings.shortcuts.reset')"
        data-slot="keybinding-reset"
        @click="reset"
      >
        <IconReset />
      </Button>
    </div>
    <p v-if="refusal" :id="messageId" role="alert" class="basis-full text-sm text-destructive">
      {{ message }}
    </p>
  </Field>
</template>
