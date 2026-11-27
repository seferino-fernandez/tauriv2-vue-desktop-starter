import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { hasPanel } from "@/router";
import { useSettingsStore } from "@/stores/settings";

/**
 * Going to a page and showing or hiding its panel, the way the activity bar, the titlebar toggle
 * and app commands all do it. A page without a panel ignores the panel being opened or closed.
 * The open state is the settings store's, so it is saved.
 */
export function useShellLayout() {
  const route = useRoute();
  const router = useRouter();
  const settingsStore = useSettingsStore();

  const pageHasPanel = computed(() => hasPanel(route));

  function setPanelOpen(open: boolean) {
    if (pageHasPanel.value) {
      void settingsStore.setSidebarOpen(open);
    }
  }

  function togglePanel() {
    setPanelOpen(!(settingsStore.sidebarOpen ?? true));
  }

  /** Goes to the page and opens its panel, if it has one. On that page already, nothing. */
  async function openPage(name: string) {
    if (route.matched.some((record) => record.name === name)) {
      return;
    }
    await router.push({ name });
    if (!(settingsStore.sidebarOpen ?? true)) {
      setPanelOpen(true);
    }
  }

  return { pageHasPanel, setPanelOpen, togglePanel, openPage };
}
