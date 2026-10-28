import { describe, expect, it } from 'vitest'
import {
  diatonicChords,
  octavePairs,
  pentatonicAdditions,
  pitchClass,
  positionsOf,
  relativeKey,
  scale,
  spellInKey,
  triadOn,
} from './theory'

describe('scale spelling', () => {
  it('spells major keys with one letter per degree', () => {
    expect(scale({ tonic: 'G', mode: 'major' })).toEqual(['G', 'A', 'B', 'C', 'D', 'E', 'F#'])
    expect(scale({ tonic: 'F#', mode: 'major' })).toEqual(['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#'])
    expect(scale({ tonic: 'Db', mode: 'major' })).toEqual(['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C'])
  })

  it('spells natural minor keys', () => {
    expect(scale({ tonic: 'E', mode: 'minor' })).toEqual(['E', 'F#', 'G', 'A', 'B', 'C', 'D'])
    expect(scale({ tonic: 'D', mode: 'minor' })).toEqual(['D', 'E', 'F', 'G', 'A', 'Bb', 'C'])
    expect(scale({ tonic: 'G#', mode: 'minor' })).toEqual(['G#', 'A#', 'B', 'C#', 'D#', 'E', 'F#'])
  })

  it('uses the key preference for notes outside the key', () => {
    expect(spellInKey({ tonic: 'F', mode: 'major' }, pitchClass('G#'))).toBe('Ab')
    expect(spellInKey({ tonic: 'G', mode: 'major' }, pitchClass('Ab'))).toBe('G#')
  })
})

describe('chords and relationships', () => {
  it('builds tonic triads', () => {
    expect(triadOn({ tonic: 'G', mode: 'major' })).toEqual(['G', 'B', 'D'])
    expect(triadOn({ tonic: 'E', mode: 'minor' })).toEqual(['E', 'G', 'B'])
  })

  it('finds relative keys in both directions', () => {
    expect(relativeKey({ tonic: 'G', mode: 'major' })).toEqual({ tonic: 'E', mode: 'minor' })
    expect(relativeKey({ tonic: 'C', mode: 'minor' })).toEqual({ tonic: 'Eb', mode: 'major' })
  })

  it('labels diatonic chord qualities', () => {
    const major = diatonicChords({ tonic: 'G', mode: 'major' })
    expect(major.map((c) => c.roman)).toEqual(['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'])
    expect(major.map((c) => c.name)).toEqual(['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F♯°'])
    const minor = diatonicChords({ tonic: 'A', mode: 'minor' })
    expect(minor.map((c) => c.roman)).toEqual(['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'])
  })

  it('builds pentatonic additions', () => {
    expect(pentatonicAdditions({ tonic: 'G', mode: 'major' })).toEqual(['A', 'E'])
    expect(pentatonicAdditions({ tonic: 'A', mode: 'minor' })).toEqual(['D', 'G'])
  })
})

describe('fretboard', () => {
  it('finds every G between frets 3 and 7', () => {
    const found = positionsOf(pitchClass('G'), 3, 7).map((p) => `${p.string}:${p.fret}`)
    expect(found).toEqual(['0:3', '2:5', '5:3'])
  })

  it('pairs octaves that skip a string, accounting for the B string', () => {
    const pairs = octavePairs(positionsOf(pitchClass('G'), 0, 12))
    const shapes = pairs.map(([a, b]) => `${a.string}:${a.fret}->${b.string}:${b.fret}`)
    expect(shapes).toContain('0:3->2:5')
    expect(shapes).toContain('2:5->4:8')
    expect(shapes).toContain('3:0->5:3')
  })
})
