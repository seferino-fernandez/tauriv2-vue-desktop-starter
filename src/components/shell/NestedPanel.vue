<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { Sidebar, SidebarContent, SidebarHeader, useSidebar } from '@/components/ui/sidebar'
import {
  clampPanelWidth,
  PANEL_DEFAULT_WIDTH,
  PANEL_KEYBOARD_STEP,
  PANEL_MAX_WIDTH,
  PANEL_MIN_WIDTH,
} from '@/lib/layout'
import { useSettingsStore } from '@/stores/settings'

const { t } = useI18n()
const route = useRoute()
const { open, state } = useSidebar()
const settingsStore = useSettingsStore()

// The location label, like VS Code's "EXPLORER"
const label = computed(() => route.meta.titleKey
  ? t(route.meta.titleKey)
  : '')

const panel = useTemplateRef<HTMLElement>('panel')
// Tracks the pointer locally while dragging; saved once, when the drag ends
const width = ref(settingsStore.sidebarWidth)
const resizing = ref(false)

function startResize(event: PointerEvent) {
  if (event.button !== 0)
    return
  event.preventDefault()
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  resizing.value = true
}

function resize(event: PointerEvent) {
  if (resizing.value && panel.value)
    width.value = clampPanelWidth(event.clientX - panel.value.getBoundingClientRect().left)
}

function endResize() {
  if (!resizing.value)
    return
  resizing.value = false
  settingsStore.setSidebarWidth(width.value)
}

function setWidth(next: number) {
  width.value = clampPanelWidth(next)
  settingsStore.setSidebarWidth(width.value)
}

function resizeWithKeys(event: KeyboardEvent) {
  const step = { ArrowLeft: -PANEL_KEYBOARD_STEP, ArrowRight: PANEL_KEYBOARD_STEP }[event.key]
  if (step) {
    event.preventDefault()
    setWidth(width.value + step)
  }
}
</script>

<template>
  <!-- The frame every page's panel shares: label, collapse and resize. The page fills the rest. -->
  <div
    ref="panel"
    data-slot="nested-panel"
    :data-state="state"
    :inert="!open"
    class="relative shrink-0 overflow-hidden"
    :class="[
      open && 'border-r',
      !resizing && 'transition-[width] duration-200 ease-linear',
    ]"
    :style="{ width: open ? `${width}px` : '0px' }"
  >
    <Sidebar collapsible="none" class="h-full" :style="{ '--sidebar-width': `${width}px` }">
      <SidebarHeader class="h-9 shrink-0 justify-center px-4 py-0">
        <h2 class="truncate text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          {{ label }}
        </h2>
      </SidebarHeader>
      <SidebarContent>
        <router-view name="sidebar" />
      </SidebarContent>
    </Sidebar>
    <div
      v-if="open"
      role="separator"
      tabindex="0"
      aria-orientation="vertical"
      :aria-label="t('shell.resizePanel')"
      :aria-valuenow="width"
      :aria-valuemin="PANEL_MIN_WIDTH"
      :aria-valuemax="PANEL_MAX_WIDTH"
      data-slot="nested-panel-resize"
      class="absolute inset-y-0 right-0 z-10 w-1 cursor-col-resize outline-none transition-colors delay-100 hover:bg-sidebar-ring/60 focus-visible:bg-sidebar-ring"
      :class="resizing && 'bg-sidebar-ring/60'"
      @pointerdown="startResize"
      @pointermove="resize"
      @pointerup="endResize"
      @pointercancel="endResize"
      @lostpointercapture="endResize"
      @dblclick="setWidth(PANEL_DEFAULT_WIDTH)"
      @keydown="resizeWithKeys"
    />
  </div>
</template>
