<script setup lang="ts">
import type { Language } from '@/lib/config'
import { watchImmediate } from '@vueuse/core'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
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
import { commandIds } from '@/lib/keybindings'
import { useSettingsStore } from '@/stores/settings'
import FontSetting from './FontSetting.vue'
import KeybindingSetting from './KeybindingSetting.vue'
import SettingsSection from './SettingsSection.vue'
import ThemeSetting from './ThemeSetting.vue'

const { t, locale } = useI18n()
const availableLanguages = ref<Language[]>(supportedLanguages())
const settingsStore = useSettingsStore()

watchImmediate(locale, newLocale => handleLanguageSelect(newLocale))

function handleLanguageSelect(newLocale: string) {
  if (!newLocale || !availableLanguages.value.some(sl => sl.value === newLocale))
    return
  settingsStore.setLanguage(newLocale)
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-2xl flex-col gap-10 pt-2">
    <header class="flex flex-col gap-1 px-1">
      <h1 class="text-xl font-semibold tracking-tight">
        {{ t('settings.label') }}
      </h1>
      <p class="text-sm text-muted-foreground">
        {{ t('settings.description') }}
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
