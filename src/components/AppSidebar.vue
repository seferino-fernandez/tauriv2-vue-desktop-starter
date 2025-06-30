<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Icon } from '@iconify/vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const sidebarRoutes = [
  {
    name: 'home.label',
    icon: 'ph:house-duotone',
    path: '/home',
  },
]
</script>

<template>
  <aside class="flex flex-col h-dvh pb-12 pt-2 px-2 justify-between bg-sidebar">
    <nav class="grid gap-1">
      <Tooltip v-for="sidebarRoute in sidebarRoutes" :key="sidebarRoute.name">
        <TooltipTrigger as-child>
          <RouterLink :to="sidebarRoute.path">
            <Button
              variant="ghost"
              size="icon"
              :class="sidebarRoute.path === $route.path ? 'bg-muted' : ''"
              class="rounded-lg"
              :aria-label="t(sidebarRoute.name)"
            >
              <Icon :icon="sidebarRoute.icon" class="size-5" />
            </Button>
          </RouterLink>
        </TooltipTrigger>
        <TooltipContent side="right" :side-offset="5">
          {{ t(sidebarRoute.name) }}
        </TooltipContent>
      </Tooltip>
    </nav>
    <div class="">
      <Tooltip>
        <TooltipTrigger as-child>
          <RouterLink to="/settings">
            <Button
              variant="ghost"
              size="icon"
              :class="'/settings' === $route.path ? 'bg-muted' : ''"
              class="mt-auto rounded-lg"
              :aria-label="t('settings.label')"
            >
              <Icon icon="ph:gear-duotone" class="size-5" />
            </Button>
          </RouterLink>
        </TooltipTrigger>
        <TooltipContent side="right" :side-offset="5">
          {{ t('settings.label') }}
        </TooltipContent>
      </Tooltip>
    </div>
  </aside>
</template>
