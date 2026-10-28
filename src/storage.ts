import { KEYS, keyFromId, keyId } from './theory'
import type { StepId } from './exercises'

export type Rating = 'easy' | 'worked' | 'reveal'

export interface HistoryEntry {
  at: string
  key: string
  step: StepId
  rating: Rating
}

export interface SavedState {
  version: 1
  studyKeys: string[]
  currentKey: string
  bpm: number
  history: HistoryEntry[]
}

const STORAGE_KEY = 'guitar-practice-app.v1'
const MAX_HISTORY = 2000

export const defaultState = (): SavedState => ({
  version: 1,
  studyKeys: ['G-major', 'E-minor', 'C-major', 'D-major'],
  currentKey: 'G-major',
  bpm: 70,
  history: [],
})

export function validate(raw: unknown): SavedState | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as Partial<SavedState>
  if (s.version !== 1 || !Array.isArray(s.studyKeys) || !Array.isArray(s.history)) return null
  const studyKeys = s.studyKeys.filter((k): k is string => typeof k === 'string' && !!keyFromId(k))
  const currentKey = typeof s.currentKey === 'string' && keyFromId(s.currentKey) ? s.currentKey : studyKeys[0]
  const history = s.history.filter(
    (h): h is HistoryEntry =>
      !!h && typeof h.at === 'string' && typeof h.key === 'string' && typeof h.step === 'string' &&
      (h.rating === 'easy' || h.rating === 'worked' || h.rating === 'reveal'),
  )
  return {
    version: 1,
    studyKeys: studyKeys.length ? studyKeys : defaultState().studyKeys,
    currentKey: currentKey ?? keyId(KEYS[0]),
    bpm: typeof s.bpm === 'number' && s.bpm >= 30 && s.bpm <= 240 ? Math.round(s.bpm) : 70,
    history: history.slice(-MAX_HISTORY),
  }
}

export function load(): SavedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return (raw && validate(JSON.parse(raw))) || defaultState()
  } catch {
    return defaultState()
  }
}

export function save(state: SavedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, history: state.history.slice(-MAX_HISTORY) }))
  } catch {
    // Storage can be unavailable (private mode, quota); the session still works in memory.
  }
}

/** Weighted pick: keys you needed help with recently come up more often. */
export function pickNextKey(state: SavedState, random = Math.random): string {
  const candidates = state.studyKeys.length > 1
    ? state.studyKeys.filter((k) => k !== state.currentKey)
    : state.studyKeys
  const recent = state.history.slice(-60)
  const weights = candidates.map((k) =>
    recent.reduce((w, h) => (h.key !== k ? w : w + (h.rating === 'reveal' ? 2 : h.rating === 'worked' ? 1 : 0)), 1),
  )
  let r = random() * weights.reduce((a, b) => a + b, 0)
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i]
    if (r < 0) return candidates[i]
  }
  return candidates[candidates.length - 1]
}

export function summarize(history: HistoryEntry[], key: string) {
  const entries = history.filter((h) => h.key === key).slice(-20)
  return {
    total: entries.length,
    easy: entries.filter((h) => h.rating === 'easy').length,
    worked: entries.filter((h) => h.rating === 'worked').length,
    reveal: entries.filter((h) => h.rating === 'reveal').length,
  }
}
