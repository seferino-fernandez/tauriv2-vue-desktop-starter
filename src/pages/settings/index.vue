<script setup lang="ts">
import type { Language } from '@/lib/config'
import { watchImmediate } from '@vueuse/core'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Field, FieldContent, FieldDescription, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getLanguageLabel, supportedLanguages } from '@/lib/config'
import { notifyError } from '@/lib/errors'
import { commandIds } from '@/lib/keybindings'
import { openLogFolder } from '@/lib/logs-commands'
import { useSettingsStore } from '@/stores/settings'
import { useUpdaterStore } from '@/stores/updater'
import FontSetting from './FontSetting.vue'
import KeybindingSetting from './KeybindingSetting.vue'
import SettingsSection from './SettingsSection.vue'
import ThemeSetting from './ThemeSetting.vue'

const { t, locale } = useI18n()
const availableLanguages = ref<Language[]>(supportedLanguages())
const settingsStore = useSettingsStore()
const updater = useUpdaterStore()
// Only release builds write log files; debug builds log to CrabNebula DevTools
const writesLogFiles = import.meta.env.PROD

function openLogs() {
  openLogFolder().catch(error => notifyError('openLogs', error))
}

watchImmediate(locale, newLocale => handleLanguageSelect(newLocale))

function handleLanguageSelect(newLocale: string) {
  if (!newLocale || !availableLanguages.value.some(sl => sl.value === newLocale))
    return
  settingsStore.setLanguage(newLocale)
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-2xl flex-col gap-10 pt-2">
    <header class="flex items-start justify-between gap-4 px-1">
      <div class="flex flex-col gap-1">
        <h1 class="text-xl font-semibold tracking-tight">
          {{ t('settings.label') }}
        </h1>
        <p class="text-sm text-muted-foreground">
          {{ t('settings.description') }}
        </p>
      </div>
      <div class="flex shrink-0 gap-2">
        <Button v-if="writesLogFiles" variant="outline" size="sm" @click="openLogs">
          {{ t('settings.openLogs') }}
        </Button>
        <!-- Only builds with the updater cargo feature can update themselves -->
        <Button v-if="updater.available" variant="outline" size="sm" @click="updater.check()">
          {{ t('updates.check') }}
        </Button>
      </div>
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
            {{ t('settings.language.label') }}
          </FieldLabel>
          <FieldDescription>
            {{ t('settings.language.description') }}
          </FieldDescription>
        </FieldContent>
        <Select v-model="locale">
          <SelectTrigger id="language-select" class="w-full! @md/field-group:w-48!">
            <SelectValue :placeholder="getLanguageLabel(locale)" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem
                v-for="availableLanguage in availableLanguages"
                :key="availableLanguage.value"
                :value="availableLanguage.value"
              >
                {{ availableLanguage.label }}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
    </SettingsSection>

    <!--
      The last section is at least a screen tall, less the titlebar (2.375rem), the content's bottom
      padding and the section's scroll margin (1rem each), so every jump brings its heading to the top
    -->
    <SettingsSection
      id="shortcuts"
      description-key="settings.shortcuts.description"
      class="min-h-[calc(100svh-4.375rem)]"
    >
      <KeybindingSetting v-for="command in commandIds" :key="command" :command="command" />
    </SettingsSection>
  </div>
</template>
