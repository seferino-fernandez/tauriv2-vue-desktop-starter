<script setup lang="ts">
import AppSidebar from '@/components/AppSidebar.vue'
import AppTopbar from '@/components/AppTopbar.vue'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ConfigProvider } from 'reka-ui'
</script>

<template>
  <ConfigProvider>
    <AppTopbar />
    <TooltipProvider>
      <main class="flex">
        <AppSidebar />
        <section class="bg-background grow p-4">
          <router-view />
        </section>
      </main>
    </TooltipProvider>
  </ConfigProvider>
</template>
