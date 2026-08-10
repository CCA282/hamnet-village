import { describe, it, expect, beforeEach } from 'vitest'
import { vi } from 'vitest'

vi.mock('vue', () => ({ reactive: (obj) => obj, watch: () => {} }))
vi.mock('../net/netState.js', () => ({ netState: { mode: null, playerName: '' } }))
vi.mock('../net/socket.js', () => ({}))

const { applyWorldState } = await import('../net/sync.js')
const { game, resetGame } = await import('../game/store.js')

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeWorld(overrides = {}) {
  return {
    players: [],
    carts: [],
    buildingInventories: { lumberjack: { wood: 0 } },
    prodTimers: {},
    autoTransporters: [],
    meteoriteSpots: [],
    trees: [], stoneSpots: [], berryBushes: [], fishSpots: [],
    _meteoriteTimer: 0, _nextMeteoriteSpawn: 0, _nextId: 1,
    spawnIcon: vi.fn(),
    spawnLeaves: vi.fn(),
    syncPlayers: vi.fn(),
    ...overrides,
  }
}

function makeSnap(overrides = {}) {
  return {
    wood: 0, fish: 0, stone: 0, berries: 0, meteorite: 0,
    villageLevel: 1, totalHarvested: 0, timeOfDay: 0.25,
    buildings: {}, upgrades: {}, buildingUpgrades: {},
    players: [], carts: [], autoTransporters: [],
    meteoriteSpots: [], _meteoriteTimer: 0, _nextMeteoriteSpawn: 0,
    _nextId: 1, devMode: false,
    ...overrides,
  }
}

beforeEach(() => {
  resetGame()
  vi.clearAllMocks()
})

// ── Reactive state sync ───────────────────────────────────────────────────────

describe('applyWorldState — reactive state', () => {
  it('sets game.wood from snap', () => {
    const world = makeWorld()
    applyWorldState(world, makeSnap({ wood: 42 }))
    expect(game.wood).toBe(42)
  })

  it('sets game.timeOfDay from snap', () => {
    const world = makeWorld()
    applyWorldState(world, makeSnap({ timeOfDay: 0.75 }))
    expect(game.timeOfDay).toBe(0.75)
  })
})

// ── Player deposit animation (Bug #3) ─────────────────────────────────────────

describe('applyWorldState — player deposit particles', () => {
  it('spawns icon when player wood inventory decreases', () => {
    const world = makeWorld()
    // Existing player with 3 wood
    const player = {
      id: 1, x: 0, y: 0, targetX: 0, targetY: 0, target: null,
      inventory: { wood: 3 }, label: 'P1', color: '#fff',
      source: 'kb1', remoteGuestId: null,
    }
    world.players = [player]

    // Snap: player now has 0 wood (deposited)
    applyWorldState(world, makeSnap({
      players: [{
        id: 1, x: 480, y: 320, label: 'P1', color: '#fff', source: 'kb1',
        inventory: { wood: 0 }, hint: '', facing: 0, walkPhase: 0, moving: false,
        spawn: false, harvestCd: 0, remoteGuestId: null, targetHalo: null,
      }],
    }))

    expect(world.spawnIcon).toHaveBeenCalledWith('icon_wood', expect.any(Number), expect.any(Number))
  })

  it('does not spawn icon when player wood inventory increases', () => {
    const world = makeWorld()
    const player = {
      id: 1, x: 0, y: 0, targetX: 0, targetY: 0, target: null,
      inventory: { wood: 0 }, label: 'P1', color: '#fff',
      source: 'kb1', remoteGuestId: null,
    }
    world.players = [player]

    applyWorldState(world, makeSnap({
      players: [{
        id: 1, x: 70, y: 110, label: 'P1', color: '#fff', source: 'kb1',
        inventory: { wood: 1 }, hint: '', facing: 0, walkPhase: 0, moving: false,
        spawn: false, harvestCd: 0, remoteGuestId: null, targetHalo: null,
      }],
    }))

    expect(world.spawnIcon).not.toHaveBeenCalledWith('icon_wood', expect.any(Number), expect.any(Number))
  })

  it('spawns multiple icons when multiple resources are deposited', () => {
    const world = makeWorld()
    const player = {
      id: 1, x: 0, y: 0, targetX: 0, targetY: 0, target: null,
      inventory: { wood: 2, fish: 3 }, label: 'P1', color: '#fff',
      source: 'kb1', remoteGuestId: null,
    }
    world.players = [player]

    applyWorldState(world, makeSnap({
      players: [{
        id: 1, x: 480, y: 320, label: 'P1', color: '#fff', source: 'kb1',
        inventory: { wood: 0, fish: 0 }, hint: '', facing: 0, walkPhase: 0, moving: false,
        spawn: false, harvestCd: 0, remoteGuestId: null, targetHalo: null,
      }],
    }))

    const calls = world.spawnIcon.mock.calls.map((c) => c[0])
    expect(calls).toContain('icon_wood')
    expect(calls).toContain('icon_fish')
  })
})

// ── Cart deposit animation (Bug #3) ──────────────────────────────────────────

describe('applyWorldState — cart deposit particles', () => {
  it('spawns icon at VILLAGE position when cart inventory decreases', () => {
    const world = makeWorld()
    world.carts = [{
      id: 10, x: 480, y: 320, following: null,
      inventory: { wood: 5 },
    }]

    applyWorldState(world, makeSnap({
      carts: [{ id: 10, x: 480, y: 320, following: null, inventory: { wood: 0 } }],
    }))

    expect(world.spawnIcon).toHaveBeenCalledWith('icon_wood', expect.any(Number), expect.any(Number))
    // Icon should be near VILLAGE (x≈480 ± 10, y < 320)
    const call = world.spawnIcon.mock.calls.find((c) => c[0] === 'icon_wood')
    expect(call[1]).toBeGreaterThan(470 - 1) // x near VILLAGE.x (480 ± 10)
    expect(call[1]).toBeLessThan(490 + 1)
    expect(call[2]).toBeLessThan(320)         // y above VILLAGE.y
  })

  it('does not spawn icon when cart inventory increases', () => {
    const world = makeWorld()
    world.carts = [{
      id: 10, x: 300, y: 200, following: null,
      inventory: { wood: 0 },
    }]

    applyWorldState(world, makeSnap({
      carts: [{ id: 10, x: 310, y: 200, following: null, inventory: { wood: 3 } }],
    }))

    expect(world.spawnIcon).not.toHaveBeenCalledWith('icon_wood', expect.any(Number), expect.any(Number))
  })
})
