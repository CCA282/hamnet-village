import * as C from '../constants/index.js'
import { game, harvest, effectiveInterval, effectiveStorageMax, effectiveInventoryMax, effectiveCartCapacity } from '../store.js'

const ICON_MAP = { wood: 'icon_wood', fish: 'icon_fish', stone: 'icon_stone', berries: 'icon_berries', meteorite: 'icon_meteorite' }

export const buildingMethods = {
  updateBuildings(dt) {
    for (const id in this.prodTimers) {
      if (game.buildings[id] <= 0) continue
      this.prodTimers[id] += dt
      const iv = effectiveInterval(id)
      if (this.prodTimers[id] < iv) continue
      this.prodTimers[id] -= iv
      const def = C.BUILDINGS[id]
      const inv = this.buildingInventories[id]
      const current = inv[def.produces] || 0
      if (current >= effectiveStorageMax(id)) continue
      inv[def.produces] = Math.min(current + def.amount, effectiveStorageMax(id))
      const spot = C.BUILD_SPOTS.find((s) => s.building === id)
      this.spawnIcon(ICON_MAP[def.produces], spot.x, spot.y - 18)
      this._lastProduced.push(id)
    }
  },

  updateBuildingCollection() {
    for (const id in this.buildingInventories) {
      if (game.buildings[id] <= 0) continue
      const inv = this.buildingInventories[id]
      const spot = C.BUILD_SPOTS.find((s) => s.building === id)
      if (!spot) continue
      const res = C.BUILDINGS[id].produces
      const available = inv[res] || 0
      if (available <= 0) continue

      for (const pl of this.players) {
        if (available <= 0) break
        if (Math.hypot(pl.x - spot.x, pl.y - spot.y) > C.INTERACT_RANGE + 4) continue
        const invTotal = Object.values(pl.inventory).reduce((a, b) => a + b, 0)
        const space = effectiveInventoryMax() - invTotal
        if (space <= 0) continue
        const take = Math.min(inv[res], space)
        inv[res] -= take
        pl.inventory[res] = (pl.inventory[res] || 0) + take
        this.spawnIcon(ICON_MAP[res], spot.x + (Math.random() - 0.5) * 8, spot.y - 14)
      }

      for (const cart of this.carts) {
        if ((inv[res] || 0) <= 0) break
        if (Math.hypot(cart.x - spot.x, cart.y - spot.y) > C.INTERACT_RANGE + 4) continue
        const cartTotal = Object.values(cart.inventory).reduce((a, b) => a + b, 0)
        const space = effectiveCartCapacity() - cartTotal
        if (space <= 0) continue
        const take = Math.min(inv[res], space)
        inv[res] -= take
        cart.inventory[res] = (cart.inventory[res] || 0) + take
        this.spawnIcon(ICON_MAP[res], spot.x + (Math.random() - 0.5) * 8, spot.y - 14)
      }
    }
  },

  // ── Auto-transporteurs ──────────────────────────────────────────────────────

  syncAutoTransporters() {
    for (const id in C.BUILDINGS) {
      if (game.buildings[id] <= 0) continue
      const wants = (game.buildingUpgrades[id]?.transporter || 0) > 0
      const has = this.autoTransporters.some((at) => at.buildingId === id)
      if (wants && !has) {
        const spot = C.BUILD_SPOTS.find((s) => s.building === id)
        this.autoTransporters.push({
          buildingId: id,
          x: spot.x + C.AT_DOCK_X_OFFSET, y: spot.y,
          inventory: {},
          state: 'loading',
          waitTimer: 0,
          facing: 1,
        })
      }
    }
  },

  updateAutoTransporters(dt) {
    this.syncAutoTransporters()

    for (const at of this.autoTransporters) {
      const def = C.BUILDINGS[at.buildingId]
      const spot = C.BUILD_SPOTS.find((s) => s.building === at.buildingId)
      if (!spot) continue

      const speedLvl = game.buildingUpgrades[at.buildingId]?.transporter_speed || 0
      const speed = 55 + speedLvl * 18

      if (at.state === 'loading') {
        at.waitTimer += dt
        const inv = this.buildingInventories[at.buildingId]
        const res = def.produces
        const cartTotal = Object.values(at.inventory).reduce((a, b) => a + b, 0)
        const space = C.CART_CAPACITY - cartTotal
        if (space > 0 && (inv[res] || 0) > 0) {
          const take = Math.min(inv[res], space)
          inv[res] -= take
          at.inventory[res] = (at.inventory[res] || 0) + take
        }
        const total = Object.values(at.inventory).reduce((a, b) => a + b, 0)
        if (total >= C.CART_CAPACITY || (at.waitTimer >= 6 && total > 0)) {
          at.state = 'to_village'
          at.waitTimer = 0
        }
      } else if (at.state === 'to_village') {
        const dx = C.VILLAGE.x - at.x, dy = C.VILLAGE.y - at.y
        const d = Math.hypot(dx, dy)
        if (d > 4) {
          const mv = Math.min(d, speed * dt)
          at.x += (dx / d) * mv
          at.y += (dy / d) * mv
          at.facing = dx < 0 ? -1 : 1
        }
        if (d < C.CART_DEPOSIT_RANGE) {
          for (const res in at.inventory) {
            const qty = at.inventory[res] || 0
            if (qty > 0) { const added = harvest(res, qty); at.inventory[res] = qty - added }
          }
          const total = Object.values(at.inventory).reduce((a, b) => a + b, 0)
          if (total <= 0) at.state = 'to_building'
        }
      } else if (at.state === 'to_building') {
        const dockX = spot.x + C.AT_DOCK_X_OFFSET
        const dx = dockX - at.x, dy = spot.y - at.y
        const d = Math.hypot(dx, dy)
        if (d > 4) {
          const mv = Math.min(d, speed * dt)
          at.x += (dx / d) * mv
          at.y += (dy / d) * mv
          at.facing = dx < 0 ? -1 : 1
        } else {
          at.x = dockX; at.y = spot.y
          at.state = 'loading'
          at.waitTimer = 0
        }
      }
    }
  },
}
