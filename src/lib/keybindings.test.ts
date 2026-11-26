import { describe, expect, it } from 'vitest'
import {
  commands,
  defaultKeybindings,
  formatKeybinding,
  keybindingFromEvent,
  keybindingKeys,
  keybindingProblem,
  matchesKeybinding,
  normalizeKeybinding,
  sanitizeKeybindings,
} from './keybindings'

function press(code: string, modifiers: KeyboardEventInit = {}) {
  return new KeyboardEvent('keydown', { code, ...modifiers })
}

describe('normalizeKeybinding', () => {
  it('puts modifiers in a fixed order', () => {
    expect(normalizeKeybinding('Shift+Mod+KeyB')).toBe('Mod+Shift+KeyB')
    expect(normalizeKeybinding('Alt+Shift+Mod+Comma')).toBe('Mod+Alt+Shift+Comma')
  })

  it('rejects what is not a shortcut', () => {
    for (const binding of [
      '',
      'Mod+',
      'Ctrl+KeyB',
      'Mod+ShiftLeft',
      'Mod+b',
      'Mod+Key B',
    ])
      expect(normalizeKeybinding(binding)).toBeUndefined()
  })
})

describe('keybindingFromEvent', () => {
  it('reads ⌘ as Mod on macOS and Ctrl as Mod elsewhere', () => {
    expect(keybindingFromEvent(press('KeyB', { metaKey: true }), true)).toBe('Mod+KeyB')
    expect(keybindingFromEvent(press('KeyB', { ctrlKey: true }), false)).toBe('Mod+KeyB')
  })

  it('refuses the modifier a shortcut cannot hold: Ctrl on macOS, the Windows/Super key elsewhere', () => {
    expect(keybindingFromEvent(press('KeyB', { ctrlKey: true }), true)).toBeUndefined()
    expect(keybindingFromEvent(press('KeyB', { metaKey: true }), false)).toBeUndefined()
  })

  it('uses the physical key, so ⌥ combos on macOS work', () => {
    const event = new KeyboardEvent('keydown', {
      code: 'KeyB',
      key: '∫',
      metaKey: true,
      altKey: true,
    })
    expect(keybindingFromEvent(event, true)).toBe('Mod+Alt+KeyB')
  })

  it('ignores a modifier pressed on its own', () => {
    expect(keybindingFromEvent(press('MetaLeft', { metaKey: true }), true)).toBeUndefined()
    expect(keybindingFromEvent(press('ShiftRight', { shiftKey: true }), false)).toBeUndefined()
  })
})

describe('matchesKeybinding', () => {
  it('matches the exact modifiers only', () => {
    expect(matchesKeybinding(press('KeyB', { metaKey: true }), 'Mod+KeyB', true)).toBe(true)
    expect(matchesKeybinding(press('KeyB', { metaKey: true, shiftKey: true }), 'Mod+KeyB', true)).toBe(false)
    expect(matchesKeybinding(press('KeyB', { metaKey: true, ctrlKey: true }), 'Mod+KeyB', true)).toBe(false)
    expect(matchesKeybinding(press('KeyB'), 'Mod+KeyB', true)).toBe(false)
  })
})

describe('keybindingProblem', () => {
  const bindings = { first: 'Mod+KeyB', second: 'Mod+KeyJ' }

  it('requires Mod', () => {
    expect(keybindingProblem('KeyB', 'first', bindings)).toEqual({ kind: 'needsModifier' })
    expect(keybindingProblem('Alt+F4', 'first', bindings)).toEqual({ kind: 'needsModifier' })
  })

  it('refuses shortcuts the OS or the app menu use', () => {
    expect(keybindingProblem('Mod+KeyQ', 'first', bindings)).toEqual({ kind: 'reserved' })
    expect(keybindingProblem('Shift+Mod+KeyZ', 'first', bindings)).toEqual({ kind: 'reserved' })
  })

  it('refuses a shortcut another command uses, naming it', () => {
    expect(keybindingProblem('Mod+KeyJ', 'first', bindings)).toEqual({ kind: 'taken', command: 'second' })
  })

  it('accepts a free shortcut, and the command\'s own', () => {
    expect(keybindingProblem('Mod+Shift+KeyK', 'first', bindings)).toBeUndefined()
    expect(keybindingProblem('Mod+KeyB', 'first', bindings)).toBeUndefined()
  })

  it('refuses what is not a shortcut', () => {
    expect(keybindingProblem('Mod+', 'first', bindings)).toEqual({ kind: 'invalid' })
  })
})

describe('defaults', () => {
  it('gives every command a usable default that no other command shares', () => {
    const bindings = defaultKeybindings()
    for (const [id, command] of Object.entries(commands))
      expect(keybindingProblem(command.defaultBinding, id, bindings)).toBeUndefined()
  })
})

describe('sanitizeKeybindings', () => {
  it('keeps a usable override, normalized', () => {
    expect(sanitizeKeybindings({ togglePanel: 'Shift+Mod+KeyK' })).toEqual({ togglePanel: 'Mod+Shift+KeyK' })
  })

  it('drops unknown commands, defaults, and shortcuts that are invalid or refused', () => {
    expect(sanitizeKeybindings({ unknown: 'Mod+KeyK' })).toEqual({})
    expect(sanitizeKeybindings({ togglePanel: 'Mod+KeyB' })).toEqual({})
    expect(sanitizeKeybindings({ togglePanel: 'KeyK' })).toEqual({})
    expect(sanitizeKeybindings({ togglePanel: 'Mod+KeyQ' })).toEqual({})
    expect(sanitizeKeybindings({ togglePanel: 42 })).toEqual({})
  })

  it('treats anything but an object as no overrides', () => {
    for (const saved of [
      undefined,
      null,
      'Mod+KeyK',
      ['Mod+KeyK'],
    ])
      expect(sanitizeKeybindings(saved)).toEqual({})
  })
})

describe('keybindingKeys', () => {
  it('lists macOS symbols in Apple\'s order', () => {
    expect(keybindingKeys('Mod+KeyB', true)).toEqual(['⌘', 'B'])
    expect(keybindingKeys('Mod+Alt+Shift+KeyB', true)).toEqual(['⌥', '⇧', '⌘', 'B'])
  })

  it('spells modifiers out elsewhere', () => {
    expect(keybindingKeys('Mod+KeyB', false)).toEqual(['Ctrl', 'B'])
    expect(keybindingKeys('Mod+Alt+Shift+KeyB', false)).toEqual(['Ctrl', 'Alt', 'Shift', 'B'])
  })

  it('keeps a string it cannot read as one key', () => {
    expect(keybindingKeys('Hyper+KeyB', true)).toEqual(['Hyper+KeyB'])
  })
})

describe('formatKeybinding', () => {
  it('shows macOS symbols in Apple\'s order', () => {
    expect(formatKeybinding('Mod+KeyB', true)).toBe('⌘B')
    expect(formatKeybinding('Mod+Alt+Shift+KeyB', true)).toBe('⌥⇧⌘B')
  })

  it('spells modifiers out elsewhere', () => {
    expect(formatKeybinding('Mod+KeyB', false)).toBe('Ctrl+B')
    expect(formatKeybinding('Mod+Alt+Shift+KeyB', false)).toBe('Ctrl+Alt+Shift+B')
  })

  it('names digits, punctuation and other keys', () => {
    expect(formatKeybinding('Mod+Digit1', false)).toBe('Ctrl+1')
    expect(formatKeybinding('Mod+Comma', true)).toBe('⌘,')
    expect(formatKeybinding('Mod+ArrowUp', true)).toBe('⌘↑')
    expect(formatKeybinding('Mod+F5', false)).toBe('Ctrl+F5')
  })
})
