import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createI18n } from "vue-i18n";
import en from "@/i18n/locales/en.json";
import { useSettingsStore } from "@/stores/settings";
import { mockSettingsIpc, unmockSettingsIpc } from "@/test/settings-ipc";
import KeybindingSetting from "./KeybindingSetting.vue";

vi.mock("@/lib/platform", () => ({
  isMacOS: () => true,
}));

enableAutoUnmount(afterEach);

async function mountSetting() {
  await useSettingsStore().load();
  const i18n = createI18n({
    locale: "en",
    legacy: false,
    messages: { en },
  });
  const wrapper = mount(KeybindingSetting, {
    props: { command: "togglePanel" },
    global: {
      plugins: [i18n],
    },
    attachTo: document.body,
  });
  await flushPromises();
  return wrapper;
}

const field = () => document.querySelector<HTMLButtonElement>('[data-slot="keybinding-field"]')!;
const reset = () => document.querySelector<HTMLButtonElement>('[data-slot="keybinding-reset"]')!;
const message = () => document.querySelector('[role="alert"]')?.textContent?.trim();

async function press(code: string, modifiers: KeyboardEventInit = {}) {
  field().dispatchEvent(
    new KeyboardEvent("keydown", {
      code,
      bubbles: true,
      cancelable: true,
      ...modifiers,
    }),
  );
  await flushPromises();
}

async function startRecording() {
  field().click();
  await flushPromises();
}

let ipc: ReturnType<typeof mockSettingsIpc>;

describe("keybinding setting", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    ipc = mockSettingsIpc();
    document.body.innerHTML = "";
  });

  afterEach(unmockSettingsIpc);

  it("shows the command and its current shortcut", async () => {
    await mountSetting();
    expect(document.querySelector("label")?.textContent?.trim()).toBe("Toggle panel");
    expect(field().textContent?.trim()).toBe("⌘B");
    expect(reset().disabled).toBe(true);
  });

  it("records a new shortcut and saves only the change", async () => {
    await mountSetting();
    await startRecording();
    expect(field().textContent?.trim()).toBe("Press a shortcut…");
    expect(useSettingsStore().recordingKeybinding).toBe(true);

    await press("MetaLeft", { metaKey: true });
    expect(ipc.sent).toEqual([]);
    await press("KeyK", { metaKey: true, shiftKey: true });
    expect(ipc.sent).toEqual([
      ["set_keybinding", { command: "togglePanel", binding: "Mod+Shift+KeyK" }],
    ]);
    expect(field().textContent?.trim()).toBe("⇧⌘K");
    expect(useSettingsStore().recordingKeybinding).toBe(false);
    expect(reset().disabled).toBe(false);
  });

  it("refuses a shortcut without ⌘, keeps listening, and takes the next one", async () => {
    await mountSetting();
    await startRecording();
    await press("KeyK");
    expect(message()).toBe("Include ⌘ in the shortcut.");
    expect(ipc.sent).toEqual([]);
    expect(useSettingsStore().recordingKeybinding).toBe(true);

    await press("KeyK", { metaKey: true });
    expect(message()).toBeUndefined();
    expect(ipc.sent).toEqual([["set_keybinding", { command: "togglePanel", binding: "Mod+KeyK" }]]);
  });

  it("refuses a shortcut the system uses", async () => {
    await mountSetting();
    await startRecording();
    await press("KeyQ", { metaKey: true });
    expect(message()).toBe("⌘Q is reserved by the system or the app menu.");
    expect(field().getAttribute("aria-describedby")).toBe(
      document.querySelector('[role="alert"]')?.id,
    );
    expect(ipc.sent).toEqual([]);
  });

  it("takes focus when clicked, so it gets the keys even where a click does not focus buttons", async () => {
    await mountSetting();
    expect(document.activeElement).not.toBe(field());
    await startRecording();
    expect(document.activeElement).toBe(field());
  });

  it("stops recording when it goes away mid-recording", async () => {
    const wrapper = await mountSetting();
    await startRecording();
    wrapper.unmount();
    expect(useSettingsStore().recordingKeybinding).toBe(false);
  });

  it("cancels with Escape or by clicking away", async () => {
    await mountSetting();
    await startRecording();
    await press("Escape");
    expect(field().textContent?.trim()).toBe("⌘B");
    expect(useSettingsStore().recordingKeybinding).toBe(false);

    await startRecording();
    field().dispatchEvent(new FocusEvent("blur"));
    await flushPromises();
    expect(field().textContent?.trim()).toBe("⌘B");
    expect(useSettingsStore().recordingKeybinding).toBe(false);
    expect(ipc.sent).toEqual([]);
  });

  it("resets to the default, removing the override", async () => {
    ipc = mockSettingsIpc({
      keybindings: { togglePanel: "Mod+KeyJ" },
    });
    await mountSetting();
    expect(field().textContent?.trim()).toBe("⌘J");

    reset().click();
    await flushPromises();
    expect(ipc.sent).toEqual([["reset_keybinding", { command: "togglePanel" }]]);
    expect(field().textContent?.trim()).toBe("⌘B");
    expect(reset().disabled).toBe(true);
  });

  it("says why it cannot reset while another command has the default", async () => {
    ipc = mockSettingsIpc({
      keybindings: { togglePanel: "Mod+KeyJ", openSettings: "Mod+KeyB" },
    });
    await mountSetting();

    reset().click();
    await flushPromises();
    expect(message()).toBe("⌘B is already used by Open settings.");
    expect(field().textContent?.trim()).toBe("⌘J");
    expect(ipc.sent).toEqual([]);
  });

  it("removes the override when the default is recorded again", async () => {
    ipc = mockSettingsIpc({
      keybindings: { togglePanel: "Mod+KeyJ" },
    });
    await mountSetting();
    await startRecording();
    await press("KeyB", { metaKey: true });
    expect(ipc.sent).toEqual([["reset_keybinding", { command: "togglePanel" }]]);
  });
});
