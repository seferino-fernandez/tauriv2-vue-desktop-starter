<script setup lang="ts">
import { Check, ChevronDown, Search } from "@lucide/vue";
import {
  ComboboxAnchor,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxPortal,
  ComboboxRoot,
  ComboboxTrigger,
  ComboboxViewport,
} from "reka-ui";
import { getFamilies } from "tauri-plugin-fontgres-api";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field";
import { fontStack } from "@/lib/fonts";
import { useSettingsStore } from "@/stores/settings";

interface FontOption {
  family: string | null;
  label: string;
}

const { t } = useI18n();
const settings = useSettingsStore();
const open = ref(false);
const installedFonts = ref<Array<string>>();
const loading = ref(false);
const loadError = ref(false);
const saving = ref(false);
const saveError = ref(false);

const systemFont = computed<FontOption>(() => ({
  family: null,
  label: t("settings.font.default"),
}));
const options = computed<Array<FontOption>>(() => [
  systemFont.value,
  ...(installedFonts.value ?? []).map((family) => ({ family, label: family })),
]);
const missingFont = computed(
  () =>
    !!settings.fontFamily &&
    installedFonts.value !== undefined &&
    !installedFonts.value.includes(settings.fontFamily),
);
const currentFont = computed<FontOption>(() =>
  settings.fontFamily && !missingFont.value
    ? { family: settings.fontFamily, label: settings.fontFamily }
    : systemFont.value,
);

async function loadFonts() {
  if (installedFonts.value || loading.value) {
    return;
  }

  loadError.value = false;
  loading.value = true;
  try {
    installedFonts.value = await getFamilies();
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

watch(
  () => settings.fontFamily,
  (family) => {
    if (family) {
      void loadFonts();
    }
  },
  { immediate: true },
);

async function selectFont(option: FontOption) {
  if (saving.value || option.family === settings.fontFamily) {
    return;
  }

  saving.value = true;
  saveError.value = false;
  try {
    await settings.setFontFamily(option.family);
  } catch {
    saveError.value = true;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Field orientation="responsive" class="gap-x-6 px-4 py-4 font-sans">
    <FieldContent>
      <FieldLabel id="app-font-label" for="app-font">
        {{ t("settings.font.label") }}
      </FieldLabel>
      <FieldDescription>
        {{ t("settings.font.description") }}
      </FieldDescription>
      <div v-if="loadError && !open" class="flex flex-wrap items-center gap-x-2 gap-y-1">
        <p role="status" class="text-sm text-muted-foreground">
          {{ t("settings.font.loadError") }}
        </p>
        <Button variant="link" size="sm" class="h-auto p-0" @click="loadFonts">
          {{ t("settings.font.retry") }}
        </Button>
      </div>
      <p v-if="saveError" role="alert" class="text-sm text-destructive">
        {{ t("settings.font.saveError") }}
      </p>
      <p v-if="missingFont" role="status" class="text-sm text-muted-foreground">
        {{ t("settings.font.missing", { family: settings.fontFamily }) }}
      </p>
    </FieldContent>
    <ComboboxRoot
      v-model:open="open"
      class="min-w-0 @md/field-group:w-48!"
      :model-value="currentFont"
      :disabled="!settings.fontReady"
      by="family"
      @update:open="(value) => value && loadFonts()"
      @update:model-value="selectFont"
    >
      <ComboboxAnchor as-child>
        <ComboboxTrigger
          as-child
          tabindex="0"
          :aria-label="t('settings.font.label')"
          aria-labelledby="app-font-label app-font-value"
        >
          <Button
            id="app-font"
            variant="outline"
            class="w-full justify-between"
            :aria-busy="saving"
          >
            <span id="app-font-value" class="truncate" :title="currentFont.label">{{
              currentFont.label
            }}</span>
            <ChevronDown class="text-muted-foreground" aria-hidden="true" />
          </Button>
        </ComboboxTrigger>
      </ComboboxAnchor>

      <ComboboxPortal>
        <ComboboxContent
          position="popper"
          align="start"
          :side-offset="4"
          :collision-padding="8"
          :aria-label="t('settings.font.label')"
          class="z-50 max-h-(--reka-combobox-content-available-height) w-(--reka-combobox-trigger-width) max-w-(--reka-combobox-content-available-width) overflow-hidden rounded-md border bg-popover font-sans text-popover-foreground shadow-md"
        >
          <div class="flex shrink-0 items-center gap-2 border-b px-3 focus-within:bg-accent/50">
            <Search class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <ComboboxInput
              class="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              :aria-label="t('settings.font.search')"
              :placeholder="t('settings.font.search')"
            />
          </div>
          <ComboboxViewport
            class="min-h-0 max-h-64 overflow-y-auto overscroll-contain p-1 [@media(max-height:640px)]:max-h-44"
          >
            <ComboboxGroup>
              <ComboboxItem
                v-for="option in options"
                :key="option.family"
                :value="option"
                :text-value="option.label"
                :aria-label="option.label"
                class="relative flex min-h-8 cursor-default items-center justify-between gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
              >
                <span class="min-w-0 truncate" :title="option.label">{{ option.label }}</span>
                <span
                  v-if="option.family"
                  class="w-8 shrink-0 overflow-hidden text-center text-base leading-none text-muted-foreground"
                  :style="{ fontFamily: fontStack(option.family) }"
                  aria-hidden="true"
                  >{{ t("settings.font.sample") }}</span
                >
                <ComboboxItemIndicator class="absolute right-2">
                  <Check class="size-4" aria-hidden="true" />
                </ComboboxItemIndicator>
              </ComboboxItem>
            </ComboboxGroup>
            <p v-if="loading" role="status" class="px-2 py-2 text-sm text-muted-foreground">
              {{ t("settings.font.loading") }}
            </p>
            <p v-else-if="loadError" role="status" class="px-2 py-2 text-sm text-muted-foreground">
              {{ t("settings.font.loadError") }}
            </p>
            <p
              v-else-if="installedFonts?.length === 0"
              role="status"
              class="px-2 py-2 text-sm text-muted-foreground"
            >
              {{ t("settings.font.empty") }}
            </p>
            <ComboboxEmpty
              v-else-if="installedFonts?.length"
              role="status"
              class="px-2 py-2 text-sm text-muted-foreground"
            >
              {{ t("settings.font.noResults") }}
            </ComboboxEmpty>
          </ComboboxViewport>
        </ComboboxContent>
      </ComboboxPortal>
    </ComboboxRoot>
  </Field>
</template>
