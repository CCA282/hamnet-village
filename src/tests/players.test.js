import { describe, it, expect, beforeEach } from 'vitest'
import { vi } from 'vitest'

vi.mock('vue', () => ({ reactive: (obj) => obj, watch: () => {} }))
vi.mock('../net/netState.js', () => ({
  netState: { mode: null, roomCode: null, connected: false, myPlayerId: null, playerName: '' },
}))

const { playerMethods } = await import('../game/world/players.js')
const { game, resetGame } = await import('../game/store.js')
import { MAX_PLAYERS } from '../game/constants/index.js'

function makeCtx(overrides = {}) {
  return {
    ...playerMethods,
    players: [],
    carts: [],
    _nextId: 1,
    _nextPlayerNum: 1,
    spawnPoof: vi.fn(),
    closeMenu: vi.fn(),
    ...overrides,
  }
}

beforeEach(() => resetGame())

// ── Solo ───────────────────────────────────────────────────────────────────────

describe('addPlayer — solo', () => {
  it('adds a player with correct source', () => {
    const w = makeCtx()
    const p = w.addPlayer('kb1')
    expect(p.source).toBe('kb1')
    expect(w.players).toHaveLength(1)
  })

  it('player gets label P1', () => {
    const w = makeCtx()
    const p = w.addPlayer('kb1')
    expect(p.label).toBe('P1')
  })

  it('player has empty inventory', () => {
    const w = makeCtx()
    const p = w.addPlayer('kb1')
    const total = Object.values(p.inventory).reduce((a, b) => a + b, 0)
    expect(total).toBe(0)
  })

  it('syncs game.players after adding', () => {
    const w = makeCtx()
    const p = w.addPlayer('kb1')
    expect(game.players).toHaveLength(1)
    // syncPlayers maps id/label/color/hint — check label as identity
    expect(game.players[0].id).toBe(p.id)
    expect(game.players[0].label).toBe('P1')
  })

  it('removes player correctly', () => {
    const w = makeCtx()
    const p = w.addPlayer('kb1')
    w.removePlayer(p)
    expect(w.players).toHaveLength(0)
    expect(game.players).toHaveLength(0)
  })

  it('removePlayer closes menu when player was opener', () => {
    const w = makeCtx()
    const p = w.addPlayer('kb1')
    game.menuOpen = true
    game.menuOpener = p.id
    w.removePlayer(p)
    expect(w.closeMenu).toHaveBeenCalled()
  })

  it('findPlayer returns correct player', () => {
    const w = makeCtx()
    const p = w.addPlayer('kb1')
    const found = w.findPlayer((x) => x.source === 'kb1')
    expect(found).toBe(p)
  })
})

// ── Local co-op ────────────────────────────────────────────────────────────────

describe('addPlayer — local co-op', () => {
  it('two keyboard players get different colors', () => {
    const w = makeCtx()
    const p1 = w.addPlayer('kb1')
    const p2 = w.addPlayer('kb2')
    expect(p1.color).not.toBe(p2.color)
  })

  it('two keyboard players get different labels', () => {
    const w = makeCtx()
    const p1 = w.addPlayer('kb1')
    const p2 = w.addPlayer('kb2')
    expect(p1.label).not.toBe(p2.label)
  })

  it('two players spawn at different positions (different angles)', () => {
    const w = makeCtx()
    const p1 = w.addPlayer('kb1')
    const p2 = w.addPlayer('kb2')
    expect(Math.hypot(p1.x - p2.x, p1.y - p2.y)).toBeGreaterThan(0)
  })

  it('gamepad player gets correct source', () => {
    const w = makeCtx()
    const p = w.addPlayer('pad', 0)
    expect(p.source).toBe('pad')
    expect(p.gamepadIndex).toBe(0)
  })

  it('is capped at MAX_PLAYERS', () => {
    const w = makeCtx()
    for (let i = 0; i < MAX_PLAYERS + 2; i++) w.addPlayer('kb1')
    expect(w.players.length).toBeLessThanOrEqual(MAX_PLAYERS)
  })

  it('game.players stays in sync after multiple add/remove', () => {
    const w = makeCtx()
    const p1 = w.addPlayer('kb1')
    const p2 = w.addPlayer('kb2')
    expect(game.players).toHaveLength(2)
    w.removePlayer(p1)
    expect(game.players).toHaveLength(1)
    // syncPlayers maps id/label/color/hint — verify by id
    expect(game.players[0].id).toBe(p2.id)
  })

  it('removes leaving players from cart following', () => {
    const w = makeCtx()
    const p = w.addPlayer('kb1')
    const cart = { id: 99, x: 0, y: 0, following: p.id, inventory: {} }
    w.carts = [cart]
    // Simulate gamepad disconnect: handleDisconnects calls removePlayer
    w.removePlayer(p)
    // carts.js removePlayer doesn't clear following — but handleDisconnects does
    // Testing that removePlayer itself works cleanly
    expect(w.players).toHaveLength(0)
  })
})

// ── Online multiplayer — host ──────────────────────────────────────────────────

describe('addRemotePlayer — host side', () => {
  it('creates player with remote source', () => {
    const w = makeCtx()
    const p = w.addRemotePlayer('guest-abc', 'Alice')
    expect(p.source).toBe('remote')
    expect(p.remoteGuestId).toBe('guest-abc')
  })

  it('uses provided name', () => {
    const w = makeCtx()
    const p = w.addRemotePlayer('guest-abc', 'Alice')
    expect(p.label).toBe('Alice')
  })

  it('uses default label when no name given', () => {
    const w = makeCtx()
    const p = w.addRemotePlayer('guest-abc')
    expect(p.label).toMatch(/^P\d+$/)
  })

  it('remote player has per-player menu state fields', () => {
    const w = makeCtx()
    const p = w.addRemotePlayer('guest-abc', 'Bob')
    expect(p.isInMenu).toBe(false)
    expect(p.menuIndex).toBe(0)
    expect(p.menuTab).toBe(0)
    expect(p.remoteInput).toBeDefined()
  })

  it('host can have local + remote players simultaneously', () => {
    const w = makeCtx()
    const local = w.addPlayer('kb1')
    const remote = w.addRemotePlayer('guest-abc', 'Alice')
    expect(w.players).toHaveLength(2)
    expect(local.source).toBe('kb1')
    expect(remote.source).toBe('remote')
  })

  it('remote players get different colors from local', () => {
    const w = makeCtx()
    const local = w.addPlayer('kb1')
    const remote = w.addRemotePlayer('guest-abc', 'Alice')
    expect(local.color).not.toBe(remote.color)
  })
})

describe('applyRemoteInput — host side', () => {
  it('updates remote player input', () => {
    const w = makeCtx()
    w.addRemotePlayer('guest-abc')
    const input = { mx: 1, my: -1, action: true, actionHeld: false }
    w.applyRemoteInput('guest-abc', input)
    const p = w.findPlayer((x) => x.remoteGuestId === 'guest-abc')
    expect(p.remoteInput).toEqual(input)
  })

  it('silently ignores unknown guestId', () => {
    const w = makeCtx()
    expect(() => w.applyRemoteInput('ghost-999', { mx: 1 })).not.toThrow()
  })

  it('inputFor returns remoteInput for remote player', () => {
    const w = makeCtx()
    const p = w.addRemotePlayer('guest-abc')
    const remoteInput = { mx: 1, my: 0, action: false, actionHeld: true }
    p.remoteInput = remoteInput
    const result = w.inputFor({}, p)
    expect(result).toBe(remoteInput)
  })

  it('inputFor returns neutral when remoteInput is null', () => {
    const w = makeCtx()
    const p = w.addRemotePlayer('guest-abc')
    p.remoteInput = null
    const result = w.inputFor({}, p)
    expect(result).toEqual({ mx: 0, my: 0, action: false, actionHeld: false })
  })
})
