<script setup lang="ts">
import type { Theme } from '@/stores/settings'
import { useI18n } from 'vue-i18n'
import { Field, FieldContent, FieldDescription, FieldTitle } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useSettingsStore } from '@/stores/settings'
import ThemePreview from './ThemePreview.vue'

const { t } = useI18n()
const settingsStore = useSettingsStore()

const options: { value: Theme, labelKey: string }[] = [
  { value: 'auto', labelKey: 'settings.theme.system' },
  { value: 'light', labelKey: 'settings.theme.light' },
  { value: 'dark', labelKey: 'settings.theme.dark' },
]

function select(value: unknown) {
  void settingsStore.setTheme(value as Theme)
}
</script>

<template>
  <Field class="gap-4 px-4 py-4">
    <FieldContent>
      <FieldTitle id="theme-label">
        {{ t('settings.theme.label') }}
      </FieldTitle>
      <FieldDescription id="theme-description">
        {{ t('settings.theme.description') }}
      </FieldDescription>
    </FieldContent>
    <RadioGroup
      :model-value="settingsStore.theme"
      aria-labelledby="theme-label"
      aria-describedby="theme-description"
      class="grid max-w-md grid-cols-3 gap-3"
      @update:model-value="select"
    >
      <Label
        v-for="option in options"
        :key="option.value"
        :for="`theme-${option.value}`"
        class="group/theme cursor-pointer flex-col items-stretch gap-2 font-normal"
      >
        <ThemePreview
          :theme="option.value"
          class="rounded-md border shadow-xs transition-[border-color,box-shadow] duration-150 group-hover/theme:border-ring group-has-data-[state=checked]/theme:border-primary group-has-data-[state=checked]/theme:ring-1 group-has-data-[state=checked]/theme:ring-primary group-has-focus-visible/theme:ring-3 group-has-focus-visible/theme:ring-ring/50"
        />
        <span class="flex items-center gap-2 text-sm">
          <RadioGroupItem :id="`theme-${option.value}`" :value="option.value" />
          {{ t(option.labelKey) }}
        </span>
      </Label>
    </RadioGroup>
  </Field>
</template>
