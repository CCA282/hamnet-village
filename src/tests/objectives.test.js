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
    { id: 'charrette',   done: () => game.upgrades.charrette >= 1 },
    { id: 'village_3',   done: () => game.villageLevel >= 3 },
  ],
  3: [
    { id: 'faucille',    done: () => game.upgrades.faucille >= 1 },
    { id: 'quarry',      done: () => game.buildings.quarry > 0 },
    { id: 'garden',      done: () => game.buildings.garden > 0 },
    { id: 'meteorite',   done: () => game.meteorite > 0 || game.upgrades.pioche_stellaire >= 1 },
    { id: 'village_4',   done: () => game.villageLevel >= 4 },
  ],
  4: [
    { id: 'pioche_stell',   done: () => game.upgrades.pioche_stellaire >= 1 },
    { id: 'astronomy',      done: () => game.buildings.astronomy > 0 },
    { id: 'puits',          done: () => game.buildings.puits > 0 },
    { id: 'water_noisette', done: () => game.noisetierWatered },
    { id: 'pet_squirrel',   done: () => game.squirrelPetted, showWhen: () => game.noisetierStage >= 3 },
  ],
}

function objectivesFor(level) { return OBJECTIVES[level] ?? [] }
function doneCount(level) { return objectivesFor(level).filter((o) => o.done()).length }

// Mirrors the `objectives` computed from Objectives.vue
function computeObjectives() {
  const all = []
  for (let lvl = 1; lvl < game.villageLevel; lvl++) {
    if (OBJECTIVES[lvl]) {
      all.push(
        ...OBJECTIVES[lvl]
          .filter((o) => !o.done() && (!o.showWhen || o.showWhen()))
          .map((o) => ({ ...o, carried: true }))
      )
    }
  }
  if (OBJECTIVES[game.villageLevel]) {
    all.push(
      ...OBJECTIVES[game.villageLevel]
        .filter((o) => !o.showWhen || o.showWhen())
        .map((o) => ({ ...o, carried: false }))
    )
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

  it('has 5 objectives (quarry moved to level 3)', () => {
    expect(objectivesFor(2).length).toBe(5)
    expect(objectivesFor(2).map((o) => o.id)).not.toContain('quarry')
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

  it('has quarry (moved from level 2) and no astronomy (moved to level 4)', () => {
    const ids = objectivesFor(3).map((o) => o.id)
    expect(ids).toContain('quarry')
    expect(ids).not.toContain('astronomy')
  })

  it('quarry objective done when quarry is built', () => {
    game.buildings.quarry = 1
    const o = objectivesFor(3).find((o) => o.id === 'quarry')
    expect(o.done()).toBe(true)
  })

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

  it('has astronomy objective (moved from level 3)', () => {
    expect(objectivesFor(4).map((o) => o.id)).toContain('astronomy')
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

  it('water_noisette objective done when noisetierWatered is true', () => {
    game.noisetierWatered = true
    const o = objectivesFor(4).find((o) => o.id === 'water_noisette')
    expect(o.done()).toBe(true)
  })

  it('water_noisette objective not done initially', () => {
    game.noisetierWatered = false
    const o = objectivesFor(4).find((o) => o.id === 'water_noisette')
    expect(o.done()).toBe(false)
  })

  it('pet_squirrel hidden until noisetierStage >= 3', () => {
    game.villageLevel = 4
    game.noisetierStage = 2
    const list = computeObjectives()
    expect(list.map((o) => o.id)).not.toContain('pet_squirrel')
  })

  it('pet_squirrel visible once noisetierStage reaches 3', () => {
    game.villageLevel = 4
    game.noisetierStage = 3
    const list = computeObjectives()
    expect(list.map((o) => o.id)).toContain('pet_squirrel')
  })

  it('pet_squirrel objective done when squirrelPetted is true', () => {
    game.squirrelPetted = true
    const o = objectivesFor(4).find((o) => o.id === 'pet_squirrel')
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

  it('only incomplete level-2 objectives carry to level 3 (fishinghut not built)', () => {
    game.villageLevel = 3
    // complete everything at level 1
    game.upgrades.hache = 1; game.buildings.lumberjack = 1
    // complete most of level 2 but not fishinghut
    game.upgrades.fishing_rod = 1
    game.upgrades.pioche = 1; game.upgrades.charrette = 1
    const carried = computeObjectives().filter((o) => o.carried)
    expect(carried.map((o) => o.id)).toContain('fishinghut')
    expect(carried.map((o) => o.id)).not.toContain('fishing_rod')
    expect(carried.map((o) => o.id)).not.toContain('hache')
  })

  it('carried objective disappears once completed', () => {
    // advance to level 3 with fishinghut still missing
    game.villageLevel = 3
    game.upgrades.hache = 1; game.buildings.lumberjack = 1
    game.upgrades.fishing_rod = 1
    game.upgrades.pioche = 1; game.upgrades.charrette = 1
    const missing = computeObjectives().filter((o) => o.id === 'fishinghut' && o.carried)
    expect(missing.length).toBe(1)

    // now build the fishinghut
    game.buildings.fishinghut = 1
    const done = computeObjectives().filter((o) => o.id === 'fishinghut' && o.carried)
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
    // level 2: only pioche bought, rest missing (no quarry here anymore)
    game.upgrades.pioche = 1
    // level 3: quarry and garden built, faucille/meteorite/village_4 missing
    game.buildings.quarry = 1; game.buildings.garden = 1
    const carried = computeObjectives().filter((o) => o.carried)
    const carriedIds = carried.map((o) => o.id)
    // from level 1
    expect(carriedIds).toContain('hache')
    // from level 2
    expect(carriedIds).toContain('fishing_rod')
    expect(carriedIds).toContain('fishinghut')
    // from level 3
    expect(carriedIds).toContain('faucille')
    expect(carriedIds).toContain('meteorite')
    // completed ones should NOT appear
    expect(carriedIds).not.toContain('lumberjack')
    expect(carriedIds).not.toContain('pioche')
    expect(carriedIds).not.toContain('quarry')
    expect(carriedIds).not.toContain('garden')
  })
})
