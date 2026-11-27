import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import i18n from "@/i18n";
import { useSettingsStore } from "@/stores/settings";
import { mockSettingsIpc, unmockSettingsIpc } from "@/test/settings-ipc";
import SettingsPage from "./index.vue";

enableAutoUnmount(afterEach);

let ipc: ReturnType<typeof mockSettingsIpc>;

async function openSettings() {
  await useSettingsStore().load();
  const wrapper = mount(SettingsPage, {
    global: { plugins: [i18n] },
    attachTo: document.body,
  });
  await flushPromises();
  return wrapper;
}

describe("settings page: language", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    i18n.global.locale.value = "en";
    document.body.innerHTML = "";
  });

  afterEach(unmockSettingsIpc);

  it("saves nothing when it opens", async () => {
    ipc = mockSettingsIpc();
    await openSettings();
    expect(ipc.sent).toEqual([]);
  });

  it("switches to the language picked and saves it", async () => {
    ipc = mockSettingsIpc();
    await openSettings();

    const trigger = document.querySelector<HTMLElement>("#language-select")!;
    trigger.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse" }));
    await flushPromises();
    const spanish = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (option) => option.textContent?.trim() === "Español",
    )!;
    spanish.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerType: "mouse" }));
    await flushPromises();

    expect(ipc.sent).toEqual([["set_language", { language: "es" }]]);
    expect(document.querySelector("h1")?.textContent?.trim()).toBe("Configuraciones");
  });
});
