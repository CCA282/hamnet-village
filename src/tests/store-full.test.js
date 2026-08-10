import { describe, it, expect, beforeEach } from 'vitest'
import { vi } from 'vitest'

vi.mock('vue', () => ({ reactive: (obj) => obj }))

const {
  game, resetGame,
  buyUpgrade, upgradeMaxed, canAfford,
  build, harvest,
  effectiveInventoryMax, effectiveCartCapacity,
  buildingUpgradeCost, buyBuildingUpgrade, buildingMenuEntries,
} = await import('../game/store.js')

beforeEach(() => resetGame())

// ── canAfford ──────────────────────────────────────────────────────────────────

describe('canAfford', () => {
  it('true when resources are sufficient', () => {
    game.wood = 10
    expect(canAfford({ wood: 10 })).toBe(true)
  })

  it('false when a resource is lacking', () => {
    game.wood = 5
    expect(canAfford({ wood: 10 })).toBe(false)
  })

  it('true in devMode regardless of resources', () => {
    game.devMode = true
    game.wood = 0
    expect(canAfford({ wood: 999 })).toBe(true)
  })
})

// ── buyUpgrade ─────────────────────────────────────────────────────────────────

describe('buyUpgrade', () => {
  it('succeeds when resources available', () => {
    game.wood = 100
    const ok = buyUpgrade('speed')
    expect(ok).toBe(true)
    expect(game.upgrades.speed).toBe(1)
  })

  it('deducts cost on success', () => {
    game.wood = 50
    buyUpgrade('speed') // costs 12 wood
    expect(game.wood).toBe(38)
  })

  it('fails when not enough resources', () => {
    game.wood = 0
    const ok = buyUpgrade('speed')
    expect(ok).toBe(false)
    expect(game.upgrades.speed).toBe(0)
  })

  it('fails when upgrade is maxed', () => {
    game.upgrades.hache = 1 // max = 1
    const ok = buyUpgrade('hache')
    expect(ok).toBe(false)
  })

  it('devMode skips payment', () => {
    game.devMode = true
    game.wood = 0
    const ok = buyUpgrade('speed')
    expect(ok).toBe(true)
    expect(game.wood).toBe(0) // nothing deducted
  })

  it('upgrades village_lvl and sets villageLevel', () => {
    game.wood = 100; game.fish = 100
    buyUpgrade('village_lvl') // costs { wood: 40, fish: 25 }
    expect(game.upgrades.village_lvl).toBe(1)
    expect(game.villageLevel).toBe(2)
  })
})

describe('upgradeMaxed', () => {
  it('returns true when at max', () => {
    game.upgrades.hache = 1 // max = 1
    expect(upgradeMaxed('hache')).toBe(true)
  })

  it('returns false when not maxed', () => {
    expect(upgradeMaxed('speed')).toBe(false)
  })
})

// ── build ──────────────────────────────────────────────────────────────────────

describe('build', () => {
  it('builds when affordable and conditions met', () => {
    game.wood = 20; game.villageLevel = 1
    const ok = build('lumberjack')
    expect(ok).toBe(true)
    expect(game.buildings.lumberjack).toBe(1)
  })

  it('deducts cost on build', () => {
    game.wood = 20; game.villageLevel = 1
    build('lumberjack') // costs { wood: 15 }
    expect(game.wood).toBe(5)
  })

  it('fails when already built', () => {
    game.buildings.lumberjack = 1
    game.wood = 50; game.villageLevel = 1
    const ok = build('lumberjack')
    expect(ok).toBe(false)
  })

  it('fails when village level too low', () => {
    game.wood = 30; game.stone = 20; game.villageLevel = 1
    const ok = build('quarry') // requiresLevel: 3
    expect(ok).toBe(false)
  })

  it('fails when required upgrade not owned', () => {
    game.wood = 100; game.stone = 100; game.villageLevel = 4
    game.upgrades.pioche_stellaire = 0
    const ok = build('puits') // requiresUpgrade: 'pioche_stellaire'
    expect(ok).toBe(false)
  })
})

// ── harvest ────────────────────────────────────────────────────────────────────

describe('harvest', () => {
  it('adds to global stock', () => {
    game.wood = 0
    harvest('wood', 5)
    expect(game.wood).toBe(5)
  })

  it('increments totalHarvested', () => {
    game.totalHarvested = 0
    harvest('wood', 3)
    expect(game.totalHarvested).toBe(3)
  })

  it('is capped by globalCap', () => {
    game.wood = 23 // 2 below cap (25)
    const added = harvest('wood', 10)
    expect(added).toBe(2)
    expect(game.wood).toBe(25)
  })

  it('returns 0 when already at cap', () => {
    game.wood = 25
    const added = harvest('wood', 5)
    expect(added).toBe(0)
    expect(game.wood).toBe(25)
  })
})

// ── effectiveInventoryMax ──────────────────────────────────────────────────────

describe('effectiveInventoryMax', () => {
  it('is 9 at base', () => {
    expect(effectiveInventoryMax()).toBe(9)
  })

  it('increases by 3 per bag_size level', () => {
    game.upgrades.bag_size = 2
    expect(effectiveInventoryMax()).toBe(15)
  })
})

// ── effectiveCartCapacity ──────────────────────────────────────────────────────

describe('effectiveCartCapacity', () => {
  it('is 18 at base', () => {
    expect(effectiveCartCapacity()).toBe(18)
  })

  it('increases by 9 per cart_size level', () => {
    game.upgrades.cart_size = 1
    expect(effectiveCartCapacity()).toBe(27)
  })
})

// ── buildingUpgrade ────────────────────────────────────────────────────────────

describe('buildingUpgradeCost', () => {
  it('returns cost at level 0', () => {
    expect(buildingUpgradeCost('lumberjack', 'storage')).toEqual({ wood: 30 })
  })

  it('returns next level cost after upgrade', () => {
    game.buildingUpgrades.lumberjack.storage = 1
    expect(buildingUpgradeCost('lumberjack', 'storage')).toEqual({ wood: 80 })
  })

  it('returns empty object for unknown type', () => {
    expect(buildingUpgradeCost('lumberjack', 'nonexistent')).toEqual({})
  })
})

describe('buyBuildingUpgrade', () => {
  it('succeeds and increments level', () => {
    game.wood = 50
    const ok = buyBuildingUpgrade('lumberjack', 'storage')
    expect(ok).toBe(true)
    expect(game.buildingUpgrades.lumberjack.storage).toBe(1)
  })

  it('fails when already maxed (max 3)', () => {
    game.buildingUpgrades.lumberjack.storage = 3
    game.wood = 500
    const ok = buyBuildingUpgrade('lumberjack', 'storage')
    expect(ok).toBe(false)
  })

  it('fails when cannot afford', () => {
    game.wood = 0
    const ok = buyBuildingUpgrade('lumberjack', 'storage')
    expect(ok).toBe(false)
    expect(game.buildingUpgrades.lumberjack.storage).toBe(0)
  })
})

describe('buildingMenuEntries', () => {
  it('shows storage, speed, transporter for a standard building', () => {
    const entries = buildingMenuEntries('lumberjack')
    expect(entries).toContain('storage')
    expect(entries).toContain('speed')
    expect(entries).toContain('transporter')
  })

  it('hides transporter_speed when transporter not owned', () => {
    game.buildingUpgrades.lumberjack.transporter = 0
    const entries = buildingMenuEntries('lumberjack')
    expect(entries).not.toContain('transporter_speed')
  })

  it('shows transporter_speed when transporter is owned', () => {
    game.buildingUpgrades.lumberjack.transporter = 1
    const entries = buildingMenuEntries('lumberjack')
    expect(entries).toContain('transporter_speed')
  })

  it('returns empty array for puits (no upgrades)', () => {
    expect(buildingMenuEntries('puits')).toEqual([])
  })
})
