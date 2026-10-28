import { useCallback, useEffect, useRef, useState } from 'react'

export interface Tick {
  /** Bar number after the count-in; negative during the count-in. */
  bar: number
  beat: number
}

const BEATS_PER_BAR = 4
const LOOKAHEAD_MS = 25
const SCHEDULE_AHEAD_S = 0.12

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } }
type WakeLockSentinelLike = { release: () => Promise<void> }

/** Web Audio metronome with lookahead scheduling so clicks stay steady when the UI is busy. */
export function useMetronome(bpm: number) {
  const [running, setRunning] = useState(false)
  const [countIn, setCountIn] = useState(true)
  const [tick, setTick] = useState<Tick | null>(null)

  const ctxRef = useRef<AudioContext | null>(null)
  const timerRef = useRef<number | null>(null)
  const nextTimeRef = useRef(0)
  const beatCountRef = useRef(0)
  const bpmRef = useRef(bpm)
  const countInBarsRef = useRef(1)
  const uiTimeouts = useRef<number[]>([])
  const wakeLock = useRef<WakeLockSentinelLike | null>(null)

  useEffect(() => {
    bpmRef.current = bpm
  }, [bpm])

  const click = (ctx: AudioContext, time: number, kind: 'accent' | 'beat' | 'countin') => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = kind === 'accent' ? 1600 : kind === 'countin' ? 800 : 1100
    gain.gain.setValueAtTime(0.0001, time)
    gain.gain.exponentialRampToValueAtTime(kind === 'beat' ? 0.5 : 0.8, time + 0.002)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05)
    osc.connect(gain).connect(ctx.destination)
    osc.start(time)
    osc.stop(time + 0.06)
  }

  const stop = useCallback(() => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current)
    timerRef.current = null
    uiTimeouts.current.forEach((t) => window.clearTimeout(t))
    uiTimeouts.current = []
    wakeLock.current?.release().catch(() => {})
    wakeLock.current = null
    setRunning(false)
    setTick(null)
  }, [])

  const start = useCallback(async () => {
    // iOS: play through the silent switch and create/resume audio inside the tap handler.
    const nav = navigator as AudioSessionNavigator
    if (nav.audioSession) nav.audioSession.type = 'playback'
    const ctx = ctxRef.current ?? new AudioContext()
    ctxRef.current = ctx
    await ctx.resume()

    try {
      const wl = (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<WakeLockSentinelLike> } }).wakeLock
      wakeLock.current = (await wl?.request('screen')) ?? null
    } catch {
      wakeLock.current = null
    }

    countInBarsRef.current = countIn ? 1 : 0
    beatCountRef.current = 0
    nextTimeRef.current = ctx.currentTime + 0.1

    const schedule = () => {
      while (nextTimeRef.current < ctx.currentTime + SCHEDULE_AHEAD_S) {
        const n = beatCountRef.current
        const beat = n % BEATS_PER_BAR
        const bar = Math.floor(n / BEATS_PER_BAR) - countInBarsRef.current
        const time = nextTimeRef.current
        click(ctx, time, bar < 0 ? 'countin' : beat === 0 ? 'accent' : 'beat')
        const delay = Math.max(0, (time - ctx.currentTime) * 1000)
        const id = window.setTimeout(() => {
          uiTimeouts.current = uiTimeouts.current.filter((t) => t !== id)
          setTick({ bar, beat })
        }, delay)
        uiTimeouts.current.push(id)
        nextTimeRef.current += 60 / bpmRef.current
        beatCountRef.current++
      }
    }
    schedule()
    timerRef.current = window.setInterval(schedule, LOOKAHEAD_MS)
    setRunning(true)
  }, [countIn])

  // Browsers suspend timers in the background, so stop cleanly rather than drift.
  useEffect(() => {
    const onHide = () => {
      if (document.hidden) stop()
    }
    document.addEventListener('visibilitychange', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      stop()
    }
  }, [stop])

  return { running, start, stop, tick, countIn, setCountIn, beatsPerBar: BEATS_PER_BAR }
}
