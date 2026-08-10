import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { vi } from 'vitest'

vi.mock('vue', () => ({ reactive: (obj) => obj, watch: () => {} }))
vi.mock('../net/netState.js', () => ({
  netState: { mode: null, playerName: '' },
}))

// Stub localStorage before dynamic imports (sync.js uses it at call time)
let lsStore = {}
vi.stubGlobal('localStorage', {
  getItem: (k) => lsStore[k] ?? null,
  setItem: (k, v) => { lsStore[k] = String(v) },
  removeItem: (k) => { delete lsStore[k] },
})

const { serializeWorld, applyWorldState, saveLocal, loadLocal, listLocalSaves, deleteLocal } =
  await import('../net/sync.js')
const { game, resetGame } = await import('../game/store.js')
import { BUILDINGS, BUILD_SPOTS } from '../game/constants/index.js'

function makeWorld(overrides = {}) {
  const lumberjackSpot = BUILD_SPOTS.find((s) => s.building === 'lumberjack')
  return {
    players: [],
    carts: [],
    trees: [],
    stoneSpots: [],
    berryBushes: [],
    fishSpots: [],
    meteoriteSpots: [],
    _meteoriteTimer: 0,
    _nextMeteoriteSpawn: 20,
    _nextId: 1,
    buildingInventories: { lumberjack: { wood: 0 }, fishinghut: { fish: 0 } },
    prodTimers: { lumberjack: 0 },
    autoTransporters: [],
    spawnIcon: vi.fn(),
    spawnLeaves: vi.fn(),
    syncPlayers() {
      game.players = this.players.map((p) => ({ id: p.id, label: p.label, color: p.color, hint: p.hint ?? '' }))
    },
    ...overrides,
  }
}

function makePlayer(id, source = 'kb1', overrides = {}) {
  return {
    id,
    source,
    label: `P${id}`,
    color: '#6c8fe0',
    x: 100, y: 200,
    facing: 1, walkPhase: 0, moving: false, frozen: false,
    spawn: 0, target: null, harvestCd: 0, water: false,
    inventory: { wood: 0, fish: 0, stone: 0, berries: 0, meteorite: 0 },
    hint: '',
    ...overrides,
  }
}

beforeEach(() => {
  resetGame()
  lsStore = {}
})

// ── serializeWorld ─────────────────────────────────────────────────────────────

describe('serializeWorld', () => {
  it('captures current resource stock', () => {
    const world = makeWorld()
    game.wood = 12; game.fish = 5; game.stone = 3
    const snap = serializeWorld(world)
    expect(snap.wood).toBe(12)
    expect(snap.fish).toBe(5)
    expect(snap.stone).toBe(3)
  })

  it('captures village level and upgrades', () => {
    const world = makeWorld()
    game.villageLevel = 2
    game.upgrades.speed = 3
    const snap = serializeWorld(world)
    expect(snap.villageLevel).toBe(2)
    expect(snap.upgrades.speed).toBe(3)
  })

  it('serializes local players', () => {
    const world = makeWorld()
    world.players = [makePlayer(1, 'kb1', { x: 150, y: 250, hint: 'chop' })]
    const snap = serializeWorld(world)
    expect(snap.players).toHaveLength(1)
    expect(snap.players[0].id).toBe(1)
    expect(snap.players[0].x).toBe(150)
    expect(snap.players[0].hint).toBe('chop')
  })

  it('serializes remote (guest) players — host side', () => {
    const world = makeWorld()
    world.players = [
      makePlayer(1, 'kb1'),
      makePlayer(2, 'remote', { remoteGuestId: 'guest-abc' }),
    ]
    const snap = serializeWorld(world)
    expect(snap.players).toHaveLength(2)
    const remoteSnap = snap.players.find((p) => p.id === 2)
    expect(remoteSnap.source).toBe('remote')
  })

  it('includes spots state when requested', () => {
    const world = makeWorld({
      trees: [{ hp: 2, maxHp: 3, regrow: 0, shake: 0 }],
      stoneSpots: [{ hp: 1, maxHp: 3, regrow: 5 }],
      berryBushes: [{ hp: 3, maxHp: 3, regrow: 0 }],
      fishSpots: [{ cd: 1.2 }],
    })
    const snap = serializeWorld(world, { includeSpotsState: true })
    expect(snap.trees).toHaveLength(1)
    expect(snap.trees[0].hp).toBe(2)
    expect(snap.stoneSpots[0].hp).toBe(1)
    expect(snap.berryBushes[0].hp).toBe(3)
    expect(snap.fishSpots[0].cd).toBeCloseTo(1.2)
  })

  it('serializes carts', () => {
    const world = makeWorld({
      carts: [{ id: 99, x: 300, y: 400, following: null, inventory: { wood: 3, fish: 0, stone: 0, berries: 0, meteorite: 0 } }],
    })
    const snap = serializeWorld(world)
    expect(snap.carts).toHaveLength(1)
    expect(snap.carts[0].id).toBe(99)
    expect(snap.carts[0].inventory.wood).toBe(3)
  })
})

// ── applyWorldState ────────────────────────────────────────────────────────────

describe('applyWorldState', () => {
  it('restores resource stock', () => {
    const world = makeWorld()
    applyWorldState(world, { wood: 20, fish: 8, stone: 15, berries: 5, meteorite: 1 })
    expect(game.wood).toBe(20)
    expect(game.fish).toBe(8)
  })

  it('restores upgrades', () => {
    const world = makeWorld()
    applyWorldState(world, { upgrades: { speed: 2, harvest_yield: 1 } })
    expect(game.upgrades.speed).toBe(2)
    expect(game.upgrades.harvest_yield).toBe(1)
  })

  it('creates new players with lerp targets', () => {
    const world = makeWorld()
    const snap = {
      players: [{ id: 1, source: 'kb1', label: 'P1', color: '#6c8fe0', x: 300, y: 400, facing: 1, walkPhase: 0, moving: false, frozen: false, spawn: 0, harvestCd: 0, water: false, inventory: { wood: 0, fish: 0, stone: 0, berries: 0, meteorite: 0 }, hint: '', targetHalo: null, remoteGuestId: null }],
      _nextId: 2,
    }
    applyWorldState(world, snap)
    expect(world.players).toHaveLength(1)
    const p = world.players[0]
    expect(p.targetX).toBe(300)
    expect(p.targetY).toBe(400)
  })

  it('updates existing players without snapping position (lerp)', () => {
    const world = makeWorld()
    const localP = makePlayer(1, 'kb1', { x: 100, y: 100 })
    world.players = [localP]
    const snap = {
      players: [{
        id: 1, source: 'kb1', label: 'P1', color: '#6c8fe0',
        x: 200, y: 200, facing: -1, walkPhase: 0.5, moving: true, frozen: false,
        spawn: 0, harvestCd: 0, water: false,
        inventory: { wood: 0, fish: 0, stone: 0, berries: 0, meteorite: 0 },
        hint: '', targetHalo: null, remoteGuestId: null,
      }],
      _nextId: 2,
    }
    applyWorldState(world, snap)
    // Position is not snapped (stays at lerp source)
    expect(world.players[0].x).toBe(100)
    expect(world.players[0].y).toBe(100)
    // But lerp target is updated
    expect(world.players[0].targetX).toBe(200)
    expect(world.players[0].targetY).toBe(200)
    // Non-position properties ARE updated
    expect(world.players[0].facing).toBe(-1)
  })

  it('removes players no longer present in snapshot', () => {
    const world = makeWorld()
    world.players = [makePlayer(1), makePlayer(2)]
    // Snapshot only has player 1
    const snap = {
      players: [{
        id: 1, source: 'kb1', label: 'P1', color: '#6c8fe0',
        x: 100, y: 100, facing: 1, walkPhase: 0, moving: false, frozen: false,
        spawn: 0, harvestCd: 0, water: false,
        inventory: { wood: 0, fish: 0, stone: 0, berries: 0, meteorite: 0 },
        hint: '', targetHalo: null, remoteGuestId: null,
      }],
      _nextId: 3,
    }
    applyWorldState(world, snap)
    expect(world.players).toHaveLength(1)
    expect(world.players[0].id).toBe(1)
  })

  it('restores carts', () => {
    const world = makeWorld()
    applyWorldState(world, {
      carts: [{ id: 5, x: 100, y: 200, following: null, inventory: { wood: 3, fish: 0, stone: 0, berries: 0, meteorite: 0 } }],
    })
    expect(world.carts).toHaveLength(1)
    expect(world.carts[0].id).toBe(5)
    expect(world.carts[0].inventory.wood).toBe(3)
  })
})

// ── Online multiplayer — host → guest sync ────────────────────────────────────

describe('host → guest sync', () => {
  it('guest receives and applies host world state including remote player', () => {
    // Host: has 1 local player + 1 remote player (the guest)
    const hostWorld = makeWorld()
    game.wood = 10; game.fish = 3
    hostWorld.players = [
      makePlayer(1, 'kb1', { x: 200, y: 300 }),
      makePlayer(2, 'remote', { x: 400, y: 350, remoteGuestId: 'guest-xyz' }),
    ]

    const snap = serializeWorld(hostWorld)
    snap.guestPlayerId = 2

    // Guest: starts empty
    const guestWorld = makeWorld()
    applyWorldState(guestWorld, snap)

    expect(game.wood).toBe(10)
    expect(guestWorld.players).toHaveLength(2)
    const guestPlayer = guestWorld.players.find((p) => p.id === 2)
    expect(guestPlayer).toBeDefined()
    expect(guestPlayer.targetX).toBe(400)
    expect(guestPlayer.targetY).toBe(350)
  })

  it('building inventory increase triggers icon on guest', () => {
    const world = makeWorld()
    // First apply — baseline 0 wood in lumberjack
    applyWorldState(world, { buildingInventories: { lumberjack: { wood: 0 } } })
    world.spawnIcon.mockClear()

    // Second apply — wood produced
    applyWorldState(world, { buildingInventories: { lumberjack: { wood: 3 } } })
    expect(world.spawnIcon).toHaveBeenCalled()
  })

  it('building inventory decrease triggers icon on guest (player collected)', () => {
    const world = makeWorld()
    applyWorldState(world, { buildingInventories: { lumberjack: { wood: 5 } } })
    world.spawnIcon.mockClear()

    applyWorldState(world, { buildingInventories: { lumberjack: { wood: 2 } } })
    expect(world.spawnIcon).toHaveBeenCalled()
  })
})

// ── Local save / load ──────────────────────────────────────────────────────────

describe('saveLocal / loadLocal', () => {
  it('saves and loads world by id', () => {
    const world = makeWorld()
    game.wood = 42; game.fish = 7
    const id = 'world-test-001'
    saveLocal(world, id, 'Mon monde test')
    resetGame()
    expect(game.wood).toBe(0)

    const data = loadLocal(id)
    expect(data).not.toBeNull()
    expect(data.wood).toBe(42)
    expect(data.fish).toBe(7)
    expect(data.name).toBe('Mon monde test')
  })

  it('returns null for unknown id', () => {
    expect(loadLocal('nonexistent')).toBeNull()
  })

  it('listLocalSaves lists saved worlds by name', () => {
    const world = makeWorld()
    saveLocal(world, 'id-1', 'Monde A')
    saveLocal(world, 'id-2', 'Monde B')
    const saves = listLocalSaves()
    const names = saves.map((s) => s.name)
    expect(names).toContain('Monde A')
    expect(names).toContain('Monde B')
  })

  it('deleteLocal removes save from index and storage', () => {
    const world = makeWorld()
    saveLocal(world, 'id-del', 'À supprimer')
    deleteLocal('id-del')
    expect(loadLocal('id-del')).toBeNull()
    const saves = listLocalSaves()
    expect(saves.find((s) => s.id === 'id-del')).toBeUndefined()
  })
})
