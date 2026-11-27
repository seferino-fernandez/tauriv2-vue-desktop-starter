import type { RouteRecordRaw } from "vue-router";
import { emit } from "@tauri-apps/api/event";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { h } from "vue";
import { createI18n } from "vue-i18n";
import { createMemoryHistory, createRouter } from "vue-router";
import App from "@/App.vue";
import en from "@/i18n/locales/en.json";
import { PANEL_DEFAULT_WIDTH, PANEL_MAX_WIDTH } from "@/lib/layout";
import { routes } from "@/router";
import { useSettingsStore } from "@/stores/settings";
import { mockSettingsIpc, unmockSettingsIpc } from "@/test/settings-ipc";

vi.mock("@/lib/platform", () => ({
  isMacOS: () => true,
}));

// A page with its own nested panel, at the top of the activity bar
const panelRoute: RouteRecordRaw = {
  path: "/notes",
  name: "notes",
  components: {
    default: {
      render: () => h("p", "Notes page"),
    },
    sidebar: {
      render: () => h("p", "Notes panel"),
    },
  },
  meta: { titleKey: "test.notes", nav: "main" },
};

// A page with no nested panel: just a default view
const plainRoute: RouteRecordRaw = {
  path: "/plain",
  name: "plain",
  component: {
    render: () => h("p", "Plain page"),
  },
  meta: { titleKey: "languages.label", nav: "main" },
};

async function mountApp(path = "/notes") {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [...routes, panelRoute, plainRoute],
  });
  const i18n = createI18n({
    locale: "en",
    legacy: false,
    messages: {
      en: {
        ...en,
        test: { notes: "Notes" },
      },
    },
  });
  await useSettingsStore().load();
  await router.push(path);
  await router.isReady();
  const wrapper = mount(App, {
    global: {
      plugins: [router, i18n],
    },
    attachTo: document.body,
  });
  await flushPromises();
  return { wrapper, router };
}

const panel = () => document.querySelector<HTMLElement>('[data-slot="nested-panel"]');
const panelState = () => panel()?.getAttribute("data-state");
const icon = (label: string) =>
  document.querySelector<HTMLElement>(`[data-slot="activity-bar"] a[aria-label="${label}"]`)!;

async function click(element: HTMLElement) {
  element.click();
  await flushPromises();
}

/** The command palette's items, as they are now */
function commandItems() {
  return [...document.querySelectorAll<HTMLElement>('[data-slot="command-item"]')];
}

async function press(
  code: string,
  modifiers: KeyboardEventInit = {},
  target: EventTarget = window,
) {
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      code,
      bubbles: true,
      cancelable: true,
      ...modifiers,
    }),
  );
  await flushPromises();
}

const toggle = () => document.querySelector<HTMLElement>('header [data-sidebar="trigger"]');

let ipc: ReturnType<typeof mockSettingsIpc>;

// Going to settings waits for its lazily loaded views, and the first load takes longer than a
// test waits after a key press. Load them up front so every test passes on its own too.
beforeAll(async () => {
  await Promise.all([import("@/pages/settings/index.vue"), import("@/pages/settings/panel.vue")]);
});

describe("appShell", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    ipc = mockSettingsIpc();
    document.body.innerHTML = "";
  });

  afterEach(unmockSettingsIpc);
  // Unmount between tests, or earlier apps keep handling shortcuts on window. After hooks run
  // last-registered first, so this unmounts while the mocked IPC can still remove its listeners.
  enableAutoUnmount(afterEach);

  it("opens on the settings page", async () => {
    const { router } = await mountApp("/");
    expect(router.currentRoute.value.name).toBe("settings");
    expect(icon("Settings").getAttribute("data-active")).toBe("true");
  });

  it("lists pages in the activity bar from route meta, as icons only", async () => {
    await mountApp();
    const bar = document.querySelector('[data-slot="activity-bar"]')!;
    const content = bar.querySelector('[data-sidebar="content"]')!;
    const footer = bar.querySelector('[data-sidebar="footer"]')!;
    expect([...content.querySelectorAll("a")].map((a) => a.getAttribute("aria-label"))).toEqual([
      "Notes",
      "Languages",
    ]);
    expect([...footer.querySelectorAll("a")].map((a) => a.getAttribute("aria-label"))).toEqual([
      "Settings",
    ]);
    expect(bar.textContent?.trim()).toBe("");
  });

  it("shows an icon's tooltip while the panel is open", async () => {
    await mountApp();
    expect(panelState()).toBe("expanded");
    icon("Settings").dispatchEvent(new FocusEvent("focus"));
    await flushPromises();
    expect(document.querySelector('[role="tooltip"]')?.textContent).toContain("Settings ⌘,");
  });

  it("highlights the current page and labels the panel with it", async () => {
    const { router } = await mountApp();
    expect(icon("Notes").getAttribute("data-active")).toBe("true");
    expect(document.querySelector("header h1")).toBeNull();
    expect(panel()?.querySelector('[data-sidebar="header"]')?.textContent?.trim()).toBe("Notes");

    await router.push("/settings");
    await flushPromises();
    expect(icon("Notes").getAttribute("data-active")).toBe("false");
    expect(icon("Settings").getAttribute("data-active")).toBe("true");
    expect(panel()?.querySelector('[data-sidebar="header"]')?.textContent?.trim()).toBe("Settings");
  });

  it("renders each page's own panel", async () => {
    const { router } = await mountApp();
    expect(panel()?.textContent).toContain("Notes panel");

    await router.push("/settings");
    await flushPromises();
    expect(panel()?.textContent).toContain("Appearance");
    expect(panel()?.textContent).not.toContain("Notes panel");
  });

  it("toggles the panel from the current page's icon and saves the state", async () => {
    await mountApp();
    await click(icon("Notes"));
    expect(panelState()).toBe("collapsed");
    expect(panel()?.hasAttribute("inert")).toBe(true);
    expect(ipc.sent).toContainEqual(["set_sidebar_open", { open: false }]);

    await click(icon("Notes"));
    expect(panelState()).toBe("expanded");
    expect(ipc.sent.at(-1)).toEqual(["set_sidebar_open", { open: true }]);
  });

  it("opens the panel when going to another page that has one", async () => {
    const { router } = await mountApp();
    await click(icon("Notes"));
    expect(panelState()).toBe("collapsed");

    await click(icon("Settings"));
    expect(router.currentRoute.value.name).toBe("settings");
    expect(panelState()).toBe("expanded");
  });

  it("toggles the panel from the titlebar and with ⌘B", async () => {
    await mountApp();
    await click(toggle()!);
    expect(panelState()).toBe("collapsed");

    await press("KeyB", { metaKey: true });
    expect(panelState()).toBe("expanded");
    expect(ipc.sent.at(-1)).toEqual(["set_sidebar_open", { open: true }]);

    await press("KeyB", { metaKey: true, shiftKey: true });
    await press("KeyB", { metaKey: true, repeat: true });
    expect(panelState()).toBe("expanded");
  });

  it("shows the panel shortcut in the titlebar toggle's tooltip", async () => {
    await mountApp();
    toggle()!.dispatchEvent(new FocusEvent("focus"));
    await flushPromises();
    expect(document.querySelector('[role="tooltip"]')?.textContent).toContain("Toggle panel ⌘B");
  });

  it("uses a changed shortcut instead of ⌘B, in the tooltip too", async () => {
    ipc = mockSettingsIpc({
      keybindings: { togglePanel: "Mod+Alt+KeyJ" },
    });
    await mountApp();
    await press("KeyB", { metaKey: true });
    expect(panelState()).toBe("expanded");

    await press("KeyJ", { metaKey: true, altKey: true, key: "∆" });
    expect(panelState()).toBe("collapsed");

    toggle()!.dispatchEvent(new FocusEvent("focus"));
    await flushPromises();
    expect(document.querySelector('[role="tooltip"]')?.textContent).toContain("⌥⌘J");
  });

  it("does not toggle the panel while a shortcut is being recorded", async () => {
    const { router } = await mountApp();
    await router.push("/settings");
    await flushPromises();
    const field = document.querySelector<HTMLElement>('[data-slot="keybinding-field"]')!;
    await click(field);

    await press("KeyB", { metaKey: true }, field);
    expect(panelState()).toBe("expanded");
    await click(field);
    await press("KeyJ", { metaKey: true }, field);
    expect(panelState()).toBe("expanded");
    expect(ipc.sent.at(-1)).toEqual([
      "set_keybinding",
      { command: "togglePanel", binding: "Mod+KeyJ" },
    ]);

    await press("KeyJ", { metaKey: true });
    expect(panelState()).toBe("collapsed");
  });

  it("goes to settings with ⌘, and opens its panel", async () => {
    const { router } = await mountApp();
    await click(icon("Notes"));
    expect(panelState()).toBe("collapsed");

    await press("Comma", { metaKey: true });
    expect(router.currentRoute.value.name).toBe("settings");
    expect(panelState()).toBe("expanded");
  });

  it("opens the settings panel with ⌘, when coming from a page without one", async () => {
    ipc = mockSettingsIpc({ sidebarOpen: false });
    const { router } = await mountApp("/plain");

    await press("Comma", { metaKey: true });
    expect(router.currentRoute.value.name).toBe("settings");
    expect(panelState()).toBe("expanded");
    expect(ipc.sent).toContainEqual(["set_sidebar_open", { open: true }]);
  });

  it("does nothing with ⌘, on settings", async () => {
    await mountApp("/settings");
    await click(toggle()!);
    const sent = ipc.sent.length;

    await press("Comma", { metaKey: true });
    expect(panelState()).toBe("collapsed");
    expect(ipc.sent).toHaveLength(sent);
  });

  it("uses a changed shortcut instead of ⌘, for settings", async () => {
    ipc = mockSettingsIpc({
      keybindings: { openSettings: "Mod+Shift+KeyS" },
    });
    const { router } = await mountApp();
    await press("Comma", { metaKey: true });
    expect(router.currentRoute.value.name).toBe("notes");

    await press("KeyS", { metaKey: true, shiftKey: true });
    expect(router.currentRoute.value.name).toBe("settings");
  });

  it("goes to settings when the app menu asks", async () => {
    const { router } = await mountApp();
    await emit("command", "openSettings");
    await flushPromises();
    expect(router.currentRoute.value.name).toBe("settings");
  });

  it("opens the command palette with ⇧⌘P and runs the command picked there", async () => {
    const { router } = await mountApp();
    await press("KeyP", { metaKey: true, shiftKey: true });
    expect(commandItems().map((item) => item.textContent)).toEqual([
      "Toggle panel ⌘B",
      "Open settings ⌘,",
    ]);

    await click(commandItems()[1]);
    expect(router.currentRoute.value.name).toBe("settings");
    expect(document.querySelector('[data-slot="command-item"]')).toBeNull();
  });

  it("opens the panel when coming from a page without one", async () => {
    ipc = mockSettingsIpc({ sidebarOpen: false });
    const { router } = await mountApp("/plain");
    await click(icon("Notes"));
    expect(router.currentRoute.value.name).toBe("notes");
    expect(panelState()).toBe("expanded");
    expect(ipc.sent).toContainEqual(["set_sidebar_open", { open: true }]);
  });

  it("shows no panel or toggle on a page without one, and ⌘B does nothing there", async () => {
    await mountApp("/plain");
    expect(document.querySelector("main")?.textContent).toContain("Plain page");
    expect(panel()).toBeNull();
    expect(toggle()).toBeNull();

    await press("KeyB", { metaKey: true });
    await click(icon("Languages"));
    expect(ipc.sent).toEqual([]);
  });

  it("restores the saved open state and width", async () => {
    ipc = mockSettingsIpc({ sidebarOpen: false, sidebarWidth: 300 });
    await mountApp();
    expect(panelState()).toBe("collapsed");
    expect(panel()?.style.width).toBe("0px");

    await click(icon("Notes"));
    expect(panel()?.style.width).toBe("300px");
  });

  it("resizes the panel by dragging its edge, saving once when the drag ends", async () => {
    await mountApp();
    const handle = document.querySelector<HTMLElement>('[data-slot="nested-panel-resize"]')!;
    handle.setPointerCapture = vi.fn();
    handle.dispatchEvent(
      new PointerEvent("pointerdown", { button: 0, pointerId: 1, clientX: 256 }),
    );
    handle.dispatchEvent(new PointerEvent("pointermove", { pointerId: 1, clientX: 320 }));
    await flushPromises();
    expect(panel()?.style.width).toBe("320px");
    handle.dispatchEvent(new PointerEvent("pointermove", { pointerId: 1, clientX: 900 }));
    await flushPromises();
    expect(panel()?.style.width).toBe(`${PANEL_MAX_WIDTH}px`);
    expect(ipc.sent).toEqual([]);

    handle.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1 }));
    await flushPromises();
    expect(ipc.sent).toEqual([["set_sidebar_width", { width: PANEL_MAX_WIDTH }]]);

    handle.dispatchEvent(new MouseEvent("dblclick"));
    await flushPromises();
    expect(panel()?.style.width).toBe(`${PANEL_DEFAULT_WIDTH}px`);
    expect(ipc.sent.at(-1)).toEqual(["set_sidebar_width", { width: PANEL_DEFAULT_WIDTH }]);
  });
});
