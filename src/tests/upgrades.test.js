import { describe, it, expect } from 'vitest'
import { UPGRADES, GLOBAL_CAPACITY_LEVELS } from '../game/constants/index.js'

describe('UPGRADES definitions', () => {
  it('every upgrade has a name and max', () => {
    for (const [key, def] of Object.entries(UPGRADES)) {
      expect(def.name, `${key}.name`).toBeTruthy()
      expect(def.max, `${key}.max`).toBeGreaterThan(0)
    }
  })

  it('repeatable upgrades have growth or costs array', () => {
    for (const [key, def] of Object.entries(UPGRADES)) {
      if (!def.repeatable) continue
      const hasCosts = Array.isArray(def.costs) && def.costs.length > 0
      const hasGrowth = typeof def.baseCost === 'object' && typeof def.growth === 'number'
      expect(hasCosts || hasGrowth, `${key} must have costs[] or baseCost+growth`).toBe(true)
    }
  })

  it('costs[] length matches max for fixed-cost upgrades', () => {
    for (const [key, def] of Object.entries(UPGRADES)) {
      if (!Array.isArray(def.costs)) continue
      expect(def.costs.length, `${key}.costs.length`).toBe(def.max)
    }
  })

  it('storage upgrade costs never exceed current capacity', () => {
    const storageKeys = ['cap_wood', 'cap_fish', 'cap_stone', 'cap_berries']
    const resMap = { cap_wood: 'wood', cap_fish: 'fish', cap_stone: 'stone', cap_berries: 'berries' }
    for (const key of storageKeys) {
      const def = UPGRADES[key]
      for (let lvl = 0; lvl < def.max; lvl++) {
        const currentCap = GLOBAL_CAPACITY_LEVELS[lvl]
        const cost = def.costs[lvl]
        const res = resMap[key]
        expect(cost[res], `${key} level ${lvl + 1} cost (${cost[res]}) must be ≤ current cap (${currentCap})`)
          .toBeLessThanOrEqual(currentCap)
      }
    }
  })

  it('non-repeatable upgrades have max 1', () => {
    for (const [key, def] of Object.entries(UPGRADES)) {
      if (!def.repeatable) {
        expect(def.max, `${key}.max`).toBe(1)
      }
    }
  })
})

describe('GLOBAL_CAPACITY_LEVELS', () => {
  it('is strictly increasing', () => {
    for (let i = 1; i < GLOBAL_CAPACITY_LEVELS.length; i++) {
      expect(GLOBAL_CAPACITY_LEVELS[i]).toBeGreaterThan(GLOBAL_CAPACITY_LEVELS[i - 1])
    }
  })
})
