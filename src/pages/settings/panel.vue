<script setup lang="ts">
import { useI18n } from "vue-i18n";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useScrollSpy } from "@/composables/useScrollSpy";
import { CONTENT_ID } from "@/lib/layout";
import { sectionElementId, settingsSections } from "./sections";

const { t } = useI18n();

// Quick navigation, like VS Code's settings: jump to a section; the one in view stays highlighted
const { active, scrollTo } = useScrollSpy(
  settingsSections.map((section) => sectionElementId(section.id)),
  () => document.getElementById(CONTENT_ID),
);
</script>

<template>
  <SidebarGroup>
    <SidebarGroupContent>
      <SidebarMenu>
        <SidebarMenuItem v-for="section in settingsSections" :key="section.id">
          <SidebarMenuButton
            :is-active="active === sectionElementId(section.id)"
            @click="scrollTo(sectionElementId(section.id))"
          >
            <component :is="section.icon" />
            <span>{{ t(section.titleKey) }}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>
</template>
