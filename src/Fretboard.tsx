import {
  STRING_NAMES,
  chordToneLabels,
  intervalLabel,
  midiAt,
  mod12,
  octavePairs,
  pitchClass,
  positionsOf,
  pretty,
  scale,
  spellInKey,
  type MusicalKey,
} from './theory'

export type Layer = 'hidden' | 'roots' | 'triad' | 'scale'
export type LabelMode = 'names' | 'degrees'

interface Props {
  musicalKey: MusicalKey
  chord: string[]
  minFret: number
  maxFret: number
  layer: Layer
  labelMode: LabelMode
  showOctaves: boolean
  /** Treat the chord's root as "the root" in every layer (used when following chord changes). */
  followChord?: boolean
  tapped: Set<string>
  onTap: (spot: string) => void
}

const FRETS = 15
const NUT_X = 44
const FRET_W = 58
const TOP = 22
const ROW_H = 34
const WIDTH = NUT_X + FRETS * FRET_W + 16
const HEIGHT = TOP + ROW_H * 5 + 44
const MARKERS = [3, 5, 7, 9, 12, 15]

const stringY = (s: number) => TOP + (5 - s) * ROW_H
const spotX = (f: number) => (f === 0 ? NUT_X - 22 : NUT_X + (f - 0.5) * FRET_W)

export function Fretboard({
  musicalKey,
  chord,
  minFret,
  maxFret,
  layer,
  labelMode,
  showOctaves,
  followChord = false,
  tapped,
  onTap,
}: Props) {
  const tonicPc = pitchClass(musicalKey.tonic)
  const chordPcs = chord.map(pitchClass)
  const chordLabels = chordToneLabels(chord)
  const scalePcs = scale(musicalKey).map(pitchClass)
  const rootPc = layer === 'triad' || followChord ? chordPcs[0] : tonicPc

  const visiblePcs = new Set<number>(
    layer === 'roots' ? [rootPc] : layer === 'triad' ? chordPcs : layer === 'scale' ? scalePcs : [],
  )

  const label = (pc: number) => {
    if (labelMode === 'names') return pretty(spellInKey(musicalKey, pc))
    if (layer === 'triad' && chordPcs.includes(pc)) return chordLabels[chordPcs.indexOf(pc)]
    return intervalLabel(tonicPc, pc)
  }

  const kind = (pc: number) =>
    pc === rootPc ? 'root' : chordPcs.includes(pc) && layer !== 'roots' ? 'chord' : 'scale'

  const windowX1 = minFret === 0 ? NUT_X - 40 : NUT_X + (minFret - 1) * FRET_W
  const windowX2 = NUT_X + maxFret * FRET_W

  const octaveLines =
    showOctaves && layer !== 'hidden' ? octavePairs(positionsOf(rootPc, minFret, maxFret)) : []

  const spots = []
  for (let s = 0; s < 6; s++) {
    for (let f = minFret; f <= maxFret; f++) {
      const pc = mod12(midiAt(s, f))
      const id = `${s}:${f}`
      const shown = visiblePcs.has(pc)
      const isTapped = tapped.has(id)
      const cls = shown ? `spot ${kind(pc)}` : isTapped ? 'spot tapped' : 'spot empty'
      spots.push(
        <g
          key={id}
          className={cls}
          onClick={() => onTap(id)}
          role="button"
          aria-label={shown || isTapped ? `${STRING_NAMES[s]} string fret ${f}: ${label(pc)}` : `${STRING_NAMES[s]} string fret ${f}`}
        >
          <circle cx={spotX(f)} cy={stringY(s)} r={14} />
          {(shown || isTapped) && (
            <text x={spotX(f)} y={stringY(s)} dy="0.35em" textAnchor="middle">
              {label(pc)}
            </text>
          )}
        </g>,
      )
    }
  }

  return (
    <div className="fretboard-scroll">
      <svg className="fretboard" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width={WIDTH} height={HEIGHT}>
        <rect className="window" x={windowX1} y={TOP - 18} width={windowX2 - windowX1} height={ROW_H * 5 + 36} rx={8} />
        {Array.from({ length: FRETS + 1 }, (_, f) => (
          <line
            key={f}
            className={f === 0 ? 'nut' : 'fret'}
            x1={NUT_X + f * FRET_W}
            x2={NUT_X + f * FRET_W}
            y1={TOP}
            y2={TOP + ROW_H * 5}
          />
        ))}
        {[0, 1, 2, 3, 4, 5].map((s) => (
          <g key={s}>
            <line className="string" x1={NUT_X} x2={NUT_X + FRETS * FRET_W} y1={stringY(s)} y2={stringY(s)} style={{ strokeWidth: 1 + (5 - s) * 0.35 }} />
            <text className="string-name" x={6} y={stringY(s)} dy="0.35em">
              {STRING_NAMES[s]}
            </text>
          </g>
        ))}
        {MARKERS.map((f) => (
          <text key={f} className={`fret-num${f === 12 ? ' octave' : ''}`} x={spotX(f)} y={TOP + ROW_H * 5 + 30} textAnchor="middle">
            {f === 12 ? '12 ••' : f}
          </text>
        ))}
        {octaveLines.map(([a, b]) => (
          <line
            key={`${a.string}:${a.fret}`}
            className="octave-line"
            x1={spotX(a.fret)}
            y1={stringY(a.string)}
            x2={spotX(b.fret)}
            y2={stringY(b.string)}
          />
        ))}
        {spots}
      </svg>
    </div>
  )
}
