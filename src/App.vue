<script setup lang="ts">
import { ConfigProvider } from 'reka-ui'
import AppSidebar from '@/components/AppSidebar.vue'
import AppTopbar from '@/components/AppTopbar.vue'
import { TooltipProvider } from '@/components/ui/tooltip'
</script>

<template>
  <ConfigProvider>
    <div class="flex h-dvh flex-col">
      <AppTopbar />
      <TooltipProvider>
        <main class="flex min-h-0 grow">
          <AppSidebar />
          <section class="bg-background grow p-4">
            <router-view />
          </section>
        </main>
      </TooltipProvider>
    </div>
  </ConfigProvider>
</template>
