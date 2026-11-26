import { describe, expect, it } from 'vitest'
import { describeError } from './log'

describe('describeError', () => {
  it('keeps the message alone when there is no cause', () => {
    expect(describeError('Could not save')).toBe('Could not save')
  })

  it('adds an error\'s stack', () => {
    const error = new Error('disk full')
    expect(describeError('Could not save', error)).toBe(`Could not save: ${error.stack}`)
  })

  it('adds a command error as JSON', () => {
    expect(describeError('Could not save', { kind: 'io', message: 'disk full' }))
      .toBe('Could not save: {"kind":"io","message":"disk full"}')
  })

  it('falls back to text when the cause cannot be JSON', () => {
    const cyclic: Record<string, unknown> = {}
    cyclic.self = cyclic
    expect(describeError('Could not save', cyclic)).toBe('Could not save: [object Object]')
  })
})
