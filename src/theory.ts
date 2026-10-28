export type Mode = 'major' | 'minor'

export interface MusicalKey {
  tonic: string
  mode: Mode
}

export type TriadQuality = 'major' | 'minor' | 'diminished' | 'augmented'

export interface DiatonicChord {
  degree: number
  roman: string
  name: string
  quality: TriadQuality
  notes: string[]
}

export interface FretPosition {
  string: number
  fret: number
  midi: number
  pc: number
}

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const NATURAL_PC = [0, 2, 4, 5, 7, 9, 11]
const STEPS: Record<Mode, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
}
const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
const INTERVAL_LABELS = ['1', '♭2', '2', '♭3', '3', '4', '♭5', '5', '♭6', '6', '♭7', '7']
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']

/** Standard tuning, low E (index 0) to high E (index 5), as MIDI numbers. */
export const TUNING_MIDI = [40, 45, 50, 55, 59, 64]
export const STRING_NAMES = ['E', 'A', 'D', 'G', 'B', 'e']

export const KEYS: MusicalKey[] = [
  ...['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'F', 'Bb', 'Eb', 'Ab', 'Db'].map(
    (tonic) => ({ tonic, mode: 'major' as const }),
  ),
  ...['A', 'E', 'B', 'F#', 'C#', 'G#', 'D', 'G', 'C', 'F', 'Bb', 'Eb'].map(
    (tonic) => ({ tonic, mode: 'minor' as const }),
  ),
]

export const mod12 = (n: number) => ((n % 12) + 12) % 12

export function parseNote(name: string) {
  const letterIndex = LETTERS.indexOf(name[0]?.toUpperCase() ?? '')
  if (letterIndex < 0) throw new Error(`Invalid note: ${name}`)
  let accidental = 0
  for (const c of name.slice(1)) {
    if (c === '#' || c === '♯') accidental++
    else if (c === 'b' || c === '♭') accidental--
    else throw new Error(`Invalid note: ${name}`)
  }
  return { letterIndex, accidental, pc: mod12(NATURAL_PC[letterIndex] + accidental) }
}

export const pitchClass = (name: string) => parseNote(name).pc

/** Spell a pitch class using a specific letter, adding sharps or flats as needed. */
export function spellNote(letterIndex: number, pc: number): string {
  const diff = mod12(pc - NATURAL_PC[letterIndex])
  const acc = diff > 6 ? diff - 12 : diff
  return LETTERS[letterIndex] + (acc > 0 ? '#'.repeat(acc) : 'b'.repeat(-acc))
}

/** Display form with ♯/♭ symbols (letters are always uppercase, so 'b' is unambiguous). */
export const pretty = (note: string) => note.replace(/#/g, '♯').replace(/b/g, '♭')

export const keyId = (key: MusicalKey) => `${key.tonic}-${key.mode}`
export const keyName = (key: MusicalKey) => `${pretty(key.tonic)} ${key.mode}`

export function keyFromId(id: string): MusicalKey | undefined {
  return KEYS.find((k) => keyId(k) === id)
}

export function scale(key: MusicalKey): string[] {
  const { letterIndex, pc } = parseNote(key.tonic)
  return STEPS[key.mode].map((step, i) => spellNote((letterIndex + i) % 7, mod12(pc + step)))
}

export function degreeLabels(mode: Mode): string[] {
  return STEPS[mode].map((step) => INTERVAL_LABELS[step])
}

export function intervalLabel(fromPc: number, toPc: number): string {
  return INTERVAL_LABELS[mod12(toPc - fromPc)]
}

export function triadOn(key: MusicalKey, degree = 0): string[] {
  const s = scale(key)
  return [s[degree % 7], s[(degree + 2) % 7], s[(degree + 4) % 7]]
}

export function triadQuality(notes: string[]): TriadQuality {
  const [root, third, fifth] = notes.map(pitchClass)
  const t = mod12(third - root)
  const f = mod12(fifth - root)
  if (t === 4 && f === 7) return 'major'
  if (t === 3 && f === 7) return 'minor'
  if (t === 3 && f === 6) return 'diminished'
  if (t === 4 && f === 8) return 'augmented'
  throw new Error(`Not a triad: ${notes.join(' ')}`)
}

/** Labels for each chord tone relative to its root, e.g. R 3 5 or R ♭3 5. */
export function chordToneLabels(notes: string[]): string[] {
  const root = pitchClass(notes[0])
  return notes.map((n, i) => (i === 0 ? 'R' : intervalLabel(root, pitchClass(n))))
}

export function diatonicChords(key: MusicalKey): DiatonicChord[] {
  return [0, 1, 2, 3, 4, 5, 6].map((degree) => {
    const notes = triadOn(key, degree)
    const quality = triadQuality(notes)
    const base = ROMAN[degree]
    const roman =
      quality === 'major'
        ? base
        : quality === 'minor'
          ? base.toLowerCase()
          : quality === 'diminished'
            ? `${base.toLowerCase()}°`
            : `${base}+`
    const suffix = { major: '', minor: 'm', diminished: '°', augmented: '+' }[quality]
    return { degree, roman, name: pretty(notes[0]) + suffix, quality, notes }
  })
}

export function relativeKey(key: MusicalKey): MusicalKey {
  const s = scale(key)
  return key.mode === 'major' ? { tonic: s[5], mode: 'minor' } : { tonic: s[2], mode: 'major' }
}

/** Degrees added to the tonic triad to form the key's pentatonic scale. */
export function pentatonicAdditions(key: MusicalKey): string[] {
  const s = scale(key)
  return key.mode === 'major' ? [s[1], s[5]] : [s[3], s[6]]
}

/** Name a pitch class as spelled in the key, or with the key's preferred accidental. */
export function spellInKey(key: MusicalKey, pc: number): string {
  const s = scale(key)
  const inKey = s.find((n) => pitchClass(n) === pc)
  if (inKey) return inKey
  const prefersFlats = s.some((n) => n.length > 1 && n.includes('b'))
  return (prefersFlats ? FLAT_NAMES : SHARP_NAMES)[pc]
}

export const midiAt = (string: number, fret: number) => TUNING_MIDI[string] + fret

export function positionsOf(pc: number, minFret: number, maxFret: number): FretPosition[] {
  const out: FretPosition[] = []
  for (let string = 0; string < 6; string++) {
    for (let fret = minFret; fret <= maxFret; fret++) {
      const midi = midiAt(string, fret)
      if (mod12(midi) === pc) out.push({ string, fret, midi, pc })
    }
  }
  return out
}

/** Octave pairs that skip one string (the common two-string octave shapes). */
export function octavePairs(positions: FretPosition[]): [FretPosition, FretPosition][] {
  const pairs: [FretPosition, FretPosition][] = []
  for (const a of positions) {
    for (const b of positions) {
      if (b.string === a.string + 2 && b.midi === a.midi + 12) pairs.push([a, b])
    }
  }
  return pairs
}
