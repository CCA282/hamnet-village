import { describe, it, expect, beforeEach, vi } from 'vitest'

function makeLocalStorage() {
  let store = {}
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v) },
    removeItem: (k) => { delete store[k] },
    clear: () => { store = {} },
  }
}
vi.stubGlobal('localStorage', makeLocalStorage())

const { saveLocal, loadLocal, listLocalSaves, deleteLocal, saveServer, listServerSaves, loadServer } = await import('../net/sync.js')
const { resetGame } = await import('../game/store.js')

function makeWorld() {
  return {
    players: [], carts: [],
    buildingInventories: {}, prodTimers: {}, autoTransporters: [],
    meteoriteSpots: [], trees: [], stoneSpots: [], berryBushes: [], fishSpots: [],
    _meteoriteTimer: 0, _nextMeteoriteSpawn: 0, _nextId: 1,
  }
}

function mockFetchOnce(status, body) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    json: async () => body,
  })
}

beforeEach(() => {
  localStorage.clear()
  resetGame()
  vi.restoreAllMocks()
})

// ── localStorage (sans compte) ──────────────────────────────────────────────

describe('saveLocal / loadLocal / listLocalSaves / deleteLocal', () => {
  it('round-trips a save', () => {
    const id = saveLocal(makeWorld(), 'w1', 'Mon monde')
    expect(id).toBe('w1')
    const loaded = loadLocal('w1')
    expect(loaded.name).toBe('Mon monde')
    expect(loaded.id).toBe('w1')
  })

  it('lists saves most-recent-first', () => {
    saveLocal(makeWorld(), 'a', 'A')
    saveLocal(makeWorld(), 'b', 'B')
    expect(listLocalSaves().map((s) => s.id)).toEqual(['b', 'a'])
  })

  it('re-saving the same id updates it without duplicating the index entry', () => {
    saveLocal(makeWorld(), 'w1', 'Mon monde')
    saveLocal(makeWorld(), 'w1', 'Mon monde renommé')
    const list = listLocalSaves()
    expect(list).toHaveLength(1)
    expect(list[0].name).toBe('Mon monde renommé')
  })

  it('deleteLocal removes the save and its index entry', () => {
    saveLocal(makeWorld(), 'w1', 'Mon monde')
    deleteLocal('w1')
    expect(loadLocal('w1')).toBeNull()
    expect(listLocalSaves()).toHaveLength(0)
  })

  it('loadLocal returns null for an unknown id', () => {
    expect(loadLocal('missing')).toBeNull()
  })
})

// ── Backend (avec compte) ────────────────────────────────────────────────────

describe('saveServer / listServerSaves / loadServer', () => {
  it('saveServer attaches the Authorization header when signed in', async () => {
    localStorage.setItem('hamnet_auth_token', 'tok123')
    mockFetchOnce(200, { id: 'w1' })
    const id = await saveServer(makeWorld(), 'w1', 'Mon monde')
    expect(id).toBe('w1')
    const [, options] = fetch.mock.calls[0]
    expect(options.headers.Authorization).toBe('Bearer tok123')
  })

  it('saveServer omits the Authorization header when signed out', async () => {
    mockFetchOnce(200, { id: 'w1' })
    await saveServer(makeWorld(), 'w1', 'Mon monde')
    const [, options] = fetch.mock.calls[0]
    expect(options.headers.Authorization).toBeUndefined()
  })

  it('saveServer returns null when the backend rejects the request', async () => {
    mockFetchOnce(401, 'Connecte-toi')
    expect(await saveServer(makeWorld(), 'w1', 'Mon monde')).toBeNull()
  })

  it('listServerSaves sends the Authorization header and returns the list', async () => {
    localStorage.setItem('hamnet_auth_token', 'tok123')
    mockFetchOnce(200, [{ id: 'w1', name: 'Mon monde' }])
    const list = await listServerSaves()
    expect(list).toEqual([{ id: 'w1', name: 'Mon monde' }])
    const [, options] = fetch.mock.calls[0]
    expect(options.headers.Authorization).toBe('Bearer tok123')
  })

  it('listServerSaves returns [] when signed out (401)', async () => {
    mockFetchOnce(401, 'Connecte-toi')
    expect(await listServerSaves()).toEqual([])
  })

  it('loadServer returns the world on success', async () => {
    mockFetchOnce(200, { id: 'w1', name: 'Mon monde' })
    expect(await loadServer('w1')).toEqual({ id: 'w1', name: 'Mon monde' })
  })

  it('loadServer returns null on failure (e.g. owned by another account)', async () => {
    mockFetchOnce(404, 'Not found')
    expect(await loadServer('w1')).toBeNull()
  })
})
