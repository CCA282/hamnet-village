import * as C from '../constants/index.js'
import { game, build, canBuild, buyBuildingUpgrade, effectiveInventoryMax } from '../store.js'

const ASTRONOMY_SPOT = () => C.BUILD_SPOTS.find((s) => s.building === 'astronomy')

const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by)

export const actionMethods = {
  _isBuildingOccupied(spot, p) {
    return this.players.some((other) => {
      if (other === p) return false
      if (game.buildingMenuOpen && game.buildingMenuBuilding === spot.building && game.buildingMenuOpener === other.id) return true
      if (other.buildingMenuId === spot.building) return true
      return false
    })
  },

  _isVillageOccupied(p) {
    return this.players.some((other) => {
      if (other === p) return false
      if (game.menuOpen && game.menuOpener === other.id) return true
      if (other.isInMenu) return true
      return false
    })
  },

  computeTarget(p) {
    if (dist(p.x, p.y, C.VILLAGE.x, C.VILLAGE.y) < C.VILLAGE.r + 4) {
      if (this._isVillageOccupied(p)) {
        return { kind: 'menu_occupied', x: C.VILLAGE.x, y: C.VILLAGE.y - 30, haloX: C.VILLAGE.x, haloY: C.VILLAGE.y, ok: false }
      }
      return { kind: 'menu', x: C.VILLAGE.x, y: C.VILLAGE.y - 30, haloX: C.VILLAGE.x, haloY: C.VILLAGE.y, ok: true }
    }
    for (const spot of C.BUILD_SPOTS) {
      const def = C.BUILDINGS[spot.building]
      if (game.buildings[spot.building] > 0) continue
      if (game.villageLevel < def.requiresLevel) continue
      if (dist(p.x, p.y, spot.x, spot.y) < C.INTERACT_RANGE + 4) {
        return { kind: 'build', spot, x: spot.x, y: spot.y - 20, haloX: spot.x, haloY: spot.y, ok: canBuild(spot.building) }
      }
    }

    // Cart driven by this player → only interaction is dropping it
    const drivingCart = this.carts.find((c) => c.following === p.id)
    if (drivingCart) {
      const d = dist(p.x, p.y, drivingCart.x, drivingCart.y)
      if (d < C.INTERACT_RANGE) {
        return { kind: 'cart', cart: drivingCart, x: drivingCart.x, y: drivingCart.y - 14, haloX: drivingCart.x, haloY: drivingCart.y, ok: true }
      }
      return null
    }

    let best = null, bestD = C.INTERACT_RANGE
    for (const t of this.trees) {
      if (t.hp <= 0) continue
      const d = dist(p.x, p.y, t.x, t.y)
      if (d < bestD) { bestD = d; best = { kind: 'chop', tree: t, x: t.x, y: t.y - 22, haloX: t.x, haloY: t.y, ok: game.upgrades.hache > 0 } }
    }
    for (const f of this.fishSpots) {
      if (f.cd > 0) continue
      const d = dist(p.x, p.y, f.x, f.y)
      if (d < bestD) { bestD = d; best = { kind: 'fish', spot: f, x: f.x, y: f.y - 10, haloX: f.x, haloY: f.y, ok: game.upgrades.fishing_rod > 0 } }
    }
    for (const s of this.stoneSpots) {
      if (s.hp <= 0) continue
      const d = dist(p.x, p.y, s.x, s.y)
      if (d < bestD) { bestD = d; best = { kind: 'mine', rock: s, x: s.x, y: s.y - 12, haloX: s.x, haloY: s.y, ok: game.upgrades.pioche > 0 } }
    }
    for (const b of this.berryBushes) {
      if (b.hp <= 0) continue
      const d = dist(p.x, p.y, b.x, b.y)
      if (d < bestD) { bestD = d; best = { kind: 'pick', bush: b, x: b.x, y: b.y - 12, haloX: b.x, haloY: b.y, ok: game.upgrades.faucille > 0 } }
    }

    // Parked carts
    for (const cart of this.carts) {
      if (cart.following !== null) continue
      const d = dist(p.x, p.y, cart.x, cart.y)
      if (d < bestD && d < C.INTERACT_RANGE) { best = { kind: 'cart', cart, x: cart.x, y: cart.y - 14, haloX: cart.x, haloY: cart.y, ok: true }; bestD = d }
    }

    // Built buildings → upgrade popup (or "occupé" if another player has it open)
    for (const spot of C.BUILD_SPOTS) {
      if (game.buildings[spot.building] <= 0) continue
      const d = dist(p.x, p.y, spot.x, spot.y)
      if (d < bestD) {
        bestD = d
        if (this._isBuildingOccupied(spot, p)) {
          best = { kind: 'building_occupied', spot, x: spot.x, y: spot.y - 22, haloX: spot.x, haloY: spot.y, ok: false }
        } else {
          best = { kind: 'building', spot, x: spot.x, y: spot.y - 22, haloX: spot.x, haloY: spot.y, ok: true }
        }
      }
    }

    for (const m of this.meteoriteSpots) {
      if (m.hp <= 0 || m.impactT > 0) continue
      const d = dist(p.x, p.y, m.x, m.y)
      if (d < bestD) {
        bestD = d
        best = { kind: 'meteorite', meteor: m, x: m.x, y: m.y - 12, haloX: m.x, haloY: m.y, ok: true }
      }
    }

    if (game.villageLevel >= 4) {
      const n = this.noisette
      const d = dist(p.x, p.y, n.x, n.y)
      if (d < bestD) {
        bestD = d
        const canWater = p.water && !n.growing && n.stage < 3
        const spriteKey = n.stage === 0 ? 'noisette' : `noisetier_${n.stage}`
        best = { kind: 'noisette', noisette: n, x: n.x, y: n.y - 14, haloX: n.x, haloY: n.y, ok: canWater, spriteKey }
      }
      for (const sq of this.squirrels) {
        const d = dist(p.x, p.y, sq.x, sq.y)
        if (d < bestD) {
          bestD = d
          best = { kind: 'squirrel', squirrel: sq, x: sq.x, y: sq.y - 10, haloX: sq.x, haloY: sq.y, ok: sq.state !== 'following' }
        }
      }
    }

    const astSpot = ASTRONOMY_SPOT()
    if (astSpot && game.buildings.astronomy > 0 && (game.buildingUpgrades.astronomy?.observatory || 0) > 0) {
      const tx = astSpot.x + C.TELESCOPE_OFFSET_X, ty = astSpot.y
      const d = dist(p.x, p.y, tx, ty)
      if (d < bestD) {
        bestD = d
        best = { kind: 'telescope', x: tx, y: ty - 10, haloX: tx, haloY: ty, ok: true }
      }
    }

    if (best && ['chop', 'fish', 'mine', 'pick', 'meteorite'].includes(best.kind)) {
      const invTotal = Object.values(p.inventory).reduce((a, b) => a + b, 0)
      if (invTotal >= effectiveInventoryMax()) { best.inventoryFull = true; best.ok = false }
    }

    return best
  },

  doAction(p, isInitial) {
    const t = p.target
    if (!t) return

    if (t.kind === 'menu_occupied' || t.kind === 'building_occupied') return
    if (t.kind === 'menu') {
      if (isInitial) {
        if (p.source === 'remote') this.openRemoteMenu(p)
        else this.openMenu(p)
      }
      return
    }
    if (t.kind === 'building') {
      if (isInitial) {
        if (t.spot.building === 'puits') {
          for (const res in p.inventory) {
            if ((p.inventory[res] || 0) > 0) {
              this.spawnIcon(`icon_${res}`, t.spot.x + (Math.random() - 0.5) * 10, t.spot.y - 10)
              p.inventory[res] = 0
            }
          }
          p.water = true
          this.spawnPoof(t.spot.x, t.spot.y - 4)
        } else if (p.source === 'remote') {
          this.openRemoteBuildingMenu(p, t.spot.building)
        } else {
          this.openBuildingMenu(p, t.spot.building)
        }
      }
      return
    }
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
      p.water = false
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
      p.water = false
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
      p.water = false
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
      p.water = false
      p.harvestCd = this.effectiveHarvestCd()
      this.spawnIcon('icon_berries', b.x, b.y - 10)
      if (b.hp <= 0) b.regrow = C.BERRY_REGROW
      return
    }
    if (t.kind === 'meteorite') {
      if (!t.ok) return
      const m = t.meteor
      if (m.hp <= 0) return
      m.hp--
      if (!this.harvestToPlayer(p, 'meteorite', 1)) { m.hp++; return }
      p.water = false
      p.harvestCd = this.effectiveHarvestCd()
      this.spawnIcon('icon_meteorite', m.x, m.y - 10)
      this.spawnRipple(m.x, m.y)
      return
    }
    if (t.kind === 'noisette') {
      if (isInitial && t.ok) this.waterNoisette(p)
      return
    }
    if (t.kind === 'telescope') {
      if (isInitial) game.telescopeOpen = true
      return
    }
    if (t.kind === 'squirrel') {
      if (isInitial && t.ok) this.petSquirrel(t.squirrel)
      return
    }
  },
}
