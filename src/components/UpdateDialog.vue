<script setup lang="ts">
import { isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { tryOnScopeDispose } from "@vueuse/core";
import { storeToRefs } from "pinia";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useUpdaterStore } from "@/stores/updater";

/** What the macOS menu's Check for Updates… item sends (`CHECK_FOR_UPDATES` in src-tauri/src/menu.rs) */
const CHECK_FOR_UPDATES_EVENT = "check-for-updates";

const { t } = useI18n();
const updater = useUpdaterStore();
const { step, update, busy, percent } = storeToRefs(updater);

void updater.init();
if (isTauri()) {
  const unlisten = listen(CHECK_FOR_UPDATES_EVENT, () => updater.check());
  tryOnScopeDispose(() => unlisten.then((stop) => stop()));
}

const text = computed(() => {
  const version = update.value?.version ?? "";
  switch (step.value) {
    case "checking":
      return {
        title: t("updates.checking"),
        description: t("updates.checkingDescription"),
      };
    case "upToDate":
      return {
        title: t("updates.upToDate"),
        description: t("updates.upToDateDescription"),
      };
    case "available":
      return {
        title: t("updates.available", { version }),
        description: t("updates.availableDescription", {
          current: update.value?.currentVersion ?? "",
        }),
      };
    case "downloading":
      return {
        title: t("updates.downloading"),
        description:
          percent.value === null
            ? t("updates.downloadingDescription")
            : t("updates.percent", { percent: percent.value }),
      };
    case "installed":
      return {
        title: t("updates.installed"),
        description: t("updates.installedDescription", { version }),
      };
    case "checkFailed":
      return {
        title: t("updates.checkFailed"),
        description: t("updates.failedDescription"),
      };
    default:
      return {
        title: t("updates.installFailed"),
        description: t("updates.failedDescription"),
      };
  }
});

function onOpenChange(open: boolean) {
  if (!open) {
    updater.close();
  }
}
</script>

<template>
  <Dialog :open="step !== 'closed'" @update:open="onOpenChange">
    <DialogContent class="sm:max-w-md" :show-close-button="!busy">
      <DialogHeader>
        <DialogTitle>{{ text.title }}</DialogTitle>
        <DialogDescription>{{ text.description }}</DialogDescription>
      </DialogHeader>
      <Progress v-if="step === 'downloading'" :model-value="percent ?? 0" />
      <DialogFooter v-if="!busy">
        <template v-if="step === 'available'">
          <Button variant="outline" @click="updater.close()">
            {{ t("updates.later") }}
          </Button>
          <Button @click="updater.install()">
            {{ t("updates.install") }}
          </Button>
        </template>
        <template v-else-if="step === 'installed'">
          <Button variant="outline" @click="updater.close()">
            {{ t("updates.later") }}
          </Button>
          <Button @click="updater.restart()">
            {{ t("updates.restart") }}
          </Button>
        </template>
        <Button v-else @click="updater.close()">
          {{ t("updates.close") }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
