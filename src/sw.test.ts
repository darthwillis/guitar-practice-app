import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'

const SCOPE = 'https://user.github.io/guitar-practice-app/'

type Handler = (event: Record<string, unknown>) => void

function loadWorker(existing: Record<string, Map<string, string>>) {
  const stores = new Map(Object.entries(existing))
  const store = (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map())
    return stores.get(name)!
  }
  const key = (req: string | { url: string }) => new URL(typeof req === 'string' ? req : req.url, SCOPE + 'sw.js').href
  const cacheFor = (name: string) => ({
    match: async (req: string | { url: string }) => store(name).get(key(req)),
    put: async (req: string | { url: string }, res: string) => void store(name).set(key(req), res),
    addAll: async () => {},
  })
  const caches = {
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
    open: async (name: string) => cacheFor(name),
    match: async (req: string | { url: string }) => {
      for (const s of stores.values()) if (s.has(key(req))) return s.get(key(req))
    },
  }
  const handlers: Record<string, Handler> = {}
  const self = {
    registration: { scope: SCOPE },
    location: new URL(SCOPE + 'sw.js'),
    clients: { claim: async () => {} },
    skipWaiting: async () => {},
    addEventListener: (type: string, fn: Handler) => (handlers[type] = fn),
  }
  const fetch = async () => {
    throw new Error('offline')
  }
  runInNewContext(readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), { self, caches, fetch, URL })
  return { stores, handlers }
}

const dispatch = async (handler: Handler, extra: Record<string, unknown>) => {
  let waited: Promise<unknown> | undefined
  let responded: Promise<unknown> | undefined
  handler({ ...extra, waitUntil: (p: Promise<unknown>) => (waited = p), respondWith: (p: Promise<unknown>) => (responded = p) })
  await waited
  return responded
}

describe('service worker on a shared origin', () => {
  it('only deletes its own stale caches on activate', async () => {
    const { stores, handlers } = loadWorker({
      'fretwork-v0': new Map(),
      'fretwork-v1': new Map(),
      'other-app-v3': new Map(),
      'workbox-precache': new Map(),
    })
    await dispatch(handlers.activate, {})
    expect([...stores.keys()].sort()).toEqual(['fretwork-v1', 'other-app-v3', 'workbox-precache'])
  })

  it('ignores requests outside its scope and never serves other apps’ cache entries', async () => {
    const asset = SCOPE + 'assets/app.js'
    const { handlers } = loadWorker({ 'other-app-v3': new Map([[asset, 'theirs']]) })

    expect(await dispatch(handlers.fetch, { request: { method: 'GET', url: 'https://user.github.io/other-app/', mode: 'navigate' } })).toBeUndefined()

    // A cache miss in our own cache falls through to the (offline) network instead of another app's entry.
    await expect(dispatch(handlers.fetch, { request: { method: 'GET', url: asset, mode: 'no-cors' } })).rejects.toThrow('offline')
  })

  it('serves its own cached shell offline', async () => {
    const { handlers } = loadWorker({ 'fretwork-v1': new Map([[SCOPE + 'index.html', 'shell']]) })
    await expect(dispatch(handlers.fetch, { request: { method: 'GET', url: SCOPE + 'practice', mode: 'navigate' } })).resolves.toBe('shell')
  })
})
