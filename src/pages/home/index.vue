<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n({ useScope: 'global' })
</script>

<template>
  <div>
    <h1 class="text-4xl font-bold">
      {{ t('home.label') }}
    </h1>
  </div>
</template>
