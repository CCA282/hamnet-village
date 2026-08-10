import { describe, it, expect, beforeEach } from 'vitest'
import { vi } from 'vitest'

vi.mock('vue', () => ({ reactive: (obj) => obj, watch: () => {} }))
vi.mock('../net/netState.js', () => ({ netState: { mode: null, playerName: '' } }))

const { actionMethods } = await import('../game/world/actions.js')
const { menuMethods }   = await import('../game/world/menu.js')
const { game, resetGame } = await import('../game/store.js')
const C = await import('../game/constants/index.js')

const VILLAGE = C.VILLAGE
const INTERACT = C.INTERACT_RANGE   // 18

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePlayer(overrides = {}) {
  return {
    id: 1, source: 'kb1',
    x: 0, y: 0,
    inventory: {},
    harvestCd: 0, water: false, frozen: false,
    target: null, hint: '',
    isInMenu: false, menuIndex: 0, menuTab: 0,
    buildingMenuId: null, buildingMenuIndex: 0,
    remoteGuestId: undefined, remoteInput: undefined,
    ...overrides,
  }
}

function makeCtx(overrides = {}) {
  return {
    ...actionMethods,
    ...menuMethods,
    players: [],
    trees:       [],
    fishSpots:   [],
    stoneSpots:  [],
    berryBushes: [],
    carts:       [],
    meteoriteSpots: [],
    squirrels:   [],
    noisette:    { x: -999, y: -999, stage: 0, growing: false },
    menuNavTimer: 0,
    _lastDt: 0,
    _pendingRemoteMenuOpen: null,
    _pendingRemoteMenuClose: null,
    findPlayer: function (fn) { return this.players.find(fn) },
    harvestToPlayer: vi.fn().mockImplementation((p, res, n) => {
      p.inventory[res] = (p.inventory[res] || 0) + n
      return true
    }),
    effectiveHarvestCd: () => 0.65,
    depositPlayerInventory: vi.fn(),
    spawnPoof:   vi.fn(),
    spawnLeaves: vi.fn(),
    spawnRipple: vi.fn(),
    spawnIcon:   vi.fn(),
    waterNoisette: vi.fn(),
    petSquirrel: vi.fn(),
    ...overrides,
  }
}

beforeEach(() => {
  resetGame()
  vi.clearAllMocks()
})

// ── computeTarget — village ───────────────────────────────────────────────────

describe('computeTarget — village', () => {
  it('returns {kind:menu} when player is at village center', () => {
    const p = makePlayer({ x: VILLAGE.x, y: VILLAGE.y })
    const t = makeCtx().computeTarget(p)
    expect(t?.kind).toBe('menu')
    expect(t?.ok).toBe(true)
  })

  it('returns {kind:menu} when player is just inside the village radius', () => {
    const p = makePlayer({ x: VILLAGE.x + VILLAGE.r, y: VILLAGE.y })
    const t = makeCtx().computeTarget(p)
    expect(t?.kind).toBe('menu')
  })

  it('returns null when player is outside the village radius', () => {
    const p = makePlayer({ x: VILLAGE.x + VILLAGE.r + 10, y: VILLAGE.y })
    const w = makeCtx()
    w.trees = []; w.stoneSpots = []; w.berryBushes = []; w.fishSpots = []
    const t = w.computeTarget(p)
    expect(t?.kind).not.toBe('menu')
  })

  it('returns {kind:menu_occupied} when another local player has the menu open', () => {
    const p1 = makePlayer({ id: 1, x: VILLAGE.x, y: VILLAGE.y })
    const p2 = makePlayer({ id: 2, x: VILLAGE.x + 1, y: VILLAGE.y, source: 'kb2' })
    const w = makeCtx({ players: [p1, p2] })
    game.menuOpen = true
    game.menuOpener = p1.id
    const t = w.computeTarget(p2)
    expect(t?.kind).toBe('menu_occupied')
  })

  it('returns {kind:menu_occupied} when remote player is in menu', () => {
    const local  = makePlayer({ id: 1, x: VILLAGE.x, y: VILLAGE.y })
    const remote = makePlayer({ id: 2, source: 'remote', isInMenu: true })
    const w = makeCtx({ players: [local, remote] })
    const t = w.computeTarget(local)
    expect(t?.kind).toBe('menu_occupied')
  })
})

// ── computeTarget — build spots ───────────────────────────────────────────────

describe('computeTarget — build spots', () => {
  const SPOT = C.BUILD_SPOTS.find((s) => s.building === 'lumberjack')

  it('returns {kind:build} near unbuilt building spot', () => {
    const p = makePlayer({ x: SPOT.x, y: SPOT.y })
    game.buildings.lumberjack = 0
    game.villageLevel = C.BUILDINGS.lumberjack.requiresLevel
    const t = makeCtx().computeTarget(p)
    expect(t?.kind).toBe('build')
  })

  it('ok=false when cannot afford the building', () => {
    const p = makePlayer({ x: SPOT.x, y: SPOT.y })
    game.buildings.lumberjack = 0
    game.villageLevel = C.BUILDINGS.lumberjack.requiresLevel
    game.wood = 0; game.berries = 0; game.stone = 0
    const t = makeCtx().computeTarget(p)
    expect(t?.kind).toBe('build')
    expect(t?.ok).toBe(false)
  })

  it('does not return build when building already built', () => {
    const p = makePlayer({ x: SPOT.x, y: SPOT.y })
    game.buildings.lumberjack = 1
    const w = makeCtx()
    // Put player away from village and resources
    const t = w.computeTarget(p)
    expect(t?.kind).not.toBe('build')
  })
})

// ── computeTarget — resources ─────────────────────────────────────────────────

describe('computeTarget — tree (chop)', () => {
  it('returns {kind:chop} near a tree', () => {
    const tree = { x: 200, y: 200, hp: 3 }
    const p = makePlayer({ x: 200, y: 200 })
    const w = makeCtx({ trees: [tree] })
    const t = w.computeTarget(p)
    expect(t?.kind).toBe('chop')
    expect(t?.tree).toBe(tree)
  })

  it('ok=false when player has no hache upgrade', () => {
    const tree = { x: 200, y: 200, hp: 3 }
    const p = makePlayer({ x: 200, y: 200 })
    game.upgrades.hache = 0
    const t = makeCtx({ trees: [tree] }).computeTarget(p)
    expect(t?.ok).toBe(false)
  })

  it('ok=true when player has hache upgrade', () => {
    const tree = { x: 200, y: 200, hp: 3 }
    const p = makePlayer({ x: 200, y: 200 })
    game.upgrades.hache = 1
    const t = makeCtx({ trees: [tree] }).computeTarget(p)
    expect(t?.ok).toBe(true)
  })

  it('skips dead trees (hp ≤ 0)', () => {
    const dead = { x: 200, y: 200, hp: 0 }
    const p = makePlayer({ x: 200, y: 200 })
    const t = makeCtx({ trees: [dead] }).computeTarget(p)
    expect(t?.kind).not.toBe('chop')
  })

  it('inventoryFull=true and ok=false when inventory at max', () => {
    const tree = { x: 200, y: 200, hp: 3 }
    const p = makePlayer({ x: 200, y: 200, inventory: { wood: 9 } }) // 9 = PLAYER_INVENTORY_MAX
    game.upgrades.hache = 1
    const t = makeCtx({ trees: [tree] }).computeTarget(p)
    expect(t?.inventoryFull).toBe(true)
    expect(t?.ok).toBe(false)
  })
})

describe('computeTarget — stone (mine)', () => {
  it('returns {kind:mine} near a stone spot', () => {
    const rock = { x: 200, y: 200, hp: 3 }
    const p = makePlayer({ x: 200, y: 200 })
    const t = makeCtx({ stoneSpots: [rock] }).computeTarget(p)
    expect(t?.kind).toBe('mine')
    expect(t?.ok).toBe(false) // no pioche
  })

  it('ok=true with pioche upgrade', () => {
    const rock = { x: 200, y: 200, hp: 3 }
    const p = makePlayer({ x: 200, y: 200 })
    game.upgrades.pioche = 1
    const t = makeCtx({ stoneSpots: [rock] }).computeTarget(p)
    expect(t?.ok).toBe(true)
  })
})

describe('computeTarget — berries (pick)', () => {
  it('returns {kind:pick} near a berry bush', () => {
    const bush = { x: 200, y: 200, hp: 3 }
    const p = makePlayer({ x: 200, y: 200 })
    const t = makeCtx({ berryBushes: [bush] }).computeTarget(p)
    expect(t?.kind).toBe('pick')
    expect(t?.ok).toBe(false) // no faucille
  })

  it('ok=true with faucille upgrade', () => {
    const bush = { x: 200, y: 200, hp: 3 }
    const p = makePlayer({ x: 200, y: 200 })
    game.upgrades.faucille = 1
    const t = makeCtx({ berryBushes: [bush] }).computeTarget(p)
    expect(t?.ok).toBe(true)
  })
})

// ── computeTarget — buildings ─────────────────────────────────────────────────

describe('computeTarget — built building', () => {
  const SPOT = C.BUILD_SPOTS.find((s) => s.building === 'lumberjack')

  it('returns {kind:building} near a built building', () => {
    const p = makePlayer({ x: SPOT.x, y: SPOT.y })
    game.buildings.lumberjack = 1
    game.villageLevel = 10 // ensure build spot is not chosen as 'build'
    const t = makeCtx({ players: [p] }).computeTarget(p)
    expect(t?.kind).toBe('building')
    expect(t?.ok).toBe(true)
  })

  it('returns {kind:building_occupied} when another player has it open', () => {
    const p1 = makePlayer({ id: 1, x: SPOT.x, y: SPOT.y, source: 'kb2' })
    const p2 = makePlayer({ id: 2, x: SPOT.x + 1, y: SPOT.y })
    const w = makeCtx({ players: [p1, p2] })
    game.buildings.lumberjack = 1
    game.villageLevel = 10
    game.buildingMenuOpen = true
    game.buildingMenuBuilding = 'lumberjack'
    game.buildingMenuOpener = p2.id
    const t = w.computeTarget(p1)
    expect(t?.kind).toBe('building_occupied')
  })
})

// ── computeTarget — carts ─────────────────────────────────────────────────────

describe('computeTarget — cart', () => {
  it('returns {kind:cart} near a parked cart', () => {
    const cart = { id: 99, x: 200, y: 200, following: null, inventory: {} }
    const p = makePlayer({ x: 200, y: 200 })
    const t = makeCtx({ carts: [cart] }).computeTarget(p)
    expect(t?.kind).toBe('cart')
    expect(t?.cart).toBe(cart)
  })

  it('does not target cart followed by someone else', () => {
    const cart = { id: 99, x: 200, y: 200, following: 999, inventory: {} }
    const p = makePlayer({ id: 1, x: 200, y: 200 })
    // Cart followed by player 999 (not p) — should not appear as 'cart' target
    // because cart.following !== null and not this player
    const w = makeCtx({ carts: [cart] })
    const t = w.computeTarget(p)
    expect(t?.kind).not.toBe('cart')
  })

  it('player driving cart: target is the cart they are carrying (within INTERACT_RANGE)', () => {
    const cart = { id: 99, x: 10, y: 0, following: 1, inventory: {} }
    const p = makePlayer({ id: 1, x: 0, y: 0 }) // dist=10 < 18
    const t = makeCtx({ carts: [cart] }).computeTarget(p)
    expect(t?.kind).toBe('cart')
    expect(t?.cart).toBe(cart)
  })
})

// ── doAction — village menu ───────────────────────────────────────────────────

describe('doAction — village menu', () => {
  it('isInitial=true opens menu for local player', () => {
    const p = makePlayer({ x: VILLAGE.x, y: VILLAGE.y })
    const w = makeCtx({ players: [p] })
    p.target = { kind: 'menu', ok: true }
    w.doAction(p, true)
    expect(game.menuOpen).toBe(true)
    expect(game.menuOpener).toBe(p.id)
    expect(p.frozen).toBe(true)
  })

  it('isInitial=false does NOT open menu again', () => {
    const p = makePlayer({ x: VILLAGE.x, y: VILLAGE.y })
    const w = makeCtx({ players: [p] })
    p.target = { kind: 'menu', ok: true }
    w.doAction(p, false)
    expect(game.menuOpen).toBe(false)
  })

  it('menu_occupied target is a no-op', () => {
    const p = makePlayer()
    const w = makeCtx({ players: [p] })
    p.target = { kind: 'menu_occupied' }
    w.doAction(p, true)
    expect(game.menuOpen).toBe(false)
  })

  it('opens remote menu for remote-source player', () => {
    const p = makePlayer({ source: 'remote', remoteGuestId: 'g-001', remoteInput: { action: false } })
    const w = makeCtx({ players: [p] })
    p.target = { kind: 'menu', ok: true }
    w.doAction(p, true)
    expect(p.isInMenu).toBe(true)
    expect(game.menuOpen).toBe(false) // remote player does NOT set game.menuOpen
  })
})

// ── doAction — build ──────────────────────────────────────────────────────────

describe('doAction — build', () => {
  it('builds the building when affordable (devMode)', () => {
    const SPOT = C.BUILD_SPOTS.find((s) => s.building === 'lumberjack')
    const p = makePlayer()
    const w = makeCtx({ players: [p] })
    p.target = { kind: 'build', spot: SPOT, ok: true }
    game.devMode = true
    game.villageLevel = SPOT ? C.BUILDINGS[SPOT.building].requiresLevel : 1
    w.doAction(p, true)
    expect(game.buildings.lumberjack).toBe(1)
    expect(w.spawnPoof).toHaveBeenCalled()
  })
})

// ── doAction — tree harvest ───────────────────────────────────────────────────

describe('doAction — tree harvest', () => {
  it('reduces tree hp and adds wood to inventory', () => {
    const tree = { x: 200, y: 200, hp: 3, shake: 0, regrow: 0 }
    const p = makePlayer()
    const w = makeCtx({ players: [p] })
    p.target = { kind: 'chop', tree, ok: true, inventoryFull: false }
    game.upgrades.hache = 1
    w.doAction(p, false)
    expect(tree.hp).toBe(2)
    expect(p.inventory.wood).toBe(1)
    expect(w.spawnIcon).toHaveBeenCalledWith('icon_wood', expect.any(Number), expect.any(Number))
    expect(p.harvestCd).toBeGreaterThan(0)
  })

  it('skips harvest when ok=false (no tool)', () => {
    const tree = { x: 200, y: 200, hp: 3, shake: 0, regrow: 0 }
    const p = makePlayer()
    const w = makeCtx({ players: [p] })
    p.target = { kind: 'chop', tree, ok: false, inventoryFull: false }
    w.doAction(p, false)
    expect(tree.hp).toBe(3)
    expect(p.inventory.wood).toBeUndefined()
  })

  it('skips harvest when harvestCd > 0', () => {
    const tree = { x: 200, y: 200, hp: 3, shake: 0, regrow: 0 }
    const p = makePlayer({ harvestCd: 0.5 })
    const w = makeCtx({ players: [p] })
    p.target = { kind: 'chop', tree, ok: true, inventoryFull: false }
    w.doAction(p, false)
    expect(tree.hp).toBe(3)
  })

  it('sets regrow timer when tree reaches 0 hp', () => {
    const tree = { x: 200, y: 200, hp: 1, shake: 0, regrow: 0 }
    const p = makePlayer()
    const w = makeCtx({ players: [p] })
    p.target = { kind: 'chop', tree, ok: true, inventoryFull: false }
    game.upgrades.hache = 1
    w.doAction(p, false)
    expect(tree.hp).toBe(0)
    expect(tree.regrow).toBeGreaterThan(0)
  })
})

// ── doAction — stone harvest ──────────────────────────────────────────────────

describe('doAction — stone harvest', () => {
  it('reduces rock hp and adds stone to inventory', () => {
    const rock = { x: 200, y: 200, hp: 3, regrow: 0 }
    const p = makePlayer()
    const w = makeCtx({ players: [p] })
    p.target = { kind: 'mine', rock, ok: true, inventoryFull: false }
    game.upgrades.pioche = 1
    w.doAction(p, false)
    expect(rock.hp).toBe(2)
    expect(p.inventory.stone).toBe(1)
    expect(w.spawnIcon).toHaveBeenCalledWith('icon_stone', expect.any(Number), expect.any(Number))
  })

  it('skips harvest with no pioche (ok=false)', () => {
    const rock = { x: 200, y: 200, hp: 3, regrow: 0 }
    const p = makePlayer()
    const w = makeCtx({ players: [p] })
    p.target = { kind: 'mine', rock, ok: false }
    w.doAction(p, false)
    expect(rock.hp).toBe(3)
  })
})

// ── doAction — fish harvest ───────────────────────────────────────────────────

describe('doAction — fish harvest', () => {
  it('sets spot cd and adds fish to inventory', () => {
    const spot = { x: 200, y: 200, cd: 0 }
    const p = makePlayer()
    const w = makeCtx({ players: [p] })
    p.target = { kind: 'fish', spot, ok: true, inventoryFull: false }
    game.upgrades.fishing_rod = 1
    w.doAction(p, false)
    expect(spot.cd).toBeGreaterThan(0)
    expect(p.inventory.fish).toBeGreaterThanOrEqual(1)
  })
})

// ── doAction — berry harvest ──────────────────────────────────────────────────

describe('doAction — berry harvest', () => {
  it('reduces bush hp and adds berries to inventory', () => {
    const bush = { x: 200, y: 200, hp: 3, regrow: 0 }
    const p = makePlayer()
    const w = makeCtx({ players: [p] })
    p.target = { kind: 'pick', bush, ok: true, inventoryFull: false }
    game.upgrades.faucille = 1
    w.doAction(p, false)
    expect(bush.hp).toBe(2)
    expect(p.inventory.berries).toBe(1)
  })
})

// ── doAction — cart pickup / drop ─────────────────────────────────────────────

describe('doAction — cart', () => {
  it('isInitial=true picks up a parked cart', () => {
    const cart = { id: 99, x: 200, y: 200, following: null, inventory: {} }
    const p = makePlayer({ id: 1 })
    const w = makeCtx({ carts: [cart], players: [p] })
    p.target = { kind: 'cart', cart, ok: true }
    w.doAction(p, true)
    expect(cart.following).toBe(1)
    expect(w.spawnPoof).toHaveBeenCalled()
  })

  it('isInitial=true drops a cart the player is carrying', () => {
    const cart = { id: 99, x: 200, y: 200, following: 1, inventory: {} }
    const p = makePlayer({ id: 1 })
    const w = makeCtx({ carts: [cart], players: [p] })
    p.target = { kind: 'cart', cart, ok: true }
    w.doAction(p, true)
    expect(cart.following).toBeNull()
  })

  it('isInitial=false is a no-op for carts', () => {
    const cart = { id: 99, x: 200, y: 200, following: null, inventory: {} }
    const p = makePlayer({ id: 1 })
    const w = makeCtx({ carts: [cart], players: [p] })
    p.target = { kind: 'cart', cart, ok: true }
    w.doAction(p, false) // isInitial=false → no-op
    expect(cart.following).toBeNull()
    expect(w.spawnPoof).not.toHaveBeenCalled()
  })
})

// ── doAction — building menu ──────────────────────────────────────────────────

describe('doAction — building menu', () => {
  it('opens building menu for local player', () => {
    const SPOT = C.BUILD_SPOTS.find((s) => s.building === 'lumberjack')
    const p = makePlayer()
    const w = makeCtx({ players: [p] })
    p.target = { kind: 'building', spot: SPOT, ok: true }
    game.buildings.lumberjack = 1
    w.doAction(p, true)
    expect(game.buildingMenuOpen).toBe(true)
    expect(game.buildingMenuBuilding).toBe('lumberjack')
  })

  it('opens remote building menu for remote player', () => {
    const SPOT = C.BUILD_SPOTS.find((s) => s.building === 'lumberjack')
    const p = makePlayer({ source: 'remote', id: 2, remoteGuestId: 'g-001', remoteInput: { action: false } })
    const w = makeCtx({ players: [p] })
    p.target = { kind: 'building', spot: SPOT, ok: true }
    game.buildings.lumberjack = 1
    w.doAction(p, true)
    expect(p.buildingMenuId).toBe('lumberjack')
    expect(game.buildingMenuOpen).toBe(false)
  })
})
