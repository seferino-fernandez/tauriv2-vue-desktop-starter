<script setup lang="ts">
import AppSidebar from '@/components/AppSidebar.vue'
import AppTopbar from '@/components/AppTopbar.vue'
import { TooltipProvider } from '@/components/ui/tooltip'
</script>

<template>
  <div class="w-full h-full">
    <AppTopbar />
    <TooltipProvider>
      <div class="flex">
        <AppSidebar />
        <div class="grow h-full w-full mt-8 ml-16">
          <router-view />
        </div>
      </div>
    </TooltipProvider>
  </div>
</template>
