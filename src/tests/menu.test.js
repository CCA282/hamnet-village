import { describe, it, expect, beforeEach } from 'vitest'
import { vi } from 'vitest'

vi.mock('vue', () => ({ reactive: (obj) => obj, watch: () => {} }))
vi.mock('../net/netState.js', () => ({ netState: { mode: null, playerName: '' } }))

const { menuMethods } = await import('../game/world/menu.js')
const { game, resetGame, menuEntries, buildingMenuEntries } = await import('../game/store.js')

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCtx(overrides = {}) {
  return {
    ...menuMethods,
    players: [],
    carts: [],
    menuNavTimer: 0,
    _lastDt: 0,
    _pendingRemoteMenuOpen: null,
    _pendingRemoteMenuClose: null,
    findPlayer (fn) { return this.players.find(fn) },
    ...overrides,
  }
}

function makePlayer(source = 'kb1', overrides = {}) {
  return {
    id: 1, source, x: 0, y: 0,
    frozen: false, hint: '',
    target: null, inventory: {},
    harvestCd: 0,
    // remote-only fields
    isInMenu: false, menuIndex: 0, menuTab: 0,
    buildingMenuId: null, buildingMenuIndex: 0,
    remoteGuestId: source === 'remote' ? 'g-001' : undefined,
    remoteInput: source === 'remote' ? { action: false, cancel: false } : undefined,
    ...overrides,
  }
}

beforeEach(() => resetGame())

// ── openMenu / closeMenu ──────────────────────────────────────────────────────

describe('openMenu / closeMenu', () => {
  it('openMenu sets game.menuOpen and freezes player', () => {
    const p = makePlayer()
    const w = makeCtx({ players: [p] })
    w.openMenu(p)
    expect(game.menuOpen).toBe(true)
    expect(game.menuOpener).toBe(p.id)
    expect(game.menuIndex).toBe(0)
    expect(game.menuTab).toBe(0)
    expect(p.frozen).toBe(true)
  })

  it('closeMenu unsets game.menuOpen and unfreezes player', () => {
    const p = makePlayer('kb1', { frozen: true })
    const w = makeCtx({ players: [p] })
    game.menuOpen = true
    game.menuOpener = p.id
    w.closeMenu()
    expect(game.menuOpen).toBe(false)
    expect(game.menuOpener).toBeNull()
    expect(p.frozen).toBe(false)
  })

  it('closeMenu only unfreezes the player who opened the menu', () => {
    const opener = makePlayer('kb1', { id: 1, frozen: true })
    const other  = makePlayer('kb2', { id: 2, frozen: false })
    const w = makeCtx({ players: [opener, other] })
    game.menuOpen = true
    game.menuOpener = opener.id
    w.closeMenu()
    expect(opener.frozen).toBe(false)
    expect(other.frozen).toBe(false) // was already false, stays false
  })

  it('repeated openMenu resets index and tab', () => {
    const p = makePlayer()
    const w = makeCtx({ players: [p] })
    game.menuIndex = 3
    game.menuTab = 2
    w.openMenu(p)
    expect(game.menuIndex).toBe(0)
    expect(game.menuTab).toBe(0)
  })
})

// ── openBuildingMenu / closeBuildingMenu ──────────────────────────────────────

describe('openBuildingMenu / closeBuildingMenu', () => {
  it('openBuildingMenu sets game.buildingMenuOpen and freezes player', () => {
    const p = makePlayer()
    const w = makeCtx({ players: [p] })
    w.openBuildingMenu(p, 'lumberjack')
    expect(game.buildingMenuOpen).toBe(true)
    expect(game.buildingMenuBuilding).toBe('lumberjack')
    expect(game.buildingMenuOpener).toBe(p.id)
    expect(p.frozen).toBe(true)
  })

  it('closeBuildingMenu clears building menu state and unfreezes player', () => {
    const p = makePlayer('kb1', { frozen: true })
    const w = makeCtx({ players: [p] })
    game.buildingMenuOpen = true
    game.buildingMenuBuilding = 'lumberjack'
    game.buildingMenuOpener = p.id
    w.closeBuildingMenu()
    expect(game.buildingMenuOpen).toBe(false)
    expect(game.buildingMenuBuilding).toBeNull()
    expect(p.frozen).toBe(false)
  })
})

// ── closeTelescope / handleTelescope ────────────────────────────────────────

describe('closeTelescope / handleTelescope', () => {
  it('closeTelescope clears telescope state and unfreezes the opener', () => {
    const p = makePlayer('pad', { frozen: true })
    const w = makeCtx({ players: [p] })
    game.telescopeOpen = true
    game.telescopeOpener = p.id
    w.closeTelescope()
    expect(game.telescopeOpen).toBe(false)
    expect(game.telescopeOpener).toBeNull()
    expect(p.frozen).toBe(false)
  })

  it('handleTelescope closes on cancel (gamepad B / keyboard Q-Escape)', () => {
    const p = makePlayer('pad', { frozen: true })
    const w = makeCtx({ players: [p] })
    game.telescopeOpen = true
    game.telescopeOpener = p.id
    w.handleTelescope(p, { cancel: true, action: false })
    expect(game.telescopeOpen).toBe(false)
    expect(p.frozen).toBe(false)
  })

  it('handleTelescope also closes on action (nothing to buy in this view)', () => {
    const p = makePlayer('pad', { frozen: true })
    const w = makeCtx({ players: [p] })
    game.telescopeOpen = true
    game.telescopeOpener = p.id
    w.handleTelescope(p, { cancel: false, action: true })
    expect(game.telescopeOpen).toBe(false)
  })

  it('handleTelescope does nothing when neither cancel nor action is pressed', () => {
    const p = makePlayer('pad', { frozen: true })
    const w = makeCtx({ players: [p] })
    game.telescopeOpen = true
    game.telescopeOpener = p.id
    w.handleTelescope(p, { cancel: false, action: false })
    expect(game.telescopeOpen).toBe(true)
  })
})

// ── handleMenu — keyboard (kb1/kb2) ──────────────────────────────────────────

describe('handleMenu — keyboard navigation', () => {
  function makeKbInput(fields = {}) {
    return { mx: 0, my: 0, action: false, cancel: false, left: false, right: false, up: false, down: false, ...fields }
  }

  it('right switches tab forward', () => {
    const p = makePlayer('kb1')
    const w = makeCtx({ players: [p] })
    game.menuOpen = true
    game.menuOpener = p.id
    w.openMenu(p) // resets to tab 0
    w.handleMenu(p, makeKbInput({ right: true }))
    expect(game.menuTab).toBe(1)
    expect(game.menuIndex).toBe(0)
  })

  it('left switches tab backward (wraps around)', () => {
    const p = makePlayer('kb1')
    const w = makeCtx({ players: [p] })
    w.openMenu(p)
    w.handleMenu(p, makeKbInput({ left: true }))
    expect(game.menuTab).toBe(3) // 0 - 1 wraps to 3
  })

  it('down moves index forward', () => {
    const p = makePlayer('kb1')
    const w = makeCtx({ players: [p] })
    w.openMenu(p)
    // Switch to outils tab (tab 1) which has multiple entries (hache, pioche, …)
    game.menuTab = 1
    w.handleMenu(p, makeKbInput({ down: true }))
    expect(game.menuIndex).toBe(1)
  })

  it('up moves index backward (wraps around)', () => {
    const p = makePlayer('kb1')
    const w = makeCtx({ players: [p] })
    w.openMenu(p)
    // Set index to 0, up should wrap to last entry
    w.handleMenu(p, makeKbInput({ up: true }))
    expect(game.menuIndex).toBe(menuEntries().length - 1)
  })

  it('cancel closes the menu', () => {
    const p = makePlayer('kb1', { frozen: true })
    const w = makeCtx({ players: [p] })
    game.menuOpen = true
    game.menuOpener = p.id
    w.handleMenu(p, makeKbInput({ cancel: true }))
    expect(game.menuOpen).toBe(false)
    expect(p.frozen).toBe(false)
  })

  it('action calls buyUpgrade for the selected entry', () => {
    const p = makePlayer('kb1')
    const w = makeCtx({ players: [p] })
    w.openMenu(p) // tab 0, index 0 = 'village_lvl'
    // Give enough resources to buy
    game.wood = 9999; game.berries = 9999; game.stone = 9999; game.fish = 9999
    const levelBefore = game.upgrades.village_lvl ?? 0
    w.handleMenu(p, makeKbInput({ action: true }))
    expect(game.upgrades.village_lvl ?? 0).toBeGreaterThan(levelBefore)
  })
})

// ── handleBuildingMenu — keyboard ─────────────────────────────────────────────

describe('handleBuildingMenu — keyboard navigation', () => {
  function makeKbInput(fields = {}) {
    return { mx: 0, my: 0, action: false, cancel: false, up: false, down: false, ...fields }
  }

  it('down moves building menu index forward', () => {
    const p = makePlayer('kb1')
    const w = makeCtx({ players: [p] })
    w.openBuildingMenu(p, 'lumberjack')
    w.handleBuildingMenu(p, makeKbInput({ down: true }))
    expect(game.buildingMenuIndex).toBe(1)
  })

  it('up wraps building menu index', () => {
    const p = makePlayer('kb1')
    const w = makeCtx({ players: [p] })
    w.openBuildingMenu(p, 'lumberjack')
    const n = buildingMenuEntries('lumberjack').length
    w.handleBuildingMenu(p, makeKbInput({ up: true }))
    expect(game.buildingMenuIndex).toBe(n - 1)
  })

  it('cancel closes building menu', () => {
    const p = makePlayer('kb1', { frozen: true })
    const w = makeCtx({ players: [p] })
    game.buildingMenuOpen = true
    game.buildingMenuBuilding = 'lumberjack'
    game.buildingMenuOpener = p.id
    w.handleBuildingMenu(p, makeKbInput({ cancel: true }))
    expect(game.buildingMenuOpen).toBe(false)
    expect(p.frozen).toBe(false)
  })

  it('action buys building upgrade when affordable (devMode)', () => {
    const p = makePlayer('kb1')
    const w = makeCtx({ players: [p] })
    w.openBuildingMenu(p, 'lumberjack')
    game.buildings.lumberjack = 1
    game.devMode = true
    // buildingMenuEntries returns ['storage','speed','transporter',…] — first entry is 'storage'
    const firstType = buildingMenuEntries('lumberjack')[0]
    const before = game.buildingUpgrades?.lumberjack?.[firstType] ?? 0
    w.handleBuildingMenu(p, makeKbInput({ action: true }))
    const after  = game.buildingUpgrades?.lumberjack?.[firstType] ?? 0
    expect(after).toBeGreaterThan(before)
  })
})

// ── Remote player menus ───────────────────────────────────────────────────────

describe('remote player menus', () => {
  it('openRemoteMenu sets isInMenu, menuIndex, menuTab on the player', () => {
    const p = makePlayer('remote', { id: 1 })
    const w = makeCtx({ players: [p] })
    w.openRemoteMenu(p)
    expect(p.isInMenu).toBe(true)
    expect(p.menuIndex).toBe(0)
    expect(p.menuTab).toBe(0)
    expect(p.frozen).toBe(true)
  })

  it('openRemoteMenu does NOT touch game.menuOpen (uses per-player state)', () => {
    const p = makePlayer('remote', { id: 1 })
    const w = makeCtx({ players: [p] })
    w.openRemoteMenu(p)
    expect(game.menuOpen).toBe(false)
  })

  it('closeRemoteMenu clears isInMenu and unfreezes', () => {
    const p = makePlayer('remote', { id: 1, isInMenu: true, frozen: true })
    const w = makeCtx({ players: [p] })
    w.closeRemoteMenu(p)
    expect(p.isInMenu).toBe(false)
    expect(p.frozen).toBe(false)
  })

  it('openRemoteBuildingMenu sets buildingMenuId on the player', () => {
    const p = makePlayer('remote', { id: 1 })
    const w = makeCtx({ players: [p] })
    w.openRemoteBuildingMenu(p, 'lumberjack')
    expect(p.buildingMenuId).toBe('lumberjack')
    expect(p.buildingMenuIndex).toBe(0)
    expect(p.frozen).toBe(true)
  })

  it('closeRemoteBuildingMenu clears buildingMenuId', () => {
    const p = makePlayer('remote', { id: 1, buildingMenuId: 'lumberjack', frozen: true })
    const w = makeCtx({ players: [p] })
    w.closeRemoteBuildingMenu(p)
    expect(p.buildingMenuId).toBeNull()
    expect(p.frozen).toBe(false)
  })

  it('two remote players navigate menus independently', () => {
    // Use outils tab (tab 1) — multiple entries so index can grow
    game.menuTab = 1
    const r1 = makePlayer('remote', { id: 1, remoteGuestId: 'g-001', menuTab: 1 })
    const r2 = makePlayer('remote', { id: 2, remoteGuestId: 'g-002', menuTab: 1 })
    const w = makeCtx({ players: [r1, r2] })
    w.openRemoteMenu(r1); r1.menuTab = 1
    w.openRemoteMenu(r2); r2.menuTab = 1
    const st = { mx: 0, my: 0, action: false, cancel: false, up: false, down: true, left: false, right: false }
    // Remote navigation uses menuNavTimer — reset it between calls
    w.menuNavTimer = 0
    w.handleMenu(r1, st)
    w.menuNavTimer = 0
    w.handleMenu(r1, st)
    // r2 navigates once
    w.menuNavTimer = 0
    w.handleMenu(r2, st)
    expect(r1.menuIndex).toBe(2)
    expect(r2.menuIndex).toBe(1)
  })

  it('local menu close does not affect a remote player in their menu', () => {
    const local = makePlayer('kb1', { id: 1, frozen: true })
    const remote = makePlayer('remote', { id: 2, isInMenu: true, frozen: true })
    const w = makeCtx({ players: [local, remote] })
    game.menuOpen = true
    game.menuOpener = local.id
    w.closeMenu() // closes local player's menu
    expect(game.menuOpen).toBe(false)
    expect(local.frozen).toBe(false)
    expect(remote.isInMenu).toBe(true) // untouched
    expect(remote.frozen).toBe(true)   // untouched
  })
})
