import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { buildExercises } from './exercises'
import { Fretboard, type LabelMode, type Layer } from './Fretboard'
import { useMetronome } from './metronome'
import { load, pickNextKey, save, summarize, validate, type Rating, type SavedState } from './storage'
import {
  KEYS,
  degreeLabels,
  diatonicChords,
  chordToneLabels,
  keyFromId,
  keyId,
  keyName,
  mod12,
  pitchClass,
  pretty,
  relativeKey,
  scale,
  triadOn,
} from './theory'

const PROGRESSION = [0, 3, 0, 4]
const WINDOW = 4

type Reveal = 'notes' | 'triad' | 'relative' | 'relTriad' | 'chords'

function defaultStartFret(tonic: string) {
  const lowEFret = mod12(pitchClass(tonic) - 4)
  return Math.max(0, Math.min(11, lowEFret - 1))
}

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent))

export default function App() {
  const [saved, setSaved] = useState<SavedState>(load)
  const key = keyFromId(saved.currentKey) ?? KEYS[0]
  const [stepIndex, setStepIndex] = useState(0)
  const [startFret, setStartFret] = useState(() => defaultStartFret(key.tonic))
  const [wholeNeck, setWholeNeck] = useState(false)
  const [layer, setLayer] = useState<Layer>('hidden')
  const [labelMode, setLabelMode] = useState<LabelMode>('names')
  const [showOctaves, setShowOctaves] = useState(true)
  const [reveals, setReveals] = useState<Set<Reveal>>(new Set())
  const [tapped, setTapped] = useState<Set<string>>(new Set())
  const [chordDegree, setChordDegree] = useState(0)
  const [flash, setFlash] = useState<string | null>(null)
  const importRef = useRef<HTMLInputElement>(null)
  const metronome = useMetronome(saved.bpm)

  useEffect(() => save(saved), [saved])

  const minFret = wholeNeck ? 0 : startFret
  const maxFret = wholeNeck ? 15 : startFret + WINDOW
  const area = wholeNeck ? 'the whole neck (frets 0–15)' : `frets ${minFret}–${maxFret}`
  const exercises = useMemo(() => buildExercises(key, area), [key, area])
  const step = exercises[stepIndex]
  const chords = useMemo(() => diatonicChords(key), [key])
  const notes = scale(key)
  const degrees = degreeLabels(key.mode)
  const tonicTriad = triadOn(key)
  const rel = relativeKey(key)
  const relTriad = triadOn(rel)

  const tick = metronome.tick
  const followingLoop = step.id === 'changes' && metronome.running && tick && tick.bar >= 0
  const activeDegree = followingLoop ? PROGRESSION[tick.bar % PROGRESSION.length] : chordDegree
  const fretboardChord = step.id === 'changes' ? chords[activeDegree].notes : tonicTriad

  const update = (patch: Partial<SavedState>) => setSaved((s) => ({ ...s, ...patch }))

  const changeKey = (id: string) => {
    const next = keyFromId(id)
    if (!next) return
    update({ currentKey: id })
    setStartFret(defaultStartFret(next.tonic))
    setStepIndex(0)
    setLayer('hidden')
    setReveals(new Set())
    setTapped(new Set())
    setChordDegree(0)
  }

  const goToStep = (i: number) => {
    setStepIndex(i)
    setLayer('hidden')
    setTapped(new Set())
  }

  const rate = (rating: Rating) => {
    setSaved((s) => ({
      ...s,
      history: [...s.history, { at: new Date().toISOString(), key: keyId(key), step: step.id, rating }],
    }))
    if (stepIndex < exercises.length - 1) {
      goToStep(stepIndex + 1)
    } else {
      setFlash(`Session complete for ${keyName(key)}. Pick the next key when you're ready.`)
    }
  }

  const toggleReveal = (r: Reveal) =>
    setReveals((prev) => {
      const next = new Set(prev)
      if (next.has(r)) next.delete(r)
      else next.add(r)
      return next
    })

  const toggleTap = (spot: string) =>
    setTapped((prev) => {
      const next = new Set(prev)
      if (next.has(spot)) next.delete(spot)
      else next.add(spot)
      return next
    })

  const toggleStudyKey = (id: string) => {
    const has = saved.studyKeys.includes(id)
    if (has && saved.studyKeys.length === 1) return
    update({ studyKeys: has ? saved.studyKeys.filter((k) => k !== id) : [...saved.studyKeys, id] })
  }

  const setBpm = (bpm: number) => update({ bpm: Math.max(30, Math.min(220, Math.round(bpm))) })

  const exportData = () => {
    const blob = new Blob([JSON.stringify(saved, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `guitar-practice-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const importData = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const data = validate(JSON.parse(await file.text()))
      if (!data) throw new Error('invalid')
      setSaved(data)
      changeKey(data.currentKey)
      setFlash(`Imported ${data.history.length} practice entries.`)
    } catch {
      setFlash('That file is not a guitar-practice export.')
    }
  }

  const beatStatus = (() => {
    if (!metronome.running || !tick) return null
    if (tick.bar < 0) return { text: `Count-in ${tick.beat + 1}`, cls: 'countin' }
    if (step.callAndResponse) return tick.bar % 2 === 0 ? { text: 'PLAY', cls: 'play' } : { text: 'REST', cls: 'rest' }
    if (step.id === 'changes') return { text: chords[activeDegree].name, cls: 'play' }
    return { text: `Bar ${tick.bar + 1}`, cls: 'neutral' }
  })()

  const summary = summarize(saved.history, keyId(key))

  return (
    <div className="app">
      <header className="top">
        <div>
          <p className="eyebrow">Today's key</p>
          <h1>{keyName(key)}</h1>
        </div>
        <div className="key-actions">
          <select value={keyId(key)} onChange={(e) => changeKey(e.target.value)} aria-label="Choose key">
            {KEYS.map((k) => (
              <option key={keyId(k)} value={keyId(k)}>
                {keyName(k)}
              </option>
            ))}
          </select>
          <button className="primary" onClick={() => changeKey(pickNextKey(saved))}>
            Next key
          </button>
        </div>
      </header>

      {flash && (
        <div className="flash" role="status">
          {flash}
          <button className="link" onClick={() => setFlash(null)}>
            Dismiss
          </button>
        </div>
      )}

      {isIOS() && !isStandalone() && (
        <p className="hint">On iPhone or iPad: tap Share → Add to Home Screen to install and use offline.</p>
      )}

      <nav className="steps" aria-label="Session steps">
        {exercises.map((ex, i) => (
          <button key={ex.id} className={i === stepIndex ? 'active' : ''} onClick={() => goToStep(i)}>
            <span className="num">{i + 1}</span> {ex.title}
          </button>
        ))}
      </nav>

      <main className="grid">
        <section className="card prompt">
          <h2>
            {stepIndex + 1}. {step.title}
          </h2>
          <ol>
            {step.instructions.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
          <p className="tempo-tip">⏱ {step.metronome}</p>
          {step.id === 'changes' && (
            <div className="chord-picker">
              {[0, 3, 4].map((d) => (
                <button
                  key={d}
                  className={activeDegree === d ? 'active' : ''}
                  onClick={() => {
                    setChordDegree(d)
                    if (layer === 'hidden') setLayer('triad')
                  }}
                  disabled={!!followingLoop}
                >
                  {chords[d].roman} · {chords[d].name}
                </button>
              ))}
            </div>
          )}
          <div className="rating">
            <p>How did it go?</p>
            <button onClick={() => rate('easy')}>Found it immediately</button>
            <button onClick={() => rate('worked')}>Had to work it out</button>
            <button onClick={() => rate('reveal')}>Needed the reveal</button>
          </div>
        </section>

        <section className="card reveals">
          <h2>Reveal</h2>
          <p className="muted">Try to answer from memory first.</p>
          <div className="reveal-buttons">
            {(
              [
                ['notes', 'Key notes'],
                ['triad', 'Tonic triad'],
                ['relative', `Relative ${rel.mode}`],
                ['relTriad', 'Relative triad'],
                ['chords', 'Diatonic chords'],
              ] as [Reveal, string][]
            ).map(([id, label]) => (
              <button key={id} className={reveals.has(id) ? 'active' : ''} onClick={() => toggleReveal(id)}>
                {label}
              </button>
            ))}
          </div>
          {reveals.has('notes') && (
            <div className="reveal">
              <h3>{keyName(key)}</h3>
              <div className="note-row">
                {notes.map((n, i) => (
                  <span key={n} className={`note-chip${tonicTriad.includes(n) ? ' chord' : ''}`}>
                    <b>{pretty(n)}</b>
                    <small>{degrees[i]}</small>
                  </span>
                ))}
              </div>
            </div>
          )}
          {reveals.has('triad') && (
            <div className="reveal">
              <h3>Tonic triad · {chords[0].name}</h3>
              <ChordChips notes={tonicTriad} />
            </div>
          )}
          {reveals.has('relative') && (
            <div className="reveal">
              <h3>{keyName(rel)}</h3>
              <p className="muted">
                Same notes{rel.mode === 'minor' ? ' (natural minor)' : ''}, but {pretty(rel.tonic)} is home.
              </p>
              <div className="note-row">
                {scale(rel).map((n, i) => (
                  <span key={n} className="note-chip">
                    <b>{pretty(n)}</b>
                    <small>{degreeLabels(rel.mode)[i]}</small>
                  </span>
                ))}
              </div>
            </div>
          )}
          {reveals.has('relTriad') && (
            <div className="reveal">
              <h3>Relative triad · {diatonicChords(rel)[0].name}</h3>
              <ChordChips notes={relTriad} />
              <p className="muted">
                Shared with {chords[0].name}: {relTriad.filter((n) => tonicTriad.includes(n)).map(pretty).join(' and ')}
              </p>
            </div>
          )}
          {reveals.has('chords') && (
            <div className="reveal">
              <h3>Diatonic chords</h3>
              <div className="chord-table">
                {chords.map((c) => (
                  <div key={c.degree} className={[0, 3, 4].includes(c.degree) ? 'primary-chord' : ''}>
                    <small>{c.roman}</small>
                    <b>{c.name}</b>
                    <span>{c.notes.map(pretty).join(' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="card metronome">
          <h2>Metronome</h2>
          <div className="bpm">
            <button onClick={() => setBpm(saved.bpm - 5)} aria-label="Slower by 5">
              −5
            </button>
            <output>
              {saved.bpm}
              <small> BPM</small>
            </output>
            <button onClick={() => setBpm(saved.bpm + 5)} aria-label="Faster by 5">
              +5
            </button>
          </div>
          <input
            type="range"
            min={30}
            max={220}
            value={saved.bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            aria-label="Tempo"
          />
          <div className="beats" aria-hidden>
            {Array.from({ length: metronome.beatsPerBar }, (_, i) => (
              <span key={i} className={tick?.beat === i ? (tick.bar < 0 ? 'on countin' : 'on') : ''} />
            ))}
          </div>
          <div className={`beat-status ${beatStatus?.cls ?? 'idle'}`}>{beatStatus?.text ?? 'Stopped'}</div>
          <div className="row">
            <button className="primary" onClick={() => (metronome.running ? metronome.stop() : metronome.start())}>
              {metronome.running ? 'Stop' : 'Start'}
            </button>
            <label className="check">
              <input
                type="checkbox"
                checked={metronome.countIn}
                onChange={(e) => metronome.setCountIn(e.target.checked)}
                disabled={metronome.running}
              />
              1-bar count-in
            </label>
          </div>
        </section>
      </main>

      <section className="card board">
        <div className="board-controls">
          <div className="segmented" role="group" aria-label="Fretboard hints">
            {(
              [
                ['hidden', 'Hidden'],
                ['roots', 'Roots'],
                ['triad', step.id === 'changes' ? 'Chord tones' : 'Triad'],
                ['scale', 'Scale'],
              ] as [Layer, string][]
            ).map(([id, label]) => (
              <button key={id} className={layer === id ? 'active' : ''} onClick={() => setLayer(id)}>
                {label}
              </button>
            ))}
          </div>
          <div className="segmented" role="group" aria-label="Labels">
            <button className={labelMode === 'names' ? 'active' : ''} onClick={() => setLabelMode('names')}>
              Names
            </button>
            <button className={labelMode === 'degrees' ? 'active' : ''} onClick={() => setLabelMode('degrees')}>
              Degrees
            </button>
          </div>
          <label className="check">
            <input type="checkbox" checked={showOctaves} onChange={(e) => setShowOctaves(e.target.checked)} />
            Octave shapes
          </label>
          <div className="position">
            <label>
              Frets {minFret}–{maxFret}
              <input
                type="range"
                min={0}
                max={11}
                value={startFret}
                disabled={wholeNeck}
                onChange={(e) => {
                  setStartFret(Number(e.target.value))
                  setTapped(new Set())
                }}
              />
            </label>
            <label className="check">
              <input type="checkbox" checked={wholeNeck} onChange={(e) => setWholeNeck(e.target.checked)} />
              Whole neck
            </label>
          </div>
        </div>
        <p className="muted small">
          {layer === 'hidden'
            ? 'Hints are hidden. Tap any spot to check a note.'
            : step.id === 'changes'
              ? layer === 'roots'
                ? `Showing ${chords[activeDegree].name} roots.`
                : layer === 'triad'
                  ? `Showing ${chords[activeDegree].name} (${chordToneLabels(chords[activeDegree].notes).join(' ')}).`
                  : `Red = ${chords[activeDegree].name} root · amber = its chord tones · blue = other scale notes.`
              : 'Red = root · amber = triad tones · blue = other scale notes. Tap spots to check others.'}
        </p>
        <Fretboard
          musicalKey={key}
          chord={fretboardChord}
          minFret={minFret}
          maxFret={maxFret}
          layer={layer}
          labelMode={labelMode}
          showOctaves={showOctaves}
          followChord={step.id === 'changes'}
          tapped={tapped}
          onTap={toggleTap}
        />
      </section>

      <section className="card progress">
        <h2>Progress</h2>
        <p className="muted">
          Last {summary.total} ratings in {keyName(key)}: {summary.easy} immediate · {summary.worked} worked out ·{' '}
          {summary.reveal} needed reveal
        </p>
        <details>
          <summary>Study keys ({saved.studyKeys.length}) — "Next key" picks from these, favoring ones you find hard</summary>
          <div className="study-keys">
            {KEYS.map((k) => (
              <label key={keyId(k)} className="check">
                <input
                  type="checkbox"
                  checked={saved.studyKeys.includes(keyId(k))}
                  onChange={() => toggleStudyKey(keyId(k))}
                />
                {keyName(k)}
              </label>
            ))}
          </div>
        </details>
        <div className="row">
          <button onClick={exportData}>Export progress</button>
          <button onClick={() => importRef.current?.click()}>Import progress</button>
          <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={importData} />
        </div>
      </section>
    </div>
  )
}

function ChordChips({ notes }: { notes: string[] }) {
  const labels = chordToneLabels(notes)
  return (
    <div className="note-row">
      {notes.map((n, i) => (
        <span key={n} className={`note-chip ${i === 0 ? 'root' : 'chord'}`}>
          <b>{pretty(n)}</b>
          <small>{labels[i]}</small>
        </span>
      ))}
    </div>
  )
}
