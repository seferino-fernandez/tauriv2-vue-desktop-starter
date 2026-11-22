<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import IconCaretRight from '~icons/ph/caret-right-bold'
import IconFile from '~icons/ph/file-text-duotone'
import IconFolder from '~icons/ph/folder-simple-duotone'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'

const { t } = useI18n()

// Placeholder content: an explorer-style tree, to show that each page lays out its own panel
const groups = [
  {
    key: 'projects',
    items: ['alpha', 'beta', 'gamma'],
  },
  {
    key: 'recent',
    items: ['notes', 'drafts'],
  },
  {
    key: 'archive',
    items: ['oldNotes', 'retired'],
  },
]

const selected = ref<string>()
</script>

<template>
  <SidebarGroup>
    <SidebarGroupContent>
      <SidebarMenu>
        <Collapsible
          v-for="group in groups"
          :key="group.key"
          default-open
          as-child
          class="group/collapsible"
        >
          <SidebarMenuItem>
            <CollapsibleTrigger as-child>
              <SidebarMenuButton>
                <IconCaretRight class="size-3! transition-transform group-data-[state=open]/collapsible:rotate-90" />
                <IconFolder />
                <span>{{ t(`home.panel.groups.${group.key}`) }}</span>
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                <SidebarMenuSubItem v-for="item in group.items" :key="item">
                  <SidebarMenuSubButton
                    as="button"
                    class="w-full"
                    :is-active="selected === item"
                    @click="selected = item"
                  >
                    <IconFile />
                    <span>{{ t(`home.panel.items.${item}`) }}</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>
</template>
