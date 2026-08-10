import { describe, it, expect, beforeEach } from 'vitest'
import { vi } from 'vitest'

vi.mock('vue', () => ({ reactive: (obj) => obj, watch: () => {}, computed: (fn) => ({ value: fn() }) }))
vi.mock('../net/netState.js', () => ({ netState: { mode: null, playerName: '' } }))

const { game, resetGame } = await import('../game/store.js')

// Mirror the objectives definition from Objectives.vue so we can test the
// conditions without mounting the component (no DOM / Vue mount needed).
const OBJECTIVES = {
  1: [
    { id: 'hache',       done: () => game.upgrades.hache >= 1 },
    { id: 'lumberjack',  done: () => game.buildings.lumberjack > 0 },
    { id: 'village_2',   done: () => game.villageLevel >= 2 },
  ],
  2: [
    { id: 'fishing_rod', done: () => game.upgrades.fishing_rod >= 1 },
    { id: 'fishinghut',  done: () => game.buildings.fishinghut > 0 },
    { id: 'pioche',      done: () => game.upgrades.pioche >= 1 },
    { id: 'quarry',      done: () => game.buildings.quarry > 0 },
    { id: 'charrette',   done: () => game.upgrades.charrette >= 1 },
    { id: 'village_3',   done: () => game.villageLevel >= 3 },
  ],
  3: [
    { id: 'faucille',    done: () => game.upgrades.faucille >= 1 },
    { id: 'garden',      done: () => game.buildings.garden > 0 },
    { id: 'astronomy',   done: () => game.buildings.astronomy > 0 },
    { id: 'meteorite',   done: () => game.meteorite > 0 || game.upgrades.pioche_stellaire >= 1 },
    { id: 'village_4',   done: () => game.villageLevel >= 4 },
  ],
  4: [
    { id: 'pioche_stell', done: () => game.upgrades.pioche_stellaire >= 1 },
    { id: 'puits',        done: () => game.buildings.puits > 0 },
  ],
}

function objectivesFor(level) { return OBJECTIVES[level] ?? [] }
function doneCount(level) { return objectivesFor(level).filter((o) => o.done()).length }

beforeEach(() => resetGame())

// ── Level 1 objectives ────────────────────────────────────────────────────────

describe('objectives — level 1', () => {
  beforeEach(() => { game.villageLevel = 1 })

  it('all level-1 objectives start undone', () => {
    expect(doneCount(1)).toBe(0)
  })

  it('hache objective done when hache is purchased', () => {
    game.upgrades.hache = 1
    const o = objectivesFor(1).find((o) => o.id === 'hache')
    expect(o.done()).toBe(true)
  })

  it('lumberjack objective done when building is built', () => {
    game.buildings.lumberjack = 1
    const o = objectivesFor(1).find((o) => o.id === 'lumberjack')
    expect(o.done()).toBe(true)
  })

  it('village_2 objective done when villageLevel reaches 2', () => {
    game.villageLevel = 2
    const o = objectivesFor(1).find((o) => o.id === 'village_2')
    expect(o.done()).toBe(true)
  })

  it('all level-1 objectives complete when prerequisites met', () => {
    game.upgrades.hache = 1
    game.buildings.lumberjack = 1
    game.villageLevel = 2
    expect(doneCount(1)).toBe(3)
  })
})

// ── Level 2 objectives ────────────────────────────────────────────────────────

describe('objectives — level 2', () => {
  beforeEach(() => { game.villageLevel = 2 })

  it('all level-2 objectives start undone', () => {
    expect(doneCount(2)).toBe(0)
  })

  it('charrette objective done when cart is purchased', () => {
    game.upgrades.charrette = 1
    const o = objectivesFor(2).find((o) => o.id === 'charrette')
    expect(o.done()).toBe(true)
  })

  it('village_3 objective done when villageLevel reaches 3', () => {
    game.villageLevel = 3
    const o = objectivesFor(2).find((o) => o.id === 'village_3')
    expect(o.done()).toBe(true)
  })
})

// ── Level 3 objectives ────────────────────────────────────────────────────────

describe('objectives — level 3', () => {
  beforeEach(() => { game.villageLevel = 3 })

  it('meteorite objective done when game.meteorite > 0', () => {
    game.meteorite = 5
    const o = objectivesFor(3).find((o) => o.id === 'meteorite')
    expect(o.done()).toBe(true)
  })

  it('meteorite objective done when pioche_stellaire is owned (proxy)', () => {
    game.meteorite = 0
    game.upgrades.pioche_stellaire = 1
    const o = objectivesFor(3).find((o) => o.id === 'meteorite')
    expect(o.done()).toBe(true)
  })

  it('meteorite objective not done when neither meteorite nor pioche_stellaire', () => {
    game.meteorite = 0
    game.upgrades.pioche_stellaire = 0
    const o = objectivesFor(3).find((o) => o.id === 'meteorite')
    expect(o.done()).toBe(false)
  })
})

// ── Level 4 objectives ────────────────────────────────────────────────────────

describe('objectives — level 4', () => {
  beforeEach(() => { game.villageLevel = 4 })

  it('shows 2 objectives at level 4', () => {
    expect(objectivesFor(4).length).toBe(2)
  })

  it('pioche_stellaire objective done when purchased', () => {
    game.upgrades.pioche_stellaire = 1
    const o = objectivesFor(4).find((o) => o.id === 'pioche_stell')
    expect(o.done()).toBe(true)
  })

  it('puits objective done when puits is built', () => {
    game.buildings.puits = 1
    const o = objectivesFor(4).find((o) => o.id === 'puits')
    expect(o.done()).toBe(true)
  })
})

// ── No objectives beyond level 4 ─────────────────────────────────────────────

describe('objectives — beyond defined levels', () => {
  it('returns empty list for undefined levels', () => {
    expect(objectivesFor(5)).toEqual([])
    expect(objectivesFor(99)).toEqual([])
  })
})
