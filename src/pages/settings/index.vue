<script setup lang="ts">
import type { Language } from '@/lib/config'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ThemeSwitch from '@/components/ThemeSwitch.vue'

import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

import { getLanguageLabel, supportedLanguages } from '@/lib/config'
import { useSettingsStore } from '@/stores/settings'
import { sectionElementId } from './sections'

const { t, locale } = useI18n()
const availableLanguages = ref<Language[]>(supportedLanguages())
const settingsStore = useSettingsStore()

watch(locale, (newLocale, oldLocale) => {
  if (newLocale && newLocale !== oldLocale)
    handleLanguageSelect(newLocale)
}, { immediate: true })

function handleLanguageSelect(newLocale: string) {
  if (!newLocale || !availableLanguages.value.some(sl => sl.value === newLocale))
    return
  settingsStore.setSetting<string>('language', newLocale)
}
</script>

<template>
  <div class="container mx-auto">
    <div class="space-y-0.5 p-10">
      <h2 class="text-2xl font-bold tracking-tight">
        {{ t('settings.label') }}
      </h2>
      <p class="text-muted-foreground">
        {{ t('settings.description') }}
      </p>
    </div>
    <Separator class="my-6" />
    <!-- One <section> per entry in sections.ts, in the same order -->
    <div class="space-y-10">
      <section :id="sectionElementId('appearance')" class="scroll-mt-4 space-y-4">
        <h3 class="text-lg font-semibold">
          {{ t('settings.appearance.label') }}
        </h3>
        <div class="flex items-center space-x-2">
          <Label class="font-medium" for="theme-switch">{{ t('settings.theme.label') }}</Label>
          <ThemeSwitch />
        </div>
      </section>
      <section :id="sectionElementId('language')" class="scroll-mt-4 space-y-4">
        <h3 class="text-lg font-semibold">
          {{ t('languages.label') }}
        </h3>
        <div class="flex items-center space-x-2">
          <Label class="font-medium" for="language-select">{{ t('languages.label') }}</Label>
          <Select id="language-select" v-model="locale">
            <SelectTrigger>
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
        </div>
      </section>
    </div>
  </div>
</template>
