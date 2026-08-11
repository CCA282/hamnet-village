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

// Mirrors the `objectives` computed from Objectives.vue
function computeObjectives() {
  const all = []
  for (let lvl = 1; lvl < game.villageLevel; lvl++) {
    if (OBJECTIVES[lvl]) {
      all.push(...OBJECTIVES[lvl].filter((o) => !o.done()).map((o) => ({ ...o, carried: true })))
    }
  }
  if (OBJECTIVES[game.villageLevel]) {
    all.push(...OBJECTIVES[game.villageLevel].map((o) => ({ ...o, carried: false })))
  }
  return all
}

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

// ── Carry-over: incomplete past-level objectives persist ──────────────────────

describe('objectives — carry-over', () => {
  it('incomplete level-1 objectives appear when advancing to level 2', () => {
    game.villageLevel = 2
    // nothing completed at level 1
    const list = computeObjectives()
    const carried = list.filter((o) => o.carried)
    expect(carried.map((o) => o.id)).toContain('hache')
    expect(carried.map((o) => o.id)).toContain('lumberjack')
  })

  it('completed level-1 objectives do NOT carry over to level 2', () => {
    game.villageLevel = 2
    game.upgrades.hache = 1
    game.buildings.lumberjack = 1
    // village_2 is done because villageLevel >= 2
    const carried = computeObjectives().filter((o) => o.carried)
    expect(carried.length).toBe(0)
  })

  it('only incomplete level-2 objectives carry to level 3 (quarry not built)', () => {
    game.villageLevel = 3
    // complete everything at level 1
    game.upgrades.hache = 1; game.buildings.lumberjack = 1
    // complete most of level 2 but not quarry
    game.upgrades.fishing_rod = 1; game.buildings.fishinghut = 1
    game.upgrades.pioche = 1; game.upgrades.charrette = 1
    const carried = computeObjectives().filter((o) => o.carried)
    expect(carried.map((o) => o.id)).toContain('quarry')
    expect(carried.map((o) => o.id)).not.toContain('fishing_rod')
    expect(carried.map((o) => o.id)).not.toContain('hache')
  })

  it('carried objective disappears once completed', () => {
    game.villageLevel = 2
    // quarry not yet built → carried
    const before = computeObjectives().filter((o) => o.id === 'quarry' && o.carried)
    expect(before.length).toBe(0) // quarry is a level-2 obj, not level-1, so not in carry at level 2

    // advance to level 3 with quarry still missing
    game.villageLevel = 3
    game.upgrades.hache = 1; game.buildings.lumberjack = 1
    game.upgrades.fishing_rod = 1; game.buildings.fishinghut = 1
    game.upgrades.pioche = 1; game.upgrades.charrette = 1
    const missing = computeObjectives().filter((o) => o.id === 'quarry' && o.carried)
    expect(missing.length).toBe(1)

    // now build the quarry
    game.buildings.quarry = 1
    const done = computeObjectives().filter((o) => o.id === 'quarry' && o.carried)
    expect(done.length).toBe(0)
  })

  it('current-level objectives always appear with carried: false', () => {
    game.villageLevel = 3
    const list = computeObjectives()
    const current = list.filter((o) => !o.carried)
    const ids = current.map((o) => o.id)
    expect(ids).toContain('faucille')
    expect(ids).toContain('garden')
    expect(ids).toContain('village_4')
  })

  it('accumulated carry-overs from multiple past levels', () => {
    game.villageLevel = 4
    // level 1: hache missing, lumberjack built, village_2 done
    game.buildings.lumberjack = 1
    // level 2: only pioche bought, rest missing
    game.upgrades.pioche = 1
    // level 3: astronomy built, rest missing
    game.buildings.astronomy = 1
    const carried = computeObjectives().filter((o) => o.carried)
    const carriedIds = carried.map((o) => o.id)
    // from level 1
    expect(carriedIds).toContain('hache')
    // from level 2
    expect(carriedIds).toContain('fishing_rod')
    expect(carriedIds).toContain('quarry')
    // from level 3
    expect(carriedIds).toContain('faucille')
    // completed ones should NOT appear
    expect(carriedIds).not.toContain('lumberjack')
    expect(carriedIds).not.toContain('pioche')
    expect(carriedIds).not.toContain('astronomy')
  })
})
