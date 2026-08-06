import { describe, it, expect, beforeEach } from 'vitest'

// store.js uses Vue reactive — mock it so tests run in node environment
import { vi } from 'vitest'
vi.mock('vue', () => ({ reactive: (obj) => obj }))

const { upgradeCost, globalCap, game } = await import('../game/store.js')

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
    expect(upgradeCost('village_lvl')).toEqual({ wood: 60, fish: 20, stone: 30 })
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
