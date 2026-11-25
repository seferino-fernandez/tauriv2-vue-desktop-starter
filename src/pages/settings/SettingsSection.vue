<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { FieldGroup } from '@/components/ui/field'
import { sectionElementId, settingsSections } from './sections'

const props = defineProps<{
  /** An id from sections.ts; the heading and icon come from there, as in the panel */
  id: string
  /** i18n key of a line under the heading */
  descriptionKey?: string
}>()

const { t } = useI18n()
const section = computed(() => settingsSections.find(s => s.id === props.id)!)
const headingId = computed(() => `${sectionElementId(props.id)}-heading`)
</script>

<template>
  <!-- The jump lands it 16px below the top, inside the scroll spy's 24px -->
  <section
    :id="sectionElementId(id)"
    :aria-labelledby="headingId"
    class="flex scroll-mt-4 flex-col gap-3"
  >
    <div class="flex flex-col gap-1 px-1">
      <h2 :id="headingId" class="flex items-center gap-2 text-base font-semibold">
        <component :is="section.icon" class="size-4.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        {{ t(section.titleKey) }}
      </h2>
      <p v-if="descriptionKey" class="text-sm text-muted-foreground">
        {{ t(descriptionKey) }}
      </p>
    </div>
    <!-- One rounded group per section, a hairline between its rows -->
    <FieldGroup class="gap-0 divide-y overflow-hidden rounded-lg border bg-card text-card-foreground">
      <slot />
    </FieldGroup>
  </section>
</template>
