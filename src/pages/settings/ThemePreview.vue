<script setup lang="ts">
import type { Theme } from '@/stores/settings'

defineProps<{
  theme: Theme
}>()
</script>

<template>
  <!--
    A miniature of this window drawn with the theme's own tokens: .light and .dark scope the
    palette, so it shows true colors whatever the app's theme. System shows both, split.
  -->
  <div class="relative aspect-[16/10] overflow-hidden" aria-hidden="true">
    <div
      v-for="palette in theme === 'auto' ? ['light', 'dark'] : [theme]"
      :key="palette"
      :class="[palette, palette === 'dark' && theme === 'auto' && '[clip-path:inset(0_0_0_50%)]']"
      class="absolute inset-0 flex flex-col bg-background"
    >
      <div class="h-[14%] shrink-0 border-b bg-sidebar" />
      <div class="flex min-h-0 flex-1">
        <div class="w-[10%] shrink-0 border-r bg-sidebar" />
        <div class="flex w-[28%] shrink-0 flex-col gap-[6%] border-r bg-sidebar p-[5%] pt-[8%]">
          <div class="h-[5%] min-h-0.5 w-full rounded-full bg-sidebar-accent" />
          <div class="h-[5%] min-h-0.5 w-3/4 rounded-full bg-muted-foreground/30" />
          <div class="h-[5%] min-h-0.5 w-5/6 rounded-full bg-muted-foreground/30" />
        </div>
        <div class="flex flex-1 flex-col gap-[7%] p-[7%]">
          <div class="h-[7%] min-h-1 w-2/5 rounded-full bg-foreground/80" />
          <div class="flex-1 rounded-[3px] border bg-card" />
        </div>
      </div>
    </div>
  </div>
</template>
