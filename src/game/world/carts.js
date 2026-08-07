import * as C from '../constants/index.js'
import { game, harvest, effectiveCartCapacity } from '../store.js'

const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by)
const ICON_MAP = { wood: 'icon_wood', fish: 'icon_fish', stone: 'icon_stone', berries: 'icon_berries', meteorite: 'icon_meteorite' }
const RESOURCES = ['wood', 'fish', 'stone', 'berries', 'meteorite']

export const cartMethods = {
  createCart() {
    const idx = this.carts.length
    this.carts.push({
      id: this._nextId++,
      x: C.VILLAGE.x - 58 + idx * 18,
      y: C.VILLAGE.y + 22 + idx * 6,
      inventory: { wood: 0, fish: 0, stone: 0, berries: 0 },
      following: null,
    })
  },

  updateCarts(dt) {
    for (const cart of this.carts) {
      // Follow carrier
      if (cart.following !== null) {
        const carrier = this.players.find((pl) => pl.id === cart.following)
        if (!carrier) { cart.following = null }
        else {
          const targetDist = carrier.moving ? 18 : 10
          const dx = cart.x - carrier.x, dy = cart.y - carrier.y
          const d = Math.hypot(dx, dy)
          if (d > 0) {
            const tx = carrier.x + (dx / d) * targetDist
            const ty = carrier.y + (dy / d) * targetDist
            const cartSpeed = 5 + (game.upgrades.cart_size || 0) * 1.7
          const spd = Math.min(1, dt * cartSpeed * (carrier.moving ? 1 : 0.55))
            cart.x += (tx - cart.x) * spd
            cart.y += (ty - cart.y) * spd
          }
        }
      }

      // Auto-transfer from nearby players
      for (const pl of this.players) {
        if (dist(pl.x, pl.y, cart.x, cart.y) < C.INTERACT_RANGE + 2) {
          for (const res of RESOURCES) {
            const qty = pl.inventory[res] || 0
            if (qty <= 0) continue
            const cartTotal = RESOURCES.reduce((s, r) => s + (cart.inventory[r] || 0), 0)
            const space = effectiveCartCapacity() - cartTotal
            if (space <= 0) continue
            const transferred = Math.min(qty, space)
            cart.inventory[res] = (cart.inventory[res] || 0) + transferred
            pl.inventory[res] = qty - transferred
            this.spawnIcon(ICON_MAP[res], cart.x + (Math.random() - 0.5) * 8, cart.y - 8)
          }
        }
      }

      // Auto-deposit when near village
      if (dist(cart.x, cart.y, C.VILLAGE.x, C.VILLAGE.y) < C.CART_DEPOSIT_RANGE) {
        for (const res of RESOURCES) {
          const qty = cart.inventory[res] || 0
          if (qty > 0) {
            const added = harvest(res, qty)
            cart.inventory[res] = qty - added
            if (added > 0) this.spawnIcon(ICON_MAP[res], C.VILLAGE.x + (Math.random() - 0.5) * 20, C.VILLAGE.y - 22)
          }
        }
      }
    }
  },
}
