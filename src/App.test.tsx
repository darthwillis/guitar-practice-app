// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

// 70 BPM default: one bar of 4 beats lasts 4 * 60/70 s.
const BAR_MS = (4 * 60_000) / 70

class FakeAudioContext {
  destination = {}
  get currentTime() {
    return Date.now() / 1000
  }
  resume() {
    return Promise.resolve()
  }
  createOscillator() {
    return { frequency: { value: 0 }, connect: (n: unknown) => n, start() {}, stop() {} }
  }
  createGain() {
    return {
      gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
      connect: (n: unknown) => n,
    }
  }
}

let container: HTMLDivElement
let root: Root

const button = (text: string) => {
  const b = [...container.querySelectorAll('button')].find((el) => el.textContent?.trim().includes(text))
  if (!b) throw new Error(`No button "${text}"`)
  return b
}
const click = async (text: string) => {
  await act(async () => {
    button(text).click()
  })
}
const advance = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms)
  })
}
const shownNotes = () =>
  new Set([...container.querySelectorAll('svg.fretboard g.spot:not(.empty):not(.tapped) text')].map((t) => t.textContent))
const setCountIn = async (on: boolean) => {
  const box = [...container.querySelectorAll<HTMLInputElement>('label.check input')].find((i) =>
    i.parentElement?.textContent?.includes('count-in'),
  )!
  if (box.checked !== on) await act(async () => box.click())
}

beforeEach(() => {
  vi.useFakeTimers({ now: 1_000_000 })
  localStorage.clear()
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  vi.stubGlobal('AudioContext', FakeAudioContext)
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<App />))
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('Land on the changes', () => {
  it('shows the chord changes when the metronome starts from a fresh step', async () => {
    await click('Land on the changes')
    await setCountIn(false)
    expect(shownNotes().size).toBe(0)

    await click('Start')
    await advance(200)
    expect(shownNotes()).toEqual(new Set(['G', 'B', 'D']))

    await advance(BAR_MS)
    expect(shownNotes()).toEqual(new Set(['C', 'E', 'G']))

    await advance(BAR_MS)
    expect(shownNotes()).toEqual(new Set(['G', 'B', 'D']))

    await advance(BAR_MS)
    expect(shownNotes()).toEqual(new Set(['D', 'F♯', 'A']))
  })

  it('shows the changes when entering the step with the metronome already running', async () => {
    await setCountIn(false)
    await click('Start')
    await advance(200)
    await click('Land on the changes')
    await advance(200)
    expect(shownNotes()).toEqual(new Set(['G', 'B', 'D']))
    await advance(BAR_MS)
    expect(shownNotes()).toEqual(new Set(['C', 'E', 'G']))
  })

  it('respects hiding hints after playback starts', async () => {
    await click('Land on the changes')
    await setCountIn(false)
    await click('Start')
    await advance(200)
    await click('Hidden')
    await advance(BAR_MS * 2)
    expect(shownNotes().size).toBe(0)
  })

  it('keeps manual chord selection and hint layers working when stopped', async () => {
    await click('Land on the changes')
    await click('IV · C')
    expect(shownNotes()).toEqual(new Set(['C', 'E', 'G']))
    await click('Roots')
    expect(shownNotes()).toEqual(new Set(['C']))
    await click('V · D')
    expect(shownNotes()).toEqual(new Set(['D']))
    await click('Scale')
    expect(shownNotes()).toEqual(new Set(['G', 'A', 'B', 'C', 'D', 'E', 'F♯']))
  })
})
