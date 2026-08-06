import { describe, it, expect } from 'vitest'
import { HARVEST_COOLDOWN, PLAYER_INVENTORY_MAX, TREE_HP, STONE_HP, BERRY_HP } from '../game/constants/index.js'

// effectiveHarvestCd logic (extracted from world/resources.js for unit testing)
function effectiveHarvestCd(harvestSpeedLevel) {
  return HARVEST_COOLDOWN * Math.pow(0.8, harvestSpeedLevel)
}

// maxHp with harvest_yield
function resourceMaxHp(base, harvestYieldLevel) {
  return base + harvestYieldLevel
}

describe('harvest cooldown', () => {
  it('base cooldown is 0.65s', () => {
    expect(effectiveHarvestCd(0)).toBeCloseTo(0.65)
  })

  it('decreases with each harvest_speed level', () => {
    const base = effectiveHarvestCd(0)
    for (let lvl = 1; lvl <= 3; lvl++) {
      expect(effectiveHarvestCd(lvl)).toBeLessThan(effectiveHarvestCd(lvl - 1))
    }
    // Level 3 should be close to the old 0.34s base
    expect(effectiveHarvestCd(3)).toBeCloseTo(0.65 * 0.8 ** 3, 2)
  })

  it('never reaches zero', () => {
    expect(effectiveHarvestCd(3)).toBeGreaterThan(0)
  })
})

describe('harvest_yield effect on resource HP', () => {
  it('tree gets +1 HP per level', () => {
    expect(resourceMaxHp(TREE_HP, 0)).toBe(3)
    expect(resourceMaxHp(TREE_HP, 1)).toBe(4)
    expect(resourceMaxHp(TREE_HP, 3)).toBe(6)
  })

  it('stone gets +1 HP per level', () => {
    expect(resourceMaxHp(STONE_HP, 0)).toBe(3)
    expect(resourceMaxHp(STONE_HP, 2)).toBe(5)
  })

  it('berries get +1 HP per level', () => {
    expect(resourceMaxHp(BERRY_HP, 0)).toBe(3)
    expect(resourceMaxHp(BERRY_HP, 3)).toBe(6)
  })
})

describe('player inventory', () => {
  it('max is 9', () => {
    expect(PLAYER_INVENTORY_MAX).toBe(9)
  })
})
