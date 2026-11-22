<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { SidebarTrigger } from '@/components/ui/sidebar'

defineProps<{
  /** Whether the current page has a nested panel to toggle */
  hasPanel: boolean
}>()

const { t } = useI18n()
const route = useRoute()

const title = computed(() => route.meta.titleKey
  ? t(route.meta.titleKey)
  : '')
</script>

<template>
  <!--
    The window's titlebar, spanning its full width. data-tauri-decorum-tb makes decorum use this
    element instead of laying its own drag strip over the window, and on Windows decorum appends
    the window controls to it (they land on the right). Keep it mounted from the first render and
    never re-create it: decorum looks for it once, when the DOM is ready.
  -->
  <header
    data-tauri-decorum-tb
    data-tauri-drag-region
    class="relative flex h-9.5 shrink-0 items-center gap-2 border-b bg-sidebar pl-2 text-sidebar-foreground"
  >
    <!--
      macOS: room for the traffic lights. decorum pins them at (12, 16), which puts their centre
      18.75px from the top; 38px (37 + the 1px border) is the height that centres them.
    -->
    <div data-tauri-drag-region class="hidden w-16 shrink-0 self-stretch in-data-[platform=macos]:block" />
    <SidebarTrigger v-if="hasPanel" class="relative z-10" />
    <!-- Centred on the window, not on the space left over; clicks pass through to the drag region -->
    <h1 class="pointer-events-none absolute inset-x-0 truncate px-40 text-center text-sm text-muted-foreground">
      {{ title }}
    </h1>
    <div data-tauri-drag-region class="flex-1 self-stretch" />
  </header>
</template>
