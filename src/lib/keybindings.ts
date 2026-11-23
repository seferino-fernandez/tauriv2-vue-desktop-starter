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
  titleKey: string
  defaultBinding: string
}

/** Every command a shortcut can run. Add one here, then handle it with `useKeybindings`. */
export const commands = {
  togglePanel: { titleKey: 'commands.togglePanel', defaultBinding: 'Mod+KeyB' },
} as const satisfies Record<string, Command>

export type CommandId = keyof typeof commands

export const commandIds = Object.keys(commands) as CommandId[]

/** Every command's shortcut */
export type Keybindings = Record<CommandId, string>

/** Shortcuts the user changed; the rest use their default */
export type KeybindingOverrides = Partial<Keybindings>

/** Shortcuts the OS or the app menu already use; a command cannot take them */
export const RESERVED_KEYBINDINGS: readonly string[] = [
  'Mod+KeyQ', // quit
  'Mod+KeyW', // close the window
  'Mod+KeyH', // hide (macOS)
  'Mod+Alt+KeyH', // hide others (macOS)
  'Mod+KeyM', // minimize (macOS)
  'Mod+KeyC', // copy
  'Mod+KeyV', // paste
  'Mod+KeyX', // cut
  'Mod+KeyA', // select all
  'Mod+KeyZ', // undo
  'Mod+Shift+KeyZ', // redo
  'Mod+Comma', // settings, by convention
  'Mod+KeyR', // reload (dev builds)
]

interface Combo {
  mod: boolean
  alt: boolean
  shift: boolean
  code: string
}

const MODIFIER_CODE = /^(?:Meta|Control|Alt|Shift|OS)(?:Left|Right)?$|^(?:CapsLock|Fn|FnLock)$/
const KEY_CODE = /^[A-Z][A-Za-z0-9]*$/

/** Whether a `KeyboardEvent.code` is a modifier key on its own (⌘, Ctrl, Shift, ...) */
export function isModifierCode(code: string): boolean {
  return MODIFIER_CODE.test(code)
}

function parse(binding: string): Combo | undefined {
  const parts = binding.split('+')
  const code = parts.pop()
  if (!code || !KEY_CODE.test(code) || isModifierCode(code))
    return undefined
  const combo: Combo = {
    mod: false,
    alt: false,
    shift: false,
    code,
  }
  for (const part of parts) {
    if (part === 'Mod')
      combo.mod = true
    else if (part === 'Alt')
      combo.alt = true
    else if (part === 'Shift')
      combo.shift = true
    else
      return undefined
  }
  return combo
}

function stringify({ mod, alt, shift, code }: Combo): string {
  return [
    mod && 'Mod',
    alt && 'Alt',
    shift && 'Shift',
    code,
  ].filter(Boolean).join('+')
}

/** The stored form of a shortcut string, or `undefined` if it is not one */
export function normalizeKeybinding(binding: string): string | undefined {
  const combo = parse(binding)
  return combo && stringify(combo)
}

/**
 * The shortcut a key press makes, or `undefined` for a modifier pressed on its own and for
 * combos a shortcut cannot hold: Ctrl on macOS, or the Windows/Super key elsewhere.
 */
export function keybindingFromEvent(event: KeyboardEvent, mac: boolean): string | undefined {
  if (!event.code || isModifierCode(event.code))
    return undefined
  if (mac ? event.ctrlKey : event.metaKey)
    return undefined
  return stringify({
    mod: mac ? event.metaKey : event.ctrlKey,
    alt: event.altKey,
    shift: event.shiftKey,
    code: event.code,
  })
}

/** Whether a key press is exactly this shortcut: no more modifiers, no fewer */
export function matchesKeybinding(event: KeyboardEvent, binding: string, mac: boolean): boolean {
  const pressed = keybindingFromEvent(event, mac)
  return pressed !== undefined && pressed === normalizeKeybinding(binding)
}

export type KeybindingProblem
  = | { kind: 'invalid' }
    | { kind: 'needsModifier' }
    | { kind: 'reserved' }
    | { kind: 'taken', command: string }

/**
 * Why `command` cannot use `binding`, or `undefined` if it can. A shortcut needs `Mod`,
 * cannot be reserved, and cannot belong to another command in `bindings`.
 */
export function keybindingProblem(
  binding: string,
  command: string,
  bindings: Readonly<Record<string, string>>,
): KeybindingProblem | undefined {
  const combo = parse(binding)
  if (!combo)
    return { kind: 'invalid' }
  if (!combo.mod)
    return { kind: 'needsModifier' }
  const normalized = stringify(combo)
  if (RESERVED_KEYBINDINGS.includes(normalized))
    return { kind: 'reserved' }
  const owner = Object.keys(bindings)
    .find(other => other !== command && normalizeKeybinding(bindings[other]!) === normalized)
  return owner
    ? { kind: 'taken', command: owner }
    : undefined
}

export function defaultKeybindings(): Keybindings {
  return Object.fromEntries(
    commandIds.map(id => [id, commands[id].defaultBinding]),
  ) as Keybindings
}

/**
 * The overrides worth keeping from saved settings: known commands with a usable shortcut that
 * differs from the default. Anything else (from an older version, or edited by hand) is dropped,
 * so that command falls back to its default.
 */
export function sanitizeKeybindings(saved: unknown): KeybindingOverrides {
  if (typeof saved !== 'object' || saved === null)
    return {}
  const bindings = defaultKeybindings()
  const overrides: KeybindingOverrides = {}
  for (const id of commandIds) {
    const value = (saved as Record<string, unknown>)[id]
    const binding = typeof value === 'string'
      ? normalizeKeybinding(value)
      : undefined
    if (!binding || binding === commands[id].defaultBinding || keybindingProblem(binding, id, bindings))
      continue
    bindings[id] = binding
    overrides[id] = binding
  }
  return overrides
}

const KEY_LABELS: Record<string, string> = {
  Backquote: '`',
  Backslash: '\\',
  BracketLeft: '[',
  BracketRight: ']',
  Comma: ',',
  Equal: '=',
  Minus: '-',
  Period: '.',
  Quote: '\'',
  Semicolon: ';',
  Slash: '/',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  Escape: 'Esc',
}

function keyLabel(code: string): string {
  const match = /^(?:Key|Digit)(\w)$/.exec(code) ?? /^Numpad(\d)$/.exec(code)
  return match
    ? match[1]!
    : KEY_LABELS[code] ?? code
}

/** A shortcut the way the platform shows it: `⌥⇧⌘B` on macOS, `Ctrl+Alt+Shift+B` elsewhere */
export function formatKeybinding(binding: string, mac: boolean): string {
  const combo = parse(binding)
  if (!combo)
    return binding
  const key = keyLabel(combo.code)
  if (mac)
    return `${combo.alt ? '⌥' : ''}${combo.shift ? '⇧' : ''}${combo.mod ? '⌘' : ''}${key}`
  return [
    combo.mod && 'Ctrl',
    combo.alt && 'Alt',
    combo.shift && 'Shift',
    key,
  ].filter(Boolean).join('+')
}
