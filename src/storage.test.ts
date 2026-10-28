import { describe, expect, it } from 'vitest'
import { defaultState, pickNextKey, validate } from './storage'

describe('storage', () => {
  it('rejects malformed imports and drops unknown keys', () => {
    expect(validate(null)).toBeNull()
    expect(validate({ version: 2 })).toBeNull()
    const s = validate({ version: 1, studyKeys: ['G-major', 'H-major'], currentKey: 'nope', bpm: 999, history: [{}] })
    expect(s?.studyKeys).toEqual(['G-major'])
    expect(s?.currentKey).toBe('G-major')
    expect(s?.bpm).toBe(70)
    expect(s?.history).toEqual([])
  })

  it('never repeats the current key and favors keys that needed reveals', () => {
    const state = {
      ...defaultState(),
      studyKeys: ['G-major', 'C-major', 'D-major'],
      currentKey: 'G-major',
      history: Array.from({ length: 5 }, () => ({
        at: '',
        key: 'D-major',
        step: 'notes' as const,
        rating: 'reveal' as const,
      })),
    }
    // Weights: C-major = 1, D-major = 11.
    expect(pickNextKey(state, () => 0)).toBe('C-major')
    expect(pickNextKey(state, () => 0.5)).toBe('D-major')
    expect(pickNextKey(state, () => 0.999)).toBe('D-major')
  })
})
