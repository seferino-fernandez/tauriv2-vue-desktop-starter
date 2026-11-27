/**
 * Keyboard shortcuts: the commands they run, and how a shortcut is stored, matched, checked
 * and shown.
 *
 * A shortcut is stored as a string such as `Mod+Shift+KeyB`: optional `Mod`, `Alt` and `Shift`
 * in that order, then a physical key as `KeyboardEvent.code` names it. `Mod` is ⌘ on macOS and
 * Ctrl on Windows and Linux, so one saved shortcut works on every platform. Keys match by their
 * position, so ⌥ combos on macOS and non-Latin layouts work; on Dvorak or AZERTY the key is the
 * one in the QWERTY position.
 */

export interface Command {
  /** i18n key of the command's name, shown in settings and tooltips */
  titleKey: string;
  defaultBinding: string;
}

/**
 * Every command a shortcut can run. Add one here, then handle it in AppShell's table, or give a
 * route `meta.command` to make it a command that opens that page.
 */
export const commands = {
  togglePanel: { titleKey: "commands.togglePanel", defaultBinding: "Mod+KeyB" },
  // The macOS app menu's Settings… item runs it too (src-tauri/src/menu.rs mirrors its id and default)
  openSettings: { titleKey: "commands.openSettings", defaultBinding: "Mod+Comma" },
  openCommandPalette: { titleKey: "commands.openCommandPalette", defaultBinding: "Mod+Shift+KeyP" },
} as const satisfies Record<string, Command>;

export type CommandId = keyof typeof commands;

export function isCommandId(id: string): id is CommandId {
  return Object.hasOwn(commands, id);
}

export const commandIds = Object.keys(commands).filter(isCommandId);

/** Every command's shortcut */
export type Keybindings = Record<CommandId, string>;

/** Shortcuts the user changed; the rest use their default */
export type KeybindingOverrides = Partial<Keybindings>;

/** Shortcuts the OS or the app menu already use; a command cannot take them */
export const RESERVED_KEYBINDINGS: ReadonlyArray<string> = [
  "Mod+KeyQ", // quit
  "Mod+KeyW", // close the window
  "Mod+KeyH", // hide (macOS)
  "Mod+Alt+KeyH", // hide others (macOS)
  "Mod+KeyM", // minimize (macOS)
  "Mod+KeyC", // copy
  "Mod+KeyV", // paste
  "Mod+KeyX", // cut
  "Mod+KeyA", // select all
  "Mod+KeyZ", // undo
  "Mod+Shift+KeyZ", // redo
  "Mod+KeyR", // reload (dev builds)
];

interface Combo {
  mod: boolean;
  alt: boolean;
  shift: boolean;
  code: string;
}

const MODIFIER_CODE = /^(?:Meta|Control|Alt|Shift|OS)(?:Left|Right)?$|^(?:CapsLock|Fn|FnLock)$/;
const KEY_CODE = /^[A-Z][A-Za-z0-9]*$/;

/** Whether a `KeyboardEvent.code` is a modifier key on its own (⌘, Ctrl, Shift, ...) */
export function isModifierCode(code: string): boolean {
  return MODIFIER_CODE.test(code);
}

function parse(binding: string): Combo | undefined {
  const parts = binding.split("+");
  const code = parts.pop();
  if (!code || !KEY_CODE.test(code) || isModifierCode(code)) {
    return undefined;
  }
  const combo: Combo = {
    mod: false,
    alt: false,
    shift: false,
    code,
  };
  for (const part of parts) {
    if (part === "Mod") {
      combo.mod = true;
    } else if (part === "Alt") {
      combo.alt = true;
    } else if (part === "Shift") {
      combo.shift = true;
    } else {
      return undefined;
    }
  }
  return combo;
}

function stringify({ mod, alt, shift, code }: Combo): string {
  return [mod && "Mod", alt && "Alt", shift && "Shift", code].filter(Boolean).join("+");
}

/** The stored form of a shortcut string, or `undefined` if it is not one */
export function normalizeKeybinding(binding: string): string | undefined {
  const combo = parse(binding);
  return combo && stringify(combo);
}

/**
 * The shortcut a key press makes, or `undefined` for a modifier pressed on its own and for
 * combos a shortcut cannot hold: Ctrl on macOS, or the Windows/Super key elsewhere.
 */
export function keybindingFromEvent(event: KeyboardEvent, mac: boolean): string | undefined {
  if (!event.code || isModifierCode(event.code)) {
    return undefined;
  }
  if (mac ? event.ctrlKey : event.metaKey) {
    return undefined;
  }
  return stringify({
    mod: mac ? event.metaKey : event.ctrlKey,
    alt: event.altKey,
    shift: event.shiftKey,
    code: event.code,
  });
}

/** Whether a key press is exactly this shortcut: no more modifiers, no fewer */
export function matchesKeybinding(event: KeyboardEvent, binding: string, mac: boolean): boolean {
  const pressed = keybindingFromEvent(event, mac);
  return pressed !== undefined && pressed === normalizeKeybinding(binding);
}

export type KeybindingProblem =
  | { kind: "invalid" }
  | { kind: "needsModifier" }
  | { kind: "reserved" }
  | { kind: "taken"; command: string };

/**
 * Why `command` cannot use `binding`, or `undefined` if it can. A shortcut needs `Mod`,
 * cannot be reserved, and cannot belong to another command in `bindings`.
 */
function keybindingProblem(
  binding: string,
  command: string,
  bindings: Readonly<Record<string, string>>,
): KeybindingProblem | undefined {
  const combo = parse(binding);
  if (!combo) {
    return { kind: "invalid" };
  }
  if (!combo.mod) {
    return { kind: "needsModifier" };
  }
  const normalized = stringify(combo);
  if (RESERVED_KEYBINDINGS.includes(normalized)) {
    return { kind: "reserved" };
  }
  const owner = Object.keys(bindings).find(
    (other) => other !== command && normalizeKeybinding(bindings[other]) === normalized,
  );
  return owner ? { kind: "taken", command: owner } : undefined;
}

export function defaultKeybindings(): Keybindings {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- fromEntries can't keep the keys, and commandIds has them all
  return Object.fromEntries(
    commandIds.map((id) => [id, commands[id].defaultBinding]),
  ) as Keybindings;
}

/** Saved overrides as they load: the ones that apply, and the saved ones to delete */
export interface LoadedKeybindings {
  overrides: KeybindingOverrides;
  /** App commands whose saved override does not apply, so it should be deleted */
  deleted: Array<string>;
}

/**
 * The overrides that apply from what was saved. They are checked as one set, so any set the
 * settings let the user save loads back as it was.
 */
export function loadKeybindingOverrides(
  saved: Readonly<Record<string, string>>,
): LoadedKeybindings {
  const overrides: KeybindingOverrides = {};
  const deleted: Array<string> = [];
  for (const [command, value] of Object.entries(saved)) {
    const binding = normalizeKeybinding(value);
    if (isCommandId(command) && binding && binding !== commands[command].defaultBinding) {
      overrides[command] = binding;
    } else {
      deleted.push(command);
    }
  }
  // A default never clashes with another default, so dropping overrides always ends
  for (;;) {
    const bindings: Keybindings = { ...defaultKeybindings(), ...overrides };
    const clashing = Object.keys(overrides)
      .filter(isCommandId)
      .filter((command) => keybindingProblem(bindings[command], command, bindings));
    if (clashing.length === 0) {
      return { overrides, deleted };
    }
    for (const command of clashing) {
      delete overrides[command];
      deleted.push(command);
    }
  }
}

/**
 * What giving a command a shortcut comes to: why it cannot have it, or else the overrides after
 * it and the command's override to save, `undefined` when it is back on its default and its
 * saved override should be deleted
 */
export type KeybindingChange =
  | { problem: KeybindingProblem }
  | { problem?: undefined; overrides: KeybindingOverrides; override: string | undefined };

/**
 * Gives `command` the shortcut `binding`, unless the shortcut is refused. Resetting a command
 * is giving it its default, which is refused too while another command has it.
 */
export function changeKeybinding(
  overrides: Readonly<KeybindingOverrides>,
  command: CommandId,
  binding: string,
): KeybindingChange {
  const problem = keybindingProblem(binding, command, { ...defaultKeybindings(), ...overrides });
  const normalized = normalizeKeybinding(binding);
  if (problem || !normalized) {
    // A shortcut without a problem always normalizes
    return { problem: problem ?? { kind: "invalid" } };
  }
  const { [command]: _, ...others } = overrides;
  if (normalized === commands[command].defaultBinding) {
    return { overrides: others, override: undefined };
  }
  return { overrides: { ...others, [command]: normalized }, override: normalized };
}

const KEY_LABELS = new Map([
  ["Backquote", "`"],
  ["Backslash", "\\"],
  ["BracketLeft", "["],
  ["BracketRight", "]"],
  ["Comma", ","],
  ["Equal", "="],
  ["Minus", "-"],
  ["Period", "."],
  ["Quote", "'"],
  ["Semicolon", ";"],
  ["Slash", "/"],
  ["ArrowDown", "↓"],
  ["ArrowLeft", "←"],
  ["ArrowRight", "→"],
  ["ArrowUp", "↑"],
  ["Escape", "Esc"],
]);

function keyLabel(code: string): string {
  const match = /^(?:Key|Digit)(\w)$/.exec(code) ?? /^Numpad(\d)$/.exec(code);
  return match ? match[1] : (KEY_LABELS.get(code) ?? code);
}

/**
 * A shortcut's keys in the order the platform shows them: `['⌥', '⇧', '⌘', 'B']` on macOS,
 * `['Ctrl', 'Alt', 'Shift', 'B']` elsewhere
 */
export function keybindingKeys(binding: string, mac: boolean): Array<string> {
  const combo = parse(binding);
  if (!combo) {
    return [binding];
  }
  const modifiers = mac
    ? [combo.alt && "⌥", combo.shift && "⇧", combo.mod && "⌘"]
    : [combo.mod && "Ctrl", combo.alt && "Alt", combo.shift && "Shift"];
  return [...modifiers.filter((modifier) => modifier !== false), keyLabel(combo.code)];
}

/** A shortcut the way the platform shows it: `⌥⇧⌘B` on macOS, `Ctrl+Alt+Shift+B` elsewhere */
export function formatKeybinding(binding: string, mac: boolean): string {
  return keybindingKeys(binding, mac).join(mac ? "" : "+");
}
