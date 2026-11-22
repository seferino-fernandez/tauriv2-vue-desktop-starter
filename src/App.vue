<script setup lang="ts">
import { ConfigProvider } from 'reka-ui'
import AppShell from '@/components/shell/AppShell.vue'
</script>

<template>
  <ConfigProvider>
    <AppShell />
  </ConfigProvider>
</template>
