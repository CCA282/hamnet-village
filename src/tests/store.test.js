import { describe, it, expect, beforeEach } from 'vitest'

// store.js uses Vue reactive — mock it so tests run in node environment
import { vi } from 'vitest'
vi.mock('vue', () => ({ reactive: (obj) => obj }))

const { upgradeCost, globalCap, menuEntries, canUpgradeVillage, game } = await import('../game/store.js')

describe('upgradeCost', () => {
  beforeEach(() => {
    Object.keys(game.upgrades).forEach((k) => (game.upgrades[k] = 0))
  })

  it('returns baseCost at level 0', () => {
    expect(upgradeCost('speed')).toEqual({ wood: 12 })
  })

  it('applies growth multiplier at level 1', () => {
    game.upgrades.speed = 1
    const cost = upgradeCost('speed')
    expect(cost.wood).toBe(Math.round(12 * 1.7))
  })

  it('returns fixed costs[] for cap_wood', () => {
    game.upgrades.cap_wood = 0
    expect(upgradeCost('cap_wood')).toEqual({ wood: 8 })
    game.upgrades.cap_wood = 3
    expect(upgradeCost('cap_wood')).toEqual({ wood: 70 })
  })

  it('clamps costs[] to last entry when maxed', () => {
    game.upgrades.cap_wood = 6 // beyond max
    expect(upgradeCost('cap_wood')).toEqual({ wood: 400 })
  })

  it('returns correct cost for village_lvl at each level', () => {
    game.upgrades.village_lvl = 0
    expect(upgradeCost('village_lvl')).toEqual({ wood: 40, fish: 25 })
    game.upgrades.village_lvl = 1
    expect(upgradeCost('village_lvl')).toEqual({ wood: 60, berries: 20, stone: 30 })
  })
})

describe('canUpgradeVillage', () => {
  beforeEach(() => {
    game.upgrades.village_lvl = 0
    game.wood = 0; game.fish = 0
    game.devMode = false
  })

  it('returns false when resources are insufficient', () => {
    game.wood = 0; game.fish = 0
    expect(canUpgradeVillage()).toBe(false)
  })

  it('returns true when resources meet the level-1 upgrade cost', () => {
    game.wood = 40; game.fish = 25
    expect(canUpgradeVillage()).toBe(true)
  })

  it('returns false when village is already at max level', () => {
    game.upgrades.village_lvl = 3 // max
    game.wood = 9999; game.fish = 9999; game.stone = 9999; game.berries = 9999; game.meteorite = 9999
    expect(canUpgradeVillage()).toBe(false)
  })

  it('returns true in devMode regardless of resources', () => {
    game.devMode = true
    expect(canUpgradeVillage()).toBe(true)
  })
})

describe('menuEntries — requiresLevel filtering', () => {
  beforeEach(() => {
    game.menuTab = 1 // outils tab (contains pioche_stellaire)
    game.villageLevel = 1
    game.upgrades.pioche = 1 // isolate requiresLevel from requiresUpgrade below
  })

  it('hides pioche_stellaire at village level 1', () => {
    game.villageLevel = 1
    expect(menuEntries()).not.toContain('pioche_stellaire')
  })

  it('hides pioche_stellaire at village level 2', () => {
    game.villageLevel = 2
    expect(menuEntries()).not.toContain('pioche_stellaire')
  })

  it('shows pioche_stellaire at village level 3', () => {
    game.villageLevel = 3
    expect(menuEntries()).toContain('pioche_stellaire')
  })

  it('shows other tools (hache, pioche) at village level 1', () => {
    game.villageLevel = 1
    const entries = menuEntries()
    expect(entries).toContain('hache')
    expect(entries).toContain('pioche')
  })
})

// Regression: VillageMenu.vue used to filter pioche_stellaire on its own
// (owns pioche) while menu.js's keyboard/gamepad navigation filtered on
// requiresLevel only — the two lists could differ in length/order, so
// game.menuIndex (driven by the nav list) pointed at a different row than
// what was rendered. Buying "the selected row" via keyboard/gamepad could
// then silently target the wrong upgrade (e.g. fishing_rod's neighbor).
// See src/components/VillageMenu.vue's `entries` computed.
describe('menuEntries — requiresUpgrade filtering (keeps VillageMenu.vue in sync)', () => {
  beforeEach(() => {
    game.menuTab = 1
    game.villageLevel = 3 // requiresLevel satisfied
    game.upgrades.pioche = 0
  })

  it('hides pioche_stellaire when pioche is not owned, even at village level 3', () => {
    expect(menuEntries()).not.toContain('pioche_stellaire')
  })

  it('shows pioche_stellaire once pioche is owned', () => {
    game.upgrades.pioche = 1
    expect(menuEntries()).toContain('pioche_stellaire')
  })

  it('keeps fishing_rod at a stable index regardless of pioche_stellaire visibility', () => {
    // Without pioche_stellaire in the list (not owning pioche), fishing_rod
    // must still be found by key — this is what game.menuIndex ultimately
    // resolves to via entries()[getIndex()] in menu.js's buySelected().
    expect(menuEntries()).toEqual(['hache', 'pioche', 'fishing_rod', 'faucille'])
    game.upgrades.pioche = 1
    expect(menuEntries()).toEqual(['hache', 'pioche', 'pioche_stellaire', 'fishing_rod', 'faucille'])
  })
})

describe('globalCap', () => {
  beforeEach(() => {
    game.upgrades.cap_wood = 0
    game.upgrades.cap_fish = 0
    game.upgrades.cap_stone = 0
    game.upgrades.cap_berries = 0
  })

  it('starts at 25', () => {
    expect(globalCap('wood')).toBe(25)
  })

  it('increases with upgrades', () => {
    game.upgrades.cap_wood = 1
    expect(globalCap('wood')).toBe(50)
    game.upgrades.cap_wood = 3
    expect(globalCap('wood')).toBe(100)
    game.upgrades.cap_wood = 6
    expect(globalCap('wood')).toBe(1000)
  })

  it('caps at max level', () => {
    game.upgrades.cap_fish = 99
    expect(globalCap('fish')).toBe(1000)
  })
})
