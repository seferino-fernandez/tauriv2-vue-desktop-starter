<script setup lang="ts">
// Linux uses native window decorations, so the system titlebar replaces this bar
// (`data-platform` is set on <html> in main.ts)
</script>

<template>
  <div class="flex h-10 shrink-0 bg-sidebar in-data-[platform=linux]:hidden" />
</template>
