<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { SidebarProvider } from '@/components/ui/sidebar'
import { useKeybindings } from '@/composables/useKeybindings'
import { CONTENT_ID } from '@/lib/layout'
import { hasPanel } from '@/router'
import { useSettingsStore } from '@/stores/settings'
import ActivityBar from './ActivityBar.vue'
import NestedPanel from './NestedPanel.vue'
import TitleBar from './TitleBar.vue'

const route = useRoute()
const settingsStore = useSettingsStore()

const pageHasPanel = computed(() => hasPanel(route))
// The panel mounts once its saved state is known, so it never animates open or closed on launch
const ready = computed(() => settingsStore.sidebarOpen !== undefined)

// A page without a panel has nothing to open or close
function updateOpen(open: boolean) {
  if (pageHasPanel.value)
    settingsStore.setSidebarOpen(open)
}

useKeybindings({
  togglePanel: () => updateOpen(!(settingsStore.sidebarOpen ?? true)),
})
</script>

<template>
  <!--
    Titlebar across the top; below it the activity bar, the page's nested panel and the page.
    Only the page scrolls. SidebarProvider supplies the open state and tooltips; the panel
    shortcut (⌘/Ctrl+B by default) comes from the app's keybindings.
  -->
  <SidebarProvider
    class="h-svh flex-col"
    :class="{ invisible: !ready }"
    :open="settingsStore.sidebarOpen ?? true"
    @update:open="updateOpen"
  >
    <TitleBar :has-panel="pageHasPanel" />
    <div class="flex min-h-0 flex-1">
      <ActivityBar />
      <NestedPanel v-if="ready && pageHasPanel" />
      <main :id="CONTENT_ID" class="min-h-0 min-w-0 flex-1 overflow-auto p-4">
        <router-view />
      </main>
    </div>
  </SidebarProvider>
</template>
