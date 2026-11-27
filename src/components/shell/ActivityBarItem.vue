<script setup lang="ts">
import type { NavigationFailure } from "vue-router";
import type { NavItem } from "@/router";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import Keybinding from "@/components/Keybinding.vue";
import { SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { hasPanel } from "@/router";

const props = defineProps<{
  item: NavItem;
}>();

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { open, setOpen, toggleSidebar } = useSidebar();

const label = computed(() => t(props.item.titleKey));
const active = computed(() => route.matched.some((record) => record.name === props.item.name));

// Like VS Code: the current page's icon shows or hides its panel; another page's icon goes
// there and opens the panel if that page has one
async function select(
  event: MouseEvent,
  navigate: (event?: MouseEvent) => Promise<void | NavigationFailure>,
) {
  if (active.value) {
    event.preventDefault();
    if (hasPanel(route)) {
      toggleSidebar();
    }
    return;
  }
  const openPanel = !open.value && hasPanel(router.resolve({ name: props.item.name }));
  await navigate(event);
  // After navigating: the shell ignores open changes while the page has no panel
  if (openPanel) {
    setOpen(true);
  }
}
</script>

<template>
  <SidebarMenuItem>
    <RouterLink v-slot="{ href, navigate }" :to="{ name: item.name }" custom>
      <!-- Not SidebarMenuButton's tooltip prop: it hides the tooltip while the panel is open -->
      <Tooltip>
        <TooltipTrigger as-child>
          <SidebarMenuButton
            as="a"
            :href="href"
            :is-active="active"
            :aria-label="label"
            :aria-current="active ? 'page' : undefined"
            class="size-9 justify-center p-0 [&>svg]:size-5"
            @click="select($event, navigate)"
          >
            <component :is="item.icon" />
          </SidebarMenuButton>
        </TooltipTrigger>
        <TooltipContent side="right" align="center">
          {{ label }}
          <Keybinding v-if="item.command" :command="item.command" class="ml-1.5" />
        </TooltipContent>
      </Tooltip>
    </RouterLink>
  </SidebarMenuItem>
</template>
