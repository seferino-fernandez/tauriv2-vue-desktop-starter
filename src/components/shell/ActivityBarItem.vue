<script setup lang="ts">
import type { NavItem } from "@/router";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import Keybinding from "@/components/Keybinding.vue";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useShellLayout } from "@/composables/useShellLayout";

const props = defineProps<{
  item: NavItem;
}>();

const { t } = useI18n();
const route = useRoute();
const { togglePanel, openPage } = useShellLayout();

const label = computed(() => t(props.item.titleKey));
const active = computed(() => route.matched.some((record) => record.name === props.item.name));

// Like VS Code: the current page's icon shows or hides its panel; another page's icon goes
// there and opens the panel if that page has one
function select(event: MouseEvent) {
  event.preventDefault();
  if (active.value) {
    togglePanel();
  } else {
    void openPage(props.item.name);
  }
}
</script>

<template>
  <SidebarMenuItem>
    <RouterLink v-slot="{ href }" :to="{ name: item.name }" custom>
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
            @click="select"
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
