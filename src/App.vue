<script setup lang="ts">
import { ConfigProvider } from "reka-ui";
import { computed } from "vue";
import AppShell from "@/components/shell/AppShell.vue";
import { Toaster } from "@/components/ui/sonner";
import UpdateDialog from "@/components/UpdateDialog.vue";
import { useSettingsStore } from "@/stores/settings";
import "vue-sonner/style.css";

const settingsStore = useSettingsStore();
// Sonner calls the app's `auto` theme `system`
const toastTheme = computed(() =>
  settingsStore.theme === "auto" ? "system" : settingsStore.theme,
);
</script>

<template>
  <ConfigProvider>
    <AppShell />
    <Toaster :theme="toastTheme" />
    <UpdateDialog />
  </ConfigProvider>
</template>
