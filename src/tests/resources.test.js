import { describe, it, expect, beforeEach } from 'vitest'
import { vi } from 'vitest'

vi.mock('vue', () => ({ reactive: (obj) => obj, watch: () => {} }))
vi.mock('../net/netState.js', () => ({
  netState: { mode: null, playerName: '' },
}))

const { resourceMethods } = await import('../game/world/resources.js')
const { game, resetGame } = await import('../game/store.js')
import { TREE_HP, STONE_HP, BERRY_HP } from '../game/constants/index.js'

function makePlayer(invOverrides = {}) {
  return {
    x: 0, y: 0,
    inventory: { wood: 0, fish: 0, stone: 0, berries: 0, meteorite: 0, ...invOverrides },
  }
}

function makeCtx(overrides = {}) {
  return {
    ...resourceMethods,
    trees: [],
    fishSpots: [],
    stoneSpots: [],
    berryBushes: [],
    players: [],
    particles: [],
    time: 0,
    spawnIcon: vi.fn(),
    spawnLeaves: vi.fn(),
    spawnRipple: vi.fn(),
    ...overrides,
  }
}

beforeEach(() => resetGame())

// ── harvestToPlayer — solo ─────────────────────────────────────────────────────

describe('harvestToPlayer — solo', () => {
  it('adds resource to inventory and returns true', () => {
    const w = makeCtx()
    const p = makePlayer()
    expect(w.harvestToPlayer(p, 'wood', 1)).toBe(true)
    expect(p.inventory.wood).toBe(1)
  })

  it('increments game.totalHarvested', () => {
    const w = makeCtx()
    w.harvestToPlayer(makePlayer(), 'fish', 3)
    expect(game.totalHarvested).toBe(3)
  })

  it('returns false when inventory is full (9 items)', () => {
    const w = makeCtx()
    const p = makePlayer({ wood: 9 })
    expect(w.harvestToPlayer(p, 'stone', 1)).toBe(false)
    expect(p.inventory.stone).toBe(0)
  })

  it('respects bag_size upgrade on capacity', () => {
    const w = makeCtx()
    game.upgrades.bag_size = 1 // max becomes 12
    const p = makePlayer({ wood: 9 }) // 9/12 used
    expect(w.harvestToPlayer(p, 'stone', 1)).toBe(true)
  })

  it('counts all resources for inventory total', () => {
    const w = makeCtx()
    const p = makePlayer({ wood: 3, fish: 3, stone: 3 }) // 9 total
    expect(w.harvestToPlayer(p, 'berries', 1)).toBe(false)
  })
})

// ── depositPlayerInventory ─────────────────────────────────────────────────────

describe('depositPlayerInventory — solo', () => {
  it('transfers all inventory to game stock', () => {
    const w = makeCtx()
    const p = makePlayer({ wood: 5, fish: 2 })
    p.x = 0; p.y = 0
    w.depositPlayerInventory(p)
    expect(game.wood).toBe(5)
    expect(game.fish).toBe(2)
    expect(p.inventory.wood).toBe(0)
    expect(p.inventory.fish).toBe(0)
  })

  it('leaves remainder when global cap is reached', () => {
    const w = makeCtx()
    game.wood = 24 // 1 below cap (25)
    const p = makePlayer({ wood: 10 })
    p.x = 0; p.y = 0
    w.depositPlayerInventory(p)
    expect(game.wood).toBe(25)
    expect(p.inventory.wood).toBe(9) // 9 not deposited
  })

  it('spawns icon for each deposited resource', () => {
    const w = makeCtx()
    const p = makePlayer({ wood: 3, fish: 1 })
    p.x = 100; p.y = 200
    w.depositPlayerInventory(p)
    expect(w.spawnIcon).toHaveBeenCalledTimes(2)
  })
})

describe('depositPlayerInventory — local co-op', () => {
  it('two players can deposit independently', () => {
    const w = makeCtx()
    const p1 = makePlayer({ wood: 5 })
    const p2 = makePlayer({ fish: 3 })
    p1.x = 0; p1.y = 0; p2.x = 0; p2.y = 0
    w.depositPlayerInventory(p1)
    w.depositPlayerInventory(p2)
    expect(game.wood).toBe(5)
    expect(game.fish).toBe(3)
  })

  it('combined deposit respects global cap', () => {
    const w = makeCtx()
    game.wood = 20
    const p1 = makePlayer({ wood: 4 })
    const p2 = makePlayer({ wood: 4 })
    p1.x = 0; p1.y = 0; p2.x = 0; p2.y = 0
    w.depositPlayerInventory(p1)
    w.depositPlayerInventory(p2)
    expect(game.wood).toBe(25) // capped
  })
})

// ── updateTrees ────────────────────────────────────────────────────────────────

describe('updateTrees', () => {
  it('reduces shake over time', () => {
    const w = makeCtx({ trees: [{ x: 100, y: 100, hp: 2, maxHp: 3, regrow: 0, shake: 0.5 }] })
    w.updateTrees(0.3)
    expect(w.trees[0].shake).toBeLessThan(0.5)
    expect(w.trees[0].shake).toBeGreaterThanOrEqual(0)
  })

  it('decrements regrow timer on fallen tree', () => {
    const w = makeCtx({ trees: [{ x: 100, y: 100, hp: 0, maxHp: 3, regrow: 10, shake: 0 }] })
    w.updateTrees(2)
    expect(w.trees[0].regrow).toBe(8)
  })

  it('restores fallen tree when regrow expires', () => {
    const w = makeCtx({ trees: [{ x: 100, y: 100, hp: 0, maxHp: 3, regrow: 0.5, shake: 0 }] })
    w.updateTrees(1) // regrow expires
    expect(w.trees[0].hp).toBe(TREE_HP)
  })

  it('increases maxHp when harvest_yield upgrades mid-game', () => {
    const w = makeCtx({ trees: [{ x: 100, y: 100, hp: 3, maxHp: 3, regrow: 0, shake: 0 }] })
    game.upgrades.harvest_yield = 1 // new max = 4
    w.updateTrees(0.01)
    expect(w.trees[0].maxHp).toBe(4)
    expect(w.trees[0].hp).toBe(4)
  })
})

// ── updateStone / updateBerries ────────────────────────────────────────────────

describe('updateStone', () => {
  it('restores stone when regrow expires', () => {
    const w = makeCtx({
      stoneSpots: [{ x: 200, y: 200, hp: 0, maxHp: 3, regrow: 0.5 }],
      berryBushes: [],
    })
    w.updateStone(1)
    expect(w.stoneSpots[0].hp).toBe(STONE_HP)
  })

  it('restores berries when regrow expires', () => {
    const w = makeCtx({
      stoneSpots: [],
      berryBushes: [{ x: 300, y: 300, hp: 0, maxHp: 3, regrow: 0.5 }],
    })
    w.updateStone(1)
    expect(w.berryBushes[0].hp).toBe(BERRY_HP)
  })
})

// ── effectiveHarvestCd ─────────────────────────────────────────────────────────

describe('effectiveHarvestCd', () => {
  it('base cooldown is 0.65s', () => {
    const w = makeCtx()
    expect(w.effectiveHarvestCd()).toBeCloseTo(0.65)
  })

  it('decreases with harvest_speed upgrade', () => {
    const w = makeCtx()
    game.upgrades.harvest_speed = 1
    expect(w.effectiveHarvestCd()).toBeCloseTo(0.65 * 0.8)
  })

  it('is strictly positive even at high upgrade level', () => {
    const w = makeCtx()
    game.upgrades.harvest_speed = 10
    expect(w.effectiveHarvestCd()).toBeGreaterThan(0)
  })
})
