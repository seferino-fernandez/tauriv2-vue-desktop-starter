import { describe, expect, it } from "vitest";
import {
  commandIds,
  commands,
  formatKeybinding,
  keybindingFromEvent,
  keybindingKeys,
  changeKeybinding,
  loadKeybindingOverrides,
  matchesKeybinding,
  normalizeKeybinding,
} from "./keybindings";

function press(code: string, modifiers: KeyboardEventInit = {}) {
  return new KeyboardEvent("keydown", { code, ...modifiers });
}

describe("normalizeKeybinding", () => {
  it("puts modifiers in a fixed order", () => {
    expect(normalizeKeybinding("Shift+Mod+KeyB")).toBe("Mod+Shift+KeyB");
    expect(normalizeKeybinding("Alt+Shift+Mod+Comma")).toBe("Mod+Alt+Shift+Comma");
  });

  it("rejects what is not a shortcut", () => {
    for (const binding of ["", "Mod+", "Ctrl+KeyB", "Mod+ShiftLeft", "Mod+b", "Mod+Key B"]) {
      expect(normalizeKeybinding(binding)).toBeUndefined();
    }
  });
});

describe("keybindingFromEvent", () => {
  it("reads ⌘ as Mod on macOS and Ctrl as Mod elsewhere", () => {
    expect(keybindingFromEvent(press("KeyB", { metaKey: true }), true)).toBe("Mod+KeyB");
    expect(keybindingFromEvent(press("KeyB", { ctrlKey: true }), false)).toBe("Mod+KeyB");
  });

  it("refuses the modifier a shortcut cannot hold: Ctrl on macOS, the Windows/Super key elsewhere", () => {
    expect(keybindingFromEvent(press("KeyB", { ctrlKey: true }), true)).toBeUndefined();
    expect(keybindingFromEvent(press("KeyB", { metaKey: true }), false)).toBeUndefined();
  });

  it("uses the physical key, so ⌥ combos on macOS work", () => {
    const event = new KeyboardEvent("keydown", {
      code: "KeyB",
      key: "∫",
      metaKey: true,
      altKey: true,
    });
    expect(keybindingFromEvent(event, true)).toBe("Mod+Alt+KeyB");
  });

  it("ignores a modifier pressed on its own", () => {
    expect(keybindingFromEvent(press("MetaLeft", { metaKey: true }), true)).toBeUndefined();
    expect(keybindingFromEvent(press("ShiftRight", { shiftKey: true }), false)).toBeUndefined();
  });
});

describe("matchesKeybinding", () => {
  it("matches the exact modifiers only", () => {
    expect(matchesKeybinding(press("KeyB", { metaKey: true }), "Mod+KeyB", true)).toBe(true);
    expect(
      matchesKeybinding(press("KeyB", { metaKey: true, shiftKey: true }), "Mod+KeyB", true),
    ).toBe(false);
    expect(
      matchesKeybinding(press("KeyB", { metaKey: true, ctrlKey: true }), "Mod+KeyB", true),
    ).toBe(false);
    expect(matchesKeybinding(press("KeyB"), "Mod+KeyB", true)).toBe(false);
  });
});

describe("loadKeybindingOverrides", () => {
  it("loads back a swap the settings allow", () => {
    // Settings moved off ⌘, first, so the panel could take it
    const saved = { openSettings: "Mod+KeyJ", togglePanel: "Mod+Comma" };
    expect(loadKeybindingOverrides(saved)).toEqual({ overrides: saved, deleted: [] });
  });

  it("keeps a usable override, normalized", () => {
    expect(loadKeybindingOverrides({ togglePanel: "Shift+Mod+KeyK" })).toEqual({
      overrides: { togglePanel: "Mod+Shift+KeyK" },
      deleted: [],
    });
  });

  it("deletes overrides of unknown commands, defaults, and shortcuts that are invalid or refused", () => {
    for (const saved of [
      { notACommand: "Mod+KeyK" },
      { togglePanel: "Mod+KeyB" },
      { togglePanel: "Mod+" },
      { togglePanel: "KeyK" },
      { togglePanel: "Mod+KeyQ" },
    ]) {
      expect(loadKeybindingOverrides(saved), JSON.stringify(saved)).toEqual({
        overrides: {},
        deleted: Object.keys(saved),
      });
    }
  });

  it("keeps a default over an override that clashes with it, e.g. a new command's", () => {
    expect(loadKeybindingOverrides({ togglePanel: "Mod+Comma" })).toEqual({
      overrides: {},
      deleted: ["togglePanel"],
    });
  });

  it("deletes clashing overrides until nothing clashes", () => {
    // Edited by hand, both are ⇧⌘J, so both go; the panel is then back on ⌘B, which the
    // palette's override clashes with
    const { overrides, deleted } = loadKeybindingOverrides({
      togglePanel: "Mod+Shift+KeyJ",
      openSettings: "Shift+Mod+KeyJ",
      openCommandPalette: "Mod+KeyB",
    });
    expect(overrides).toEqual({});
    expect(deleted).toHaveLength(3);
    expect(deleted).toEqual(
      expect.arrayContaining(["openCommandPalette", "openSettings", "togglePanel"]),
    );
  });
});

describe("changeKeybinding", () => {
  it("gives a command a free shortcut, normalized", () => {
    expect(changeKeybinding({}, "togglePanel", "Shift+Mod+KeyK")).toEqual({
      overrides: { togglePanel: "Mod+Shift+KeyK" },
      override: "Mod+Shift+KeyK",
    });
  });

  it("removes the override when the command gets its default back", () => {
    const overrides = { togglePanel: "Mod+KeyJ", openSettings: "Mod+KeyK" };
    expect(changeKeybinding(overrides, "togglePanel", "Mod+KeyB")).toEqual({
      overrides: { openSettings: "Mod+KeyK" },
      override: undefined,
    });
  });

  it("refuses a shortcut another command uses, naming it", () => {
    expect(changeKeybinding({}, "togglePanel", "Mod+Comma")).toEqual({
      problem: { kind: "taken", command: "openSettings" },
    });
  });

  it("refuses a reset while another command has the default", () => {
    const overrides = { togglePanel: "Mod+KeyJ", openSettings: "Mod+KeyB" };
    expect(changeKeybinding(overrides, "togglePanel", commands.togglePanel.defaultBinding)).toEqual(
      { problem: { kind: "taken", command: "openSettings" } },
    );
  });

  it("refuses a shortcut without Mod, one the OS or the app menu use, and what is not a shortcut", () => {
    expect(changeKeybinding({}, "togglePanel", "KeyB")).toEqual({
      problem: { kind: "needsModifier" },
    });
    expect(changeKeybinding({}, "togglePanel", "Alt+F4")).toEqual({
      problem: { kind: "needsModifier" },
    });
    expect(changeKeybinding({}, "togglePanel", "Mod+KeyQ")).toEqual({
      problem: { kind: "reserved" },
    });
    expect(changeKeybinding({}, "togglePanel", "Shift+Mod+KeyZ")).toEqual({
      problem: { kind: "reserved" },
    });
    expect(changeKeybinding({}, "togglePanel", "Mod+")).toEqual({ problem: { kind: "invalid" } });
  });

  it("gives every command a usable default that no other command shares", () => {
    for (const id of commandIds) {
      expect(changeKeybinding({}, id, commands[id].defaultBinding)).toEqual({
        overrides: {},
        override: undefined,
      });
    }
  });
});

describe("keybindingKeys", () => {
  it("lists macOS symbols in Apple's order", () => {
    expect(keybindingKeys("Mod+KeyB", true)).toEqual(["⌘", "B"]);
    expect(keybindingKeys("Mod+Alt+Shift+KeyB", true)).toEqual(["⌥", "⇧", "⌘", "B"]);
  });

  it("spells modifiers out elsewhere", () => {
    expect(keybindingKeys("Mod+KeyB", false)).toEqual(["Ctrl", "B"]);
    expect(keybindingKeys("Mod+Alt+Shift+KeyB", false)).toEqual(["Ctrl", "Alt", "Shift", "B"]);
  });

  it("keeps a string it cannot read as one key", () => {
    expect(keybindingKeys("Hyper+KeyB", true)).toEqual(["Hyper+KeyB"]);
  });
});

describe("formatKeybinding", () => {
  it("shows macOS symbols in Apple's order", () => {
    expect(formatKeybinding("Mod+KeyB", true)).toBe("⌘B");
    expect(formatKeybinding("Mod+Alt+Shift+KeyB", true)).toBe("⌥⇧⌘B");
  });

  it("spells modifiers out elsewhere", () => {
    expect(formatKeybinding("Mod+KeyB", false)).toBe("Ctrl+B");
    expect(formatKeybinding("Mod+Alt+Shift+KeyB", false)).toBe("Ctrl+Alt+Shift+B");
  });

  it("names digits, punctuation and other keys", () => {
    expect(formatKeybinding("Mod+Digit1", false)).toBe("Ctrl+1");
    expect(formatKeybinding("Mod+Comma", true)).toBe("⌘,");
    expect(formatKeybinding("Mod+ArrowUp", true)).toBe("⌘↑");
    expect(formatKeybinding("Mod+F5", false)).toBe("Ctrl+F5");
  });
});
