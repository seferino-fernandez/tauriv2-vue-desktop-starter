<script setup lang="ts">
import { useRouter } from 'vue-router'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarMenu,
} from '@/components/ui/sidebar'
import { navItems } from '@/router'
import ActivityBarItem from './ActivityBarItem.vue'

const { options } = useRouter()
const mainItems = navItems('main', options.routes)
const footerItems = navItems('footer', options.routes)
</script>

<template>
  <!-- Icons only, with tooltips; it never expands. Pages are listed from route meta. -->
  <Sidebar collapsible="none" data-slot="activity-bar" class="w-(--sidebar-width-icon) shrink-0 border-r">
    <SidebarContent>
      <SidebarGroup class="px-0">
        <SidebarMenu class="items-center">
          <ActivityBarItem v-for="item in mainItems" :key="item.name" :item="item" />
        </SidebarMenu>
      </SidebarGroup>
    </SidebarContent>
    <SidebarFooter class="px-0">
      <SidebarMenu class="items-center">
        <ActivityBarItem v-for="item in footerItems" :key="item.name" :item="item" />
      </SidebarMenu>
    </SidebarFooter>
  </Sidebar>
</template>
