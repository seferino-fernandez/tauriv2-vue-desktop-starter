<script setup lang="ts">
import type { AcceptableValue } from "reka-ui";
import { getName, getVersion } from "@tauri-apps/api/app";
import { isTauri } from "@tauri-apps/api/core";
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supportedLanguages } from "@/i18n";
import { notifyError } from "@/lib/errors";
import { commandIds } from "@/lib/keybindings";
import { logError } from "@/lib/log";
import { openLogFolder } from "@/lib/logs-commands";
import { useSettingsStore } from "@/stores/settings";
import { useUpdaterStore } from "@/stores/updater";
import FontSetting from "./FontSetting.vue";
import KeybindingSetting from "./KeybindingSetting.vue";
import SettingsSection from "./SettingsSection.vue";
import ThemeSetting from "./ThemeSetting.vue";

const { t } = useI18n();
const settingsStore = useSettingsStore();
const updater = useUpdaterStore();
// Only release builds write log files; debug builds log to CrabNebula DevTools
const writesLogFiles = import.meta.env.PROD;

// From tauri.conf.json, so renaming the app or bumping its version shows here; outside Tauri, nothing
const app = ref<{ name: string; version: string }>();

async function loadAbout() {
  if (!isTauri()) {
    return;
  }
  try {
    const [name, version] = await Promise.all([getName(), getVersion()]);
    app.value = { name, version };
  } catch (error) {
    logError("Could not read the app's name and version", error);
  }
}

onMounted(loadAbout);

function openLogs() {
  openLogFolder().catch((error) => notifyError("openLogs", error));
}

const languageLabel = computed(
  () => supportedLanguages.find((language) => language.value === settingsStore.language)?.label,
);

function pickLanguage(language: AcceptableValue) {
  if (typeof language === "string") {
    void settingsStore.setLanguage(language);
  }
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-2xl flex-col gap-10 pt-2">
    <header class="flex flex-col gap-1 px-1">
      <h1 class="text-xl font-semibold tracking-tight">
        {{ t("settings.label") }}
      </h1>
      <p class="text-sm text-muted-foreground">
        {{ t("settings.description") }}
      </p>
    </header>

    <!-- One SettingsSection per entry in sections.ts, in the same order -->
    <SettingsSection id="appearance">
      <ThemeSetting />
      <FontSetting />
    </SettingsSection>

    <SettingsSection id="language">
      <Field orientation="responsive" class="gap-x-6 px-4 py-4">
        <FieldContent>
          <FieldLabel for="language-select">
            {{ t("settings.language.label") }}
          </FieldLabel>
          <FieldDescription>
            {{ t("settings.language.description") }}
          </FieldDescription>
        </FieldContent>
        <Select :model-value="settingsStore.language" @update:model-value="pickLanguage">
          <SelectTrigger id="language-select" class="w-full! @md/field-group:w-48!">
            <SelectValue :placeholder="languageLabel" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem
                v-for="language in supportedLanguages"
                :key="language.value"
                :value="language.value"
              >
                {{ language.label }}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
    </SettingsSection>

    <SettingsSection id="shortcuts" description-key="settings.shortcuts.description">
      <KeybindingSetting v-for="command in commandIds" :key="command" :command="command" />
    </SettingsSection>

    <!--
      The last section is at least a screen tall, less the titlebar (2.375rem), the content's bottom
      padding and the section's scroll margin (1rem each), so every jump brings its heading to the top
    -->
    <SettingsSection id="about" class="min-h-[calc(100svh-4.375rem)]">
      <Field orientation="responsive" class="gap-x-6 px-4 py-4">
        <FieldContent>
          <FieldTitle>{{ app?.name }}</FieldTitle>
          <FieldDescription v-if="app">
            {{ t("settings.about.version", { version: app.version }) }}
          </FieldDescription>
        </FieldContent>
        <!-- Only builds with the updater cargo feature can update themselves -->
        <Button v-if="updater.available" variant="outline" @click="updater.check()">
          {{ t("updates.check") }}
        </Button>
      </Field>
      <Field v-if="writesLogFiles" orientation="responsive" class="gap-x-6 px-4 py-4">
        <FieldContent>
          <FieldTitle>{{ t("settings.about.logs.label") }}</FieldTitle>
          <FieldDescription>{{ t("settings.about.logs.description") }}</FieldDescription>
        </FieldContent>
        <Button variant="outline" @click="openLogs">
          {{ t("settings.openLogs") }}
        </Button>
      </Field>
    </SettingsSection>
  </div>
</template>
