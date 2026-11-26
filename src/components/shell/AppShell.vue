<script setup lang="ts">
import type { CommandId } from '@/lib/keybindings'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { SidebarProvider } from '@/components/ui/sidebar'
import { useKeybindings } from '@/composables/useKeybindings'
import { CONTENT_ID } from '@/lib/layout'
import { hasPanel } from '@/router'
import { useSettingsStore } from '@/stores/settings'
import ActivityBar from './ActivityBar.vue'
import CommandPalette from './CommandPalette.vue'
import NestedPanel from './NestedPanel.vue'
import TitleBar from './TitleBar.vue'

const route = useRoute()
const router = useRouter()
const settingsStore = useSettingsStore()

const pageHasPanel = computed(() => hasPanel(route))
// The panel mounts once its saved state is known, so it never animates open or closed on launch
const ready = computed(() => settingsStore.sidebarOpen !== undefined)

// A page without a panel has nothing to open or close
function updateOpen(open: boolean) {
  if (pageHasPanel.value)
    settingsStore.setSidebarOpen(open)
}

// Like clicking another page's icon: go there and open its panel. On that page already, nothing.
async function openPage(name: string) {
  if (route.matched.some(record => record.name === name))
    return
  const openPanel = !settingsStore.sidebarOpen && hasPanel(router.resolve({ name }))
  await router.push({ name })
  if (openPanel)
    await settingsStore.setSidebarOpen(true)
}

// A route's `meta.command` opens that page
const pageCommands: Partial<Record<CommandId, () => void>> = {}
for (const { name, meta } of router.getRoutes()) {
  if (typeof name === 'string' && meta.command)
    pageCommands[meta.command] = () => openPage(name)
}

const paletteOpen = ref(false)

const handlers: Partial<Record<CommandId, () => void>> = {
  ...pageCommands,
  togglePanel: () => updateOpen(!(settingsStore.sidebarOpen ?? true)),
  openCommandPalette: () => paletteOpen.value = true,
}
useKeybindings(handlers)
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
    <CommandPalette v-model:open="paletteOpen" :handlers="handlers" />
  </SidebarProvider>
</template>
