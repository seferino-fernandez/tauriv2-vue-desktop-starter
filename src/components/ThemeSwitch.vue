<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { useSettingsStore } from '@/stores/settings'
import { Icon } from '@iconify/vue'

import { useColorMode } from '@vueuse/core'
import { computed } from 'vue'

const settingsStore = useSettingsStore()
const mode = useColorMode()
const isDarkMode = computed(() => mode.value !== 'light')

function handleThemeChange() {
  mode.value = mode.value !== 'light' ? 'light' : 'dark'
  settingsStore.setSetting<string>('theme', mode.value)
}
</script>

<template>
  <Button
    id="theme-switch"
    variant="ghost"
    size="icon"
    class="mt-auto rounded-lg"
    @click="handleThemeChange"
  >
    <Icon :icon="isDarkMode ? 'ph:moon-stars-duotone' : 'ph:sun-duotone'" class="size-5" />
  </Button>
</template>
