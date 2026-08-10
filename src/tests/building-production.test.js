import { describe, it, expect, beforeEach } from 'vitest'
import { vi } from 'vitest'

vi.mock('vue', () => ({ reactive: (obj) => obj, watch: () => {} }))
vi.mock('../net/netState.js', () => ({
  netState: { mode: null, playerName: '' },
}))

const { buildingMethods } = await import('../game/world/buildings.js')
const { game, resetGame } = await import('../game/store.js')
import { BUILDINGS, BUILD_SPOTS, VILLAGE, INTERACT_RANGE, AT_DOCK_X_OFFSET, CART_DEPOSIT_RANGE } from '../game/constants/index.js'

const LUMBERJACK_SPOT = BUILD_SPOTS.find((s) => s.building === 'lumberjack')
const LUMBERJACK_BASE_INTERVAL = BUILDINGS.lumberjack.interval // 3.0s

function emptyInv() {
  return { wood: 0, fish: 0, stone: 0, berries: 0, meteorite: 0 }
}

function makeCtx(overrides = {}) {
  return {
    ...buildingMethods,
    players: [],
    carts: [],
    autoTransporters: [],
    prodTimers: { lumberjack: 0, fishinghut: 0, quarry: 0, garden: 0, astronomy: 0 },
    _lastProduced: [],
    buildingInventories: {
      lumberjack: { wood: 0 },
      fishinghut: { fish: 0 },
      quarry: { stone: 0 },
      garden: { berries: 0 },
      astronomy: { meteorite: 0 },
    },
    spawnIcon: vi.fn(),
    ...overrides,
  }
}

beforeEach(() => resetGame())

// ── updateBuildings: production timer ─────────────────────────────────────────

describe('updateBuildings — production', () => {
  it('increments prodTimer when building is active', () => {
    const w = makeCtx()
    game.buildings.lumberjack = 1
    w.updateBuildings(1.0)
    expect(w.prodTimers.lumberjack).toBeCloseTo(1.0)
  })

  it('does not produce when building is inactive', () => {
    const w = makeCtx()
    game.buildings.lumberjack = 0
    w.updateBuildings(10.0)
    expect(w.buildingInventories.lumberjack.wood).toBe(0)
  })

  it('produces wood after full interval', () => {
    const w = makeCtx()
    game.buildings.lumberjack = 1
    w.updateBuildings(LUMBERJACK_BASE_INTERVAL + 0.1)
    expect(w.buildingInventories.lumberjack.wood).toBe(1)
  })

  it('pushes building id to _lastProduced when it produces', () => {
    const w = makeCtx()
    game.buildings.lumberjack = 1
    w.updateBuildings(LUMBERJACK_BASE_INTERVAL + 0.1)
    expect(w._lastProduced).toContain('lumberjack')
  })

  it('does not push to _lastProduced when building is at max storage', () => {
    const w = makeCtx()
    game.buildings.lumberjack = 1
    w.buildingInventories.lumberjack.wood = BUILDINGS.lumberjack.storageMax
    w.updateBuildings(LUMBERJACK_BASE_INTERVAL + 0.1)
    expect(w._lastProduced).not.toContain('lumberjack')
  })

  it('does not exceed storageMax', () => {
    const w = makeCtx()
    game.buildings.lumberjack = 1
    w.buildingInventories.lumberjack.wood = BUILDINGS.lumberjack.storageMax
    w.updateBuildings(LUMBERJACK_BASE_INTERVAL + 0.1)
    expect(w.buildingInventories.lumberjack.wood).toBe(BUILDINGS.lumberjack.storageMax)
  })

  it('speed upgrade reduces interval', () => {
    const w = makeCtx()
    game.buildings.lumberjack = 1
    game.buildingUpgrades.lumberjack.speed = 1 // interval × 0.75
    const fastInterval = LUMBERJACK_BASE_INTERVAL * 0.75
    w.updateBuildings(fastInterval + 0.1)
    expect(w.buildingInventories.lumberjack.wood).toBe(1)
  })

  it('storage upgrade doubles storageMax', () => {
    const w = makeCtx()
    game.buildings.lumberjack = 1
    game.buildingUpgrades.lumberjack.storage = 1 // storageMax × 2 = 40
    const originalMax = BUILDINGS.lumberjack.storageMax
    w.buildingInventories.lumberjack.wood = originalMax * 2 - 1
    w.updateBuildings(LUMBERJACK_BASE_INTERVAL + 0.1)
    expect(w.buildingInventories.lumberjack.wood).toBe(originalMax * 2)
  })

  it('spawns icon when production fires', () => {
    const w = makeCtx()
    game.buildings.lumberjack = 1
    w.updateBuildings(LUMBERJACK_BASE_INTERVAL + 0.1)
    expect(w.spawnIcon).toHaveBeenCalledWith('icon_wood', expect.any(Number), expect.any(Number))
  })
})

// ── updateBuildingCollection ───────────────────────────────────────────────────

describe('updateBuildingCollection', () => {
  it('player in range collects resource from building', () => {
    const w = makeCtx()
    game.buildings.lumberjack = 1
    w.buildingInventories.lumberjack.wood = 5
    // Place player within INTERACT_RANGE + 4 of building
    const player = {
      x: LUMBERJACK_SPOT.x + 2, y: LUMBERJACK_SPOT.y,
      inventory: { ...emptyInv() },
    }
    w.players = [player]
    w.updateBuildingCollection()
    expect(player.inventory.wood).toBeGreaterThan(0)
    expect(w.buildingInventories.lumberjack.wood).toBeLessThan(5)
  })

  it('player out of range does not collect', () => {
    const w = makeCtx()
    game.buildings.lumberjack = 1
    w.buildingInventories.lumberjack.wood = 5
    const player = {
      x: LUMBERJACK_SPOT.x + 100, y: LUMBERJACK_SPOT.y,
      inventory: { ...emptyInv() },
    }
    w.players = [player]
    w.updateBuildingCollection()
    expect(player.inventory.wood).toBe(0)
    expect(w.buildingInventories.lumberjack.wood).toBe(5)
  })

  it('collection stops when player inventory is full', () => {
    const w = makeCtx()
    game.buildings.lumberjack = 1
    w.buildingInventories.lumberjack.wood = 5
    const player = {
      x: LUMBERJACK_SPOT.x, y: LUMBERJACK_SPOT.y,
      inventory: { wood: 9, fish: 0, stone: 0, berries: 0, meteorite: 0 }, // full
    }
    w.players = [player]
    w.updateBuildingCollection()
    expect(player.inventory.wood).toBe(9) // unchanged
    expect(w.buildingInventories.lumberjack.wood).toBe(5) // unchanged
  })
})

// ── Local co-op: building collection ──────────────────────────────────────────

describe('updateBuildingCollection — local co-op', () => {
  it('two players in range both collect from same building', () => {
    const w = makeCtx()
    game.buildings.lumberjack = 1
    w.buildingInventories.lumberjack.wood = 10
    const p1 = { x: LUMBERJACK_SPOT.x, y: LUMBERJACK_SPOT.y, inventory: { ...emptyInv() } }
    const p2 = { x: LUMBERJACK_SPOT.x + 2, y: LUMBERJACK_SPOT.y, inventory: { ...emptyInv() } }
    w.players = [p1, p2]
    w.updateBuildingCollection()
    const total = p1.inventory.wood + p2.inventory.wood
    expect(total).toBeGreaterThan(0)
    expect(w.buildingInventories.lumberjack.wood).toBeLessThan(10)
  })
})

// ── updateAutoTransporters: state machine ─────────────────────────────────────

describe('updateAutoTransporters — state machine', () => {
  it('loading: picks up resources from building inventory', () => {
    const w = makeCtx()
    game.buildings.lumberjack = 0 // prevent syncAutoTransporters from adding another
    w.buildingInventories.lumberjack.wood = 10
    const at = {
      buildingId: 'lumberjack',
      state: 'loading',
      waitTimer: 0,
      x: LUMBERJACK_SPOT.x + AT_DOCK_X_OFFSET,
      y: LUMBERJACK_SPOT.y,
      inventory: { ...emptyInv() },
      facing: 1,
      loadTimer: 0,
      stateTimer: 0,
    }
    w.autoTransporters = [at]
    w.updateAutoTransporters(6.5) // exceed timeout with resources
    // Should have loaded resources and moved to to_village
    expect(at.state).toBe('to_village')
    expect(Object.values(at.inventory).reduce((a, b) => a + b, 0)).toBeGreaterThan(0)
  })

  it('to_village: deposits at village and transitions to to_building', () => {
    const w = makeCtx()
    game.buildings.lumberjack = 0
    game.wood = 0
    const at = {
      buildingId: 'lumberjack',
      state: 'to_village',
      waitTimer: 0,
      x: VILLAGE.x - 10, y: VILLAGE.y, // close to village
      inventory: { ...emptyInv(), wood: 5 },
      facing: 1,
      loadTimer: 0,
      stateTimer: 0,
    }
    w.autoTransporters = [at]
    w.updateAutoTransporters(5) // large dt → reaches village
    expect(game.wood).toBe(5)
    expect(at.state).toBe('to_building')
    expect(at.inventory.wood).toBe(0)
  })

  it('to_building: returns to dock and transitions to loading', () => {
    const w = makeCtx()
    game.buildings.lumberjack = 0
    const dockX = LUMBERJACK_SPOT.x + AT_DOCK_X_OFFSET
    const dockY = LUMBERJACK_SPOT.y
    const at = {
      buildingId: 'lumberjack',
      state: 'to_building',
      waitTimer: 0,
      // Start within d<=4 to directly trigger the else (snap+transition) branch
      x: dockX + 3, y: dockY,
      inventory: emptyInv(),
      facing: 1,
      loadTimer: 0,
      stateTimer: 0,
    }
    w.autoTransporters = [at]
    w.updateAutoTransporters(0.1)
    expect(at.x).toBeCloseTo(dockX, 0)
    expect(at.y).toBeCloseTo(dockY, 0)
    expect(at.state).toBe('loading')
  })
})
