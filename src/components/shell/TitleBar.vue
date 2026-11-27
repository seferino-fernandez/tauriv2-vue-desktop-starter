<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Keybinding from "@/components/Keybinding.vue";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

defineProps<{
  /** Whether the current page has a nested panel to toggle */
  hasPanel: boolean;
}>();

const { t } = useI18n();
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
    class="flex h-9.5 shrink-0 items-center gap-2 border-b bg-sidebar pl-2 text-sidebar-foreground"
  >
    <!--
      macOS: room for the traffic lights. decorum pins them at (12, 16), which puts their centre
      18.75px from the top; 38px (37 + the 1px border) is the height that centres them.
    -->
    <div
      data-tauri-drag-region
      class="hidden w-16 shrink-0 self-stretch in-data-[platform=macos]:block"
    />
    <Tooltip v-if="hasPanel">
      <TooltipTrigger as-child>
        <SidebarTrigger />
      </TooltipTrigger>
      <TooltipContent side="bottom" align="start">
        {{ t("commands.togglePanel") }}
        <Keybinding command="togglePanel" class="ml-1.5" />
      </TooltipContent>
    </Tooltip>
    <div data-tauri-drag-region class="flex-1 self-stretch" />
  </header>
</template>
