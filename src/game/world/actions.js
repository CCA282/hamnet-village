import * as C from '../constants/index.js'
import { game, build, canBuild } from '../store.js'

const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by)

export const actionMethods = {
  computeTarget(p) {
    if (dist(p.x, p.y, C.VILLAGE.x, C.VILLAGE.y) < C.VILLAGE.r + 4) {
      return { kind: 'menu', x: C.VILLAGE.x, y: C.VILLAGE.y - 30, ok: true }
    }
    for (const spot of C.BUILD_SPOTS) {
      const def = C.BUILDINGS[spot.building]
      if (game.buildings[spot.building] > 0) continue
      if (game.villageLevel < def.requiresLevel) continue
      if (dist(p.x, p.y, spot.x, spot.y) < C.INTERACT_RANGE + 4) {
        return { kind: 'build', spot, x: spot.x, y: spot.y - 20, ok: canBuild(spot.building) }
      }
    }

    // Cart driven by this player → only interaction is dropping it
    const drivingCart = this.carts.find((c) => c.following === p.id)
    if (drivingCart) {
      const d = dist(p.x, p.y, drivingCart.x, drivingCart.y)
      if (d < C.INTERACT_RANGE) {
        return { kind: 'cart', cart: drivingCart, x: drivingCart.x, y: drivingCart.y - 14, ok: true }
      }
      return null
    }

    let best = null, bestD = C.INTERACT_RANGE
    for (const t of this.trees) {
      if (t.hp <= 0) continue
      const d = dist(p.x, p.y, t.x, t.y)
      if (d < bestD) { bestD = d; best = { kind: 'chop', tree: t, x: t.x, y: t.y - 22, ok: game.upgrades.hache > 0 } }
    }
    for (const f of this.fishSpots) {
      if (f.cd > 0) continue
      const d = dist(p.x, p.y, f.x, f.y)
      if (d < bestD) { bestD = d; best = { kind: 'fish', spot: f, x: f.x, y: f.y - 10, ok: game.upgrades.fishing_rod > 0 } }
    }
    for (const s of this.stoneSpots) {
      if (s.hp <= 0) continue
      const d = dist(p.x, p.y, s.x, s.y)
      if (d < bestD) { bestD = d; best = { kind: 'mine', rock: s, x: s.x, y: s.y - 12, ok: game.upgrades.pioche > 0 } }
    }
    for (const b of this.berryBushes) {
      if (b.hp <= 0) continue
      const d = dist(p.x, p.y, b.x, b.y)
      if (d < bestD) { bestD = d; best = { kind: 'pick', bush: b, x: b.x, y: b.y - 12, ok: game.upgrades.faucille > 0 } }
    }

    // Parked carts
    for (const cart of this.carts) {
      if (cart.following !== null) continue
      const d = dist(p.x, p.y, cart.x, cart.y)
      if (d < bestD && d < C.INTERACT_RANGE) { best = { kind: 'cart', cart, x: cart.x, y: cart.y - 14, ok: true }; bestD = d }
    }

    if (best && ['chop', 'fish', 'mine', 'pick'].includes(best.kind)) {
      const invTotal = Object.values(p.inventory).reduce((a, b) => a + b, 0)
      if (invTotal >= C.PLAYER_INVENTORY_MAX) { best.inventoryFull = true; best.ok = false }
    }

    return best
  },

  doAction(p, isInitial) {
    const t = p.target
    if (!t) return

    if (t.kind === 'menu') { if (isInitial) this.openMenu(p); return }
    if (t.kind === 'build') {
      if (isInitial && build(t.spot.building)) {
        this.spawnPoof(t.spot.x, t.spot.y)
        this.spawnLeaves(t.spot.x, t.spot.y - 8, 6)
      }
      return
    }
    if (t.kind === 'cart') {
      if (!isInitial) return
      const cart = t.cart
      if (!cart) return
      if (cart.following === p.id) { cart.following = null; this.spawnPoof(cart.x, cart.y) }
      else if (cart.following === null) { cart.following = p.id; this.spawnPoof(cart.x, cart.y) }
      return
    }

    if (p.harvestCd > 0) return

    if (t.kind === 'chop') {
      if (!t.ok) return
      const tree = t.tree
      if (tree.hp <= 0) return
      tree.hp--
      tree.shake = 0.25
      if (!this.harvestToPlayer(p, 'wood', 1)) return
      p.harvestCd = this.effectiveHarvestCd()
      this.spawnIcon('icon_wood', tree.x + 4, tree.y - 20)
      this.spawnLeaves(tree.x, tree.y - 16, 3)
      if (tree.hp <= 0) tree.regrow = C.TREE_REGROW
      return
    }
    if (t.kind === 'fish') {
      if (!t.ok) return
      const f = t.spot
      if (f.cd > 0) return
      f.cd = C.FISH_COOLDOWN
      if (!this.harvestToPlayer(p, 'fish', 1 + game.upgrades.harvest_yield)) { f.cd = 0; return }
      p.harvestCd = this.effectiveHarvestCd()
      this.spawnIcon('icon_fish', f.x, f.y - 6)
      this.spawnRipple(f.x, f.y)
      return
    }
    if (t.kind === 'mine') {
      if (!t.ok) return
      const r = t.rock
      if (r.hp <= 0) return
      r.hp--
      if (!this.harvestToPlayer(p, 'stone', 1)) { r.hp++; return }
      p.harvestCd = this.effectiveHarvestCd()
      this.spawnIcon('icon_stone', r.x + 2, r.y - 10)
      this.spawnRipple(r.x, r.y)
      if (r.hp <= 0) r.regrow = C.STONE_REGROW
      return
    }
    if (t.kind === 'pick') {
      if (!t.ok) return
      const b = t.bush
      if (b.hp <= 0) return
      b.hp--
      if (!this.harvestToPlayer(p, 'berries', 1)) { b.hp++; return }
      p.harvestCd = this.effectiveHarvestCd()
      this.spawnIcon('icon_berries', b.x, b.y - 10)
      if (b.hp <= 0) b.regrow = C.BERRY_REGROW
      return
    }
  },
}
