<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import IconMoonStars from '~icons/ph/moon-stars-duotone'
import IconSun from '~icons/ph/sun-duotone'

import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useSettingsStore } from '@/stores/settings'

const { t } = useI18n()
const settingsStore = useSettingsStore()
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="outline">
        <IconSun class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <IconMoonStars class="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span class="sr-only">{{ t('settings.theme.label') }}</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem @click="settingsStore.setTheme('light')">
        {{ t('settings.theme.light') }}
      </DropdownMenuItem>
      <DropdownMenuItem @click="settingsStore.setTheme('dark')">
        {{ t('settings.theme.dark') }}
      </DropdownMenuItem>
      <DropdownMenuItem @click="settingsStore.setTheme('auto')">
        {{ t('settings.theme.system') }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
