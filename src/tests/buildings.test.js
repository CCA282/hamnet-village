import { describe, it, expect } from 'vitest'
import { BUILDINGS, BUILD_SPOTS } from '../game/constants/index.js'

describe('BUILDINGS definitions', () => {
  it('every building has required fields', () => {
    for (const [id, def] of Object.entries(BUILDINGS)) {
      expect(def.name, `${id}.name`).toBeTruthy()
      expect(def.sprite, `${id}.sprite`).toBeTruthy()
      expect(def.produces, `${id}.produces`).toMatch(/^(wood|fish|stone|berries)$/)
      expect(def.amount, `${id}.amount`).toBeGreaterThan(0)
      expect(def.interval, `${id}.interval`).toBeGreaterThan(0)
      expect(def.requiresLevel, `${id}.requiresLevel`).toBeGreaterThanOrEqual(1)
    }
  })

  it('every building has a corresponding BUILD_SPOT', () => {
    for (const id of Object.keys(BUILDINGS)) {
      const spot = BUILD_SPOTS.find((s) => s.building === id)
      expect(spot, `BUILD_SPOT missing for '${id}'`).toBeDefined()
    }
  })

  it('BUILD_SPOTS have unique ids', () => {
    const ids = BUILD_SPOTS.map((s) => s.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('BUILD_SPOTS are within world bounds', () => {
    const WORLD_W = 1000, WORLD_H = 620
    for (const spot of BUILD_SPOTS) {
      expect(spot.x, `${spot.id}.x`).toBeGreaterThan(0)
      expect(spot.x, `${spot.id}.x`).toBeLessThan(WORLD_W)
      expect(spot.y, `${spot.id}.y`).toBeGreaterThan(0)
      expect(spot.y, `${spot.id}.y`).toBeLessThan(WORLD_H)
    }
  })

  it('requiresLevel is 1, 2 or 3', () => {
    for (const [id, def] of Object.entries(BUILDINGS)) {
      expect([1, 2, 3], `${id}.requiresLevel`).toContain(def.requiresLevel)
    }
  })
})
