import { describe, it, expect, beforeEach } from 'vitest'
import { vi } from 'vitest'

vi.mock('vue', () => ({ reactive: (obj) => obj, watch: () => {} }))
vi.mock('../net/netState.js', () => ({ netState: { mode: null, playerName: '' } }))

const { hintMethods } = await import('../game/world/hints.js')
const { game, resetGame } = await import('../game/store.js')
const { BUILDINGS, UPGRADES } = await import('../game/constants/index.js')

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCtx(overrides = {}) {
  return {
    ...hintMethods,
    players: [],
    ...overrides,
  }
}

function makePlayer(source = 'kb1', overrides = {}) {
  return {
    id: 1, source, x: 0, y: 0,
    target: null, hint: '', water: false,
    ...overrides,
  }
}

beforeEach(() => {
  resetGame()
  game.hintOverride = ''
})

// ── No target ─────────────────────────────────────────────────────────────────

describe('updateHint — no target', () => {
  it('sets empty hint when player has no target', () => {
    const p = makePlayer()
    const w = makeCtx({ players: [p] })
    w.updateHint()
    expect(p.hint).toBe('')
    expect(game.hint).toBe('')
  })
})

// ── Tool-missing hints ────────────────────────────────────────────────────────

describe('updateHint — missing tools', () => {
  it('shows axe hint when near tree without hache', () => {
    const p = makePlayer('kb1', { target: { kind: 'chop', ok: false, inventoryFull: false } })
    makeCtx({ players: [p] }).updateHint()
    expect(p.hint).toContain('hache')
  })

  it('shows no hint when near tree with hache (ok=true)', () => {
    const p = makePlayer('kb1', { target: { kind: 'chop', ok: true, inventoryFull: false } })
    makeCtx({ players: [p] }).updateHint()
    expect(p.hint).toBe('')
  })

  it('shows fishing rod hint when near fish without rod', () => {
    const p = makePlayer('kb1', { target: { kind: 'fish', ok: false, inventoryFull: false } })
    makeCtx({ players: [p] }).updateHint()
    expect(p.hint).toContain('canne')
  })

  it('shows pickaxe hint when near stone without pioche', () => {
    const p = makePlayer('kb1', { target: { kind: 'mine', ok: false, inventoryFull: false } })
    makeCtx({ players: [p] }).updateHint()
    expect(p.hint).toContain('pioche')
  })

  it('shows sickle hint when near berries without faucille', () => {
    const p = makePlayer('kb1', { target: { kind: 'pick', ok: false, inventoryFull: false } })
    makeCtx({ players: [p] }).updateHint()
    expect(p.hint).toContain('faucille')
  })
})

// ── Inventory-full hints ──────────────────────────────────────────────────────

describe('updateHint — inventory full', () => {
  it('chop: inventory full → cart suggestion', () => {
    const p = makePlayer('kb1', { target: { kind: 'chop', ok: false, inventoryFull: true } })
    makeCtx({ players: [p] }).updateHint()
    expect(p.hint).toContain('Sac plein')
    expect(p.hint).toContain('charrette')
  })

  it('fish: inventory full → cart suggestion', () => {
    const p = makePlayer('kb1', { target: { kind: 'fish', ok: false, inventoryFull: true } })
    makeCtx({ players: [p] }).updateHint()
    expect(p.hint).toContain('Sac plein')
  })

  it('mine: inventory full → cart suggestion', () => {
    const p = makePlayer('kb1', { target: { kind: 'mine', ok: false, inventoryFull: true } })
    makeCtx({ players: [p] }).updateHint()
    expect(p.hint).toContain('Sac plein')
  })

  it('pick: inventory full → cart suggestion', () => {
    const p = makePlayer('kb1', { target: { kind: 'pick', ok: false, inventoryFull: true } })
    makeCtx({ players: [p] }).updateHint()
    expect(p.hint).toContain('Sac plein')
  })
})

// ── Occupied hints ────────────────────────────────────────────────────────────

describe('updateHint — occupied', () => {
  it('village occupied → relevant hint', () => {
    const p = makePlayer('kb1', { target: { kind: 'menu_occupied' } })
    makeCtx({ players: [p] }).updateHint()
    expect(p.hint).toContain('Village occupé')
  })

  it('building occupied → relevant hint', () => {
    const p = makePlayer('kb1', { target: { kind: 'building_occupied' } })
    makeCtx({ players: [p] }).updateHint()
    expect(p.hint).toContain('Bâtiment occupé')
  })
})

// ── Build hints ───────────────────────────────────────────────────────────────

describe('updateHint — build', () => {
  it('no hint when build is ok (affordable)', () => {
    const p = makePlayer('kb1', { target: { kind: 'build', ok: true } })
    makeCtx({ players: [p] }).updateHint()
    expect(p.hint).toBe('')
  })

  it('insufficient resources hint when build not ok and no requiresUpgrade', () => {
    const spot = { building: 'lumberjack' }
    const p = makePlayer('kb1', { target: { kind: 'build', ok: false, spot } })
    makeCtx({ players: [p] }).updateHint()
    expect(p.hint).toContain('insuffisantes')
  })

  it('upgrade required hint when building needs a missing upgrade', () => {
    // Find a building that has requiresUpgrade
    const buildingId = Object.keys(BUILDINGS).find((k) => BUILDINGS[k].requiresUpgrade)
    if (!buildingId) return // skip if none defined
    const spot = { building: buildingId }
    game.upgrades[BUILDINGS[buildingId].requiresUpgrade] = 0 // ensure upgrade is missing
    const p = makePlayer('kb1', { target: { kind: 'build', ok: false, spot } })
    makeCtx({ players: [p] }).updateHint()
    expect(p.hint).toContain('Amélioration requise')
  })
})

// ── Special object hints ──────────────────────────────────────────────────────

describe('updateHint — special objects', () => {
  it('meteorite → collect hint', () => {
    const p = makePlayer('kb1', { target: { kind: 'meteorite', ok: true } })
    makeCtx({ players: [p] }).updateHint()
    expect(p.hint).toContain('Météorite')
  })

  it('telescope → observe hint', () => {
    const p = makePlayer('kb1', { target: { kind: 'telescope', ok: true } })
    makeCtx({ players: [p] }).updateHint()
    expect(p.hint).toContain('Observer')
  })

  it('squirrel following → cannot pet hint', () => {
    const p = makePlayer('kb1', { target: { kind: 'squirrel', ok: false } })
    makeCtx({ players: [p] }).updateHint()
    expect(p.hint).toContain('écureuil')
    expect(p.hint).toContain('suit')
  })

  it('squirrel not following → pet hint', () => {
    const p = makePlayer('kb1', { target: { kind: 'squirrel', ok: true } })
    makeCtx({ players: [p] }).updateHint()
    expect(p.hint).toContain('Caresser')
  })

  it('noisette growing → growing hint', () => {
    const noisette = { growing: true, stage: 0 }
    const p = makePlayer('kb1', { target: { kind: 'noisette', noisette, ok: false } })
    makeCtx({ players: [p] }).updateHint()
    expect(p.hint).toContain('Pousse')
  })

  it('noisette stage 0 no water → water hint', () => {
    const noisette = { growing: false, stage: 0 }
    const p = makePlayer('kb1', { water: false, target: { kind: 'noisette', noisette, ok: true } })
    makeCtx({ players: [p] }).updateHint()
    expect(p.hint).toContain('Arrosez')
  })

  it('noisette fully grown (stage 3) → grown hint', () => {
    const noisette = { growing: false, stage: 3 }
    const p = makePlayer('kb1', { target: { kind: 'noisette', noisette, ok: false } })
    makeCtx({ players: [p] }).updateHint()
    expect(p.hint).toContain('pleinement développé')
  })
})

// ── hintOverride ──────────────────────────────────────────────────────────────

describe('updateHint — hintOverride', () => {
  it('hintOverride replaces all player hints', () => {
    const p1 = makePlayer('kb1', { target: { kind: 'chop', ok: false, inventoryFull: false } })
    const p2 = makePlayer('kb2', { id: 2, target: { kind: 'mine', ok: false, inventoryFull: false } })
    game.hintOverride = 'Sauvegardé !'
    makeCtx({ players: [p1, p2] }).updateHint()
    expect(p1.hint).toBe('Sauvegardé !')
    expect(p2.hint).toBe('Sauvegardé !')
    expect(game.hint).toBe('Sauvegardé !')
  })
})

// ── Multi-player hint isolation ───────────────────────────────────────────────

describe('updateHint — multi-player', () => {
  it('each player gets their own hint based on their own target', () => {
    const p1 = makePlayer('kb1', { id: 1, target: { kind: 'chop', ok: false, inventoryFull: false } })
    const p2 = makePlayer('kb2', { id: 2, target: { kind: 'mine', ok: false, inventoryFull: false } })
    makeCtx({ players: [p1, p2] }).updateHint()
    expect(p1.hint).toContain('hache')
    expect(p2.hint).toContain('pioche')
  })

  it('game.hint tracks the first non-remote player', () => {
    const local = makePlayer('kb1', { id: 1, target: { kind: 'chop', ok: false, inventoryFull: false } })
    const remote = makePlayer('remote', { id: 2, target: { kind: 'mine', ok: false, inventoryFull: false } })
    makeCtx({ players: [local, remote] }).updateHint()
    expect(game.hint).toContain('hache')
    expect(game.hint).not.toContain('pioche')
  })

  it('remote player hint does not appear in game.hint', () => {
    const remote = makePlayer('remote', { id: 1, target: { kind: 'mine', ok: false, inventoryFull: false } })
    makeCtx({ players: [remote] }).updateHint()
    expect(game.hint).toBe('')
    expect(remote.hint).toContain('pioche')
  })

  it('guest: each remote player gets their own hint (solo on host)', () => {
    const r1 = makePlayer('remote', { id: 1, target: { kind: 'chop', ok: false, inventoryFull: false } })
    const r2 = makePlayer('remote', { id: 2, target: { kind: 'fish', ok: false, inventoryFull: false } })
    makeCtx({ players: [r1, r2] }).updateHint()
    expect(r1.hint).toContain('hache')
    expect(r2.hint).toContain('canne')
  })
})
