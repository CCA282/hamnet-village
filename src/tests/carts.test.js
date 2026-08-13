import { describe, it, expect, beforeEach } from 'vitest'
import { vi } from 'vitest'

vi.mock('vue', () => ({ reactive: (obj) => obj, watch: () => {} }))
vi.mock('../net/netState.js', () => ({
  netState: { mode: null, playerName: '' },
}))

const { cartMethods } = await import('../game/world/carts.js')
const { game, resetGame } = await import('../game/store.js')
import { VILLAGE, CART_CAPACITY, CART_DEPOSIT_RANGE } from '../game/constants/index.js'

function emptyInv() {
  return { wood: 0, fish: 0, stone: 0, berries: 0, meteorite: 0 }
}

function makePlayer(x, y, inv = {}) {
  return { id: 1, x, y, inventory: { ...emptyInv(), ...inv }, moving: false }
}

function makeCtx(overrides = {}) {
  return {
    ...cartMethods,
    carts: [],
    players: [],
    _nextId: 1,
    particles: [],
    spawnIcon: vi.fn(),
    ...overrides,
  }
}

beforeEach(() => resetGame())

// ── createCart ─────────────────────────────────────────────────────────────────

describe('createCart', () => {
  it('adds a cart within deposit range of village', () => {
    const w = makeCtx()
    w.createCart()
    expect(w.carts).toHaveLength(1)
    const cart = w.carts[0]
    expect(Math.hypot(cart.x - VILLAGE.x, cart.y - VILLAGE.y)).toBeLessThanOrEqual(CART_DEPOSIT_RANGE)
  })

  it('cart starts with empty inventory and no carrier', () => {
    const w = makeCtx()
    w.createCart()
    const cart = w.carts[0]
    const total = Object.values(cart.inventory).reduce((a, b) => a + b, 0)
    expect(total).toBe(0)
    expect(cart.following).toBeNull()
  })

  it('second cart gets a different position', () => {
    const w = makeCtx()
    w.createCart()
    w.createCart()
    expect(w.carts[0].x !== w.carts[1].x || w.carts[0].y !== w.carts[1].y).toBe(true)
  })
})

// ── updateCarts: following ─────────────────────────────────────────────────────

describe('updateCarts — following', () => {
  it('cart trails behind moving carrier', () => {
    const player = makePlayer(200, 200)
    player.id = 42
    player.moving = true
    const cart = { id: 1, x: 200, y: 260, inventory: emptyInv(), following: 42 }
    const w = makeCtx({ players: [player], carts: [cart] })
    const distBefore = Math.hypot(cart.x - player.x, cart.y - player.y)
    w.updateCarts(0.5)
    const distAfter = Math.hypot(cart.x - player.x, cart.y - player.y)
    expect(distAfter).toBeLessThan(distBefore)
  })

  it('clears following when carrier disappears', () => {
    const cart = { id: 1, x: 200, y: 200, inventory: emptyInv(), following: 99 }
    const w = makeCtx({ players: [], carts: [cart] })
    w.updateCarts(0.1)
    expect(cart.following).toBeNull()
  })

  it('cart stops far-following when carrier is still', () => {
    const player = makePlayer(200, 200)
    player.id = 42
    player.moving = false
    const cart = { id: 1, x: 200, y: 210, inventory: emptyInv(), following: 42 }
    const w = makeCtx({ players: [player], carts: [cart] })
    w.updateCarts(2)
    // Cart should be within 15 units (smaller target dist when still)
    expect(Math.hypot(cart.x - player.x, cart.y - player.y)).toBeLessThanOrEqual(15)
  })
})

// ── updateCarts: auto-transfer from player ────────────────────────────────────

describe('updateCarts — auto-transfer from player', () => {
  it('transfers inventory when player is near cart', () => {
    const player = makePlayer(100, 100, { wood: 5, fish: 2 })
    const cart = { id: 1, x: 104, y: 100, inventory: emptyInv(), following: null }
    const w = makeCtx({ players: [player], carts: [cart] })
    w.updateCarts(0.1)
    expect(cart.inventory.wood).toBeGreaterThan(0)
    expect(player.inventory.wood).toBeLessThan(5)
  })

  it('does not transfer when player is far from cart', () => {
    const player = makePlayer(0, 0, { wood: 5 })
    const cart = { id: 1, x: 100, y: 100, inventory: emptyInv(), following: null }
    const w = makeCtx({ players: [player], carts: [cart] })
    w.updateCarts(0.1)
    expect(cart.inventory.wood).toBe(0)
    expect(player.inventory.wood).toBe(5)
  })

  it('respects cart capacity on transfer', () => {
    const player = makePlayer(100, 100, { wood: 20 })
    const cart = { id: 1, x: 104, y: 100, inventory: { ...emptyInv(), wood: 16 }, following: null }
    const w = makeCtx({ players: [player], carts: [cart] })
    w.updateCarts(0.1)
    const total = Object.values(cart.inventory).reduce((a, b) => a + b, 0)
    expect(total).toBeLessThanOrEqual(CART_CAPACITY)
  })

  it('cart_size upgrade increases effective capacity', () => {
    game.upgrades.cart_size = 1 // capacity = 27
    const player = makePlayer(100, 100, { wood: 20 })
    const cart = { id: 1, x: 104, y: 100, inventory: { ...emptyInv(), wood: 18 }, following: null }
    const w = makeCtx({ players: [player], carts: [cart] })
    w.updateCarts(0.1)
    const total = Object.values(cart.inventory).reduce((a, b) => a + b, 0)
    expect(total).toBeGreaterThan(18) // used extra capacity from upgrade
    expect(total).toBeLessThanOrEqual(27)
  })
})

// ── updateCarts: auto-deposit at village ──────────────────────────────────────

describe('updateCarts — auto-deposit', () => {
  it('deposits into global stock when near village', () => {
    const cart = {
      id: 1,
      x: VILLAGE.x + 10, y: VILLAGE.y + 10,
      inventory: { ...emptyInv(), wood: 8 },
      following: null,
    }
    const w = makeCtx({ carts: [cart], players: [] })
    game.wood = 0
    w.updateCarts(0.1)
    expect(game.wood).toBe(8)
    expect(cart.inventory.wood).toBe(0)
  })

  it('does not deposit when far from village', () => {
    const cart = {
      id: 1,
      x: 0, y: 0,
      inventory: { ...emptyInv(), wood: 5 },
      following: null,
    }
    const w = makeCtx({ carts: [cart], players: [] })
    game.wood = 0
    w.updateCarts(0.1)
    expect(game.wood).toBe(0)
  })

  it('respects global cap on deposit', () => {
    game.wood = 23
    const cart = {
      id: 1,
      x: VILLAGE.x, y: VILLAGE.y,
      inventory: { ...emptyInv(), wood: 10 },
      following: null,
    }
    const w = makeCtx({ carts: [cart], players: [] })
    w.updateCarts(0.1)
    expect(game.wood).toBe(25)
    expect(cart.inventory.wood).toBe(8) // 8 remain
  })
})

// ── Local co-op: multiple carts ────────────────────────────────────────────────

describe('updateCarts — local co-op', () => {
  it('multiple carts deposit independently', () => {
    const cart1 = { id: 1, x: VILLAGE.x + 5, y: VILLAGE.y, inventory: { ...emptyInv(), wood: 4 }, following: null }
    const cart2 = { id: 2, x: VILLAGE.x - 5, y: VILLAGE.y, inventory: { ...emptyInv(), fish: 3 }, following: null }
    const w = makeCtx({ carts: [cart1, cart2], players: [] })
    game.wood = 0; game.fish = 0
    w.updateCarts(0.1)
    expect(game.wood).toBe(4)
    expect(game.fish).toBe(3)
  })

  it('two players can transfer to separate carts', () => {
    const p1 = makePlayer(100, 100, { wood: 3 })
    p1.id = 1
    const p2 = makePlayer(200, 200, { fish: 2 })
    p2.id = 2
    const cart1 = { id: 10, x: 104, y: 100, inventory: emptyInv(), following: null }
    const cart2 = { id: 11, x: 204, y: 200, inventory: emptyInv(), following: null }
    const w = makeCtx({ players: [p1, p2], carts: [cart1, cart2] })
    w.updateCarts(0.1)
    expect(cart1.inventory.wood).toBeGreaterThan(0)
    expect(cart2.inventory.fish).toBeGreaterThan(0)
  })
})
