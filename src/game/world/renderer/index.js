import * as C from '../../constants/index.js'
import { game, canAfford, upgradeCost, upgradeMaxed } from '../../store.js'
import { sprite } from '../../sprites/index.js'

import { helperMethods }       from './helpers.js'
import { worldElementMethods } from './world-elements.js'
import { entityMethods }       from './entities.js'
import { effectMethods }       from './effects.js'

const TWO_PI = Math.PI * 2
const clamp01 = (v) => Math.max(0, Math.min(1, v))

const coreMethods = {
  applyCam(ctx) {
    const { left, top, zoom } = this.camView
    const scale = zoom * (this.canvasW / C.VIEW_W)
    ctx.setTransform(scale, 0, 0, scale, -left * scale, -top * scale)
  },

  resetCam(ctx) { ctx.setTransform(1, 0, 0, 1, 0, 0) },

  overlay() {
    const t = game.timeOfDay
    const dayLight = 0.5 + 0.5 * Math.cos((t - 0.25) * TWO_PI)
    const dark = clamp01(1 - dayLight)
    const gauss = (c, w) => Math.exp(-Math.pow(t - c, 2) / w)
    const warm = 0.24 * gauss(0.5, 0.004) + 0.18 * Math.max(gauss(0, 0.003), gauss(1, 0.003))
    return { dark, warmA: warm }
  },

  villageHouses() {
    const v = C.VILLAGE
    if (game.villageLevel <= 1) return []
    if (game.villageLevel === 2) return [
      { x: v.x - 30, y: v.y - 14, sprite: 'hut_small' },  // NW
      { x: v.x + 30, y: v.y - 14, sprite: 'hut_small' },  // NE
      { x: v.x - 30, y: v.y + 20, sprite: 'hut_small' },  // SW
      { x: v.x + 30, y: v.y + 20, sprite: 'hut_small' },  // SE
    ]
    if (game.villageLevel === 3) return [
      { x: v.x - 40, y: v.y - 16, sprite: 'chalet' },     // NW
      { x: v.x + 40, y: v.y - 16, sprite: 'cabin' },       // NE
      { x: v.x - 40, y: v.y + 30, sprite: 'cabin' },       // SW
      { x: v.x + 40, y: v.y + 30, sprite: 'hut_small' },  // SE
    ]
    // Level 4 — donjon seul, pas de maisons
    return [{ x: v.x, y: v.y + 30, sprite: 'castle', scale: 4 }]
  },

  render(ctx) {
    const t = this.time
    const { dark, warmA } = this.overlay()

    this.resetCam(ctx)
    ctx.fillStyle = '#26331f'
    ctx.fillRect(0, 0, this.canvasW, this.canvasH)

    this.applyCam(ctx)

    // Ground
    ctx.fillStyle = '#7bb161'; ctx.fillRect(0, 0, C.WORLD_W, C.WORLD_H)
    ctx.fillStyle = '#6ba354'; this._ellipse(ctx, 190, 320, 240, 320)
    ctx.fillStyle = '#c9b184'
    this._ellipse(ctx, C.VILLAGE.x, C.VILLAGE.y + 6, C.VILLAGE.r + 14, C.VILLAGE.r)
    for (const s of C.BUILD_SPOTS) this._ellipse(ctx, s.x, s.y + 2, 18, 9)

    this.renderWater(ctx, t, C.WORLD_W, C.WORLD_H)

    for (const f of this.fishSpots) { if (f.cd <= 0) this.drawFishZone(ctx, f, t) }

    for (const g of this.grassTufts) this.drawBottom(ctx, sprite('grass'), g.x, g.y)
    for (const f of this.flowers) this.drawBottom(ctx, sprite(f.kind), f.x, f.y, { scale: f.grow, alpha: f.grow })

    const nearDist = C.INTERACT_RANGE * 3.5
    for (const spot of C.BUILD_SPOTS) {
      const def = C.BUILDINGS[spot.building]
      if (game.buildings[spot.building] > 0 || game.villageLevel < def.requiresLevel) continue
      const near = this.players.some((p) => Math.hypot(p.x - spot.x, p.y - spot.y) < nearDist)
      this.drawBuildMarker(ctx, spot, t, near)
    }

    // Village fortifications back (north + sides — behind entities)
    if (game.villageLevel === 3) this.drawVillagePalisadeBack(ctx, C.VILLAGE)
    if (game.villageLevel >= 4) this.drawVillageCastleBack(ctx, C.VILLAGE)

    // Halos under entities
    for (const p of this.players) {
      if (p.target && !(game.menuOpen && game.menuOpener === p.id)) {
        this.drawHalo(ctx, p.target, t, p.color)
      }
    }

    // Depth-sorted entities
    const ents = []
    for (const tr of this.trees) ents.push({ y: tr.y, draw: () => this.drawTree(ctx, tr) })
    if (game.villageLevel >= 4) {
      const n = this.noisette
      ents.push({ y: n.y, draw: () => this.drawNoisette(ctx, n) })
      for (const sq of this.squirrels) ents.push({ y: sq.y, draw: () => this.drawSquirrel(ctx, sq) })
    }
    for (const b of this.berryBushes) ents.push({ y: b.y, draw: () => this.drawBerryBush(ctx, b) })
    for (const s of this.stoneSpots) ents.push({ y: s.y, draw: () => this.drawStoneSpot(ctx, s) })
    for (const m of this.meteoriteSpots) {
      if (m.hp > 0 || m.impactT > 0) ents.push({ y: m.y, draw: () => this.drawMeteorite(ctx, m) })
    }
    const astSpot = C.BUILD_SPOTS.find((s) => s.building === 'astronomy')
    if (astSpot && game.buildings.astronomy > 0 && (game.buildingUpgrades.astronomy?.observatory || 0) > 0) {
      const tx = astSpot.x + C.TELESCOPE_OFFSET_X, ty = astSpot.y
      ents.push({ y: ty, draw: () => this.drawTelescope(ctx, tx, ty, t) })
    }
    for (const d of this.deer) ents.push({ y: d.y, draw: () => this.drawDeer(ctx, d) })
    for (const h of this.villageHouses()) {
      const opts = h.scale ? { scale: h.scale } : {}
      ents.push({ y: h.y, draw: () => this.drawBottom(ctx, sprite(h.sprite), h.x, h.y, opts) })
    }
    if (game.villageLevel === 3) {
      const v = C.VILLAGE
      ents.push({ y: v.y - 10, draw: () => this.drawBottom(ctx, sprite('bush'), v.x - 44, v.y - 10, { scale: 0.7 }) })
      ents.push({ y: v.y - 10, draw: () => this.drawBottom(ctx, sprite('bush'), v.x + 40, v.y - 10, { scale: 0.7 }) })
      ents.push({ y: v.y - 14, draw: () => this.drawBottom(ctx, sprite('flower_pink'), v.x - 18, v.y - 14) })
      ents.push({ y: v.y - 14, draw: () => this.drawBottom(ctx, sprite('flower_white'), v.x + 16, v.y - 14) })
    }
    if (game.villageLevel <= 3) ents.push({ y: C.VILLAGE.y + 4, draw: () => this.drawCampfire(ctx, t) })

    // Fortification front walls (south — depth-sorted in front of village interior)
    if (game.villageLevel === 3) ents.push({ y: C.VILLAGE.y + 52, draw: () => this.drawVillagePalisadeFront(ctx, C.VILLAGE) })
    if (game.villageLevel >= 4) ents.push({ y: C.VILLAGE.y + 52, draw: () => this.drawVillageCastleFront(ctx, C.VILLAGE) })
    for (const spot of C.BUILD_SPOTS) {
      if (game.buildings[spot.building] > 0) {
        const def = C.BUILDINGS[spot.building]
        ents.push({ y: spot.y, draw: () => this.drawBuilding(ctx, spot, def, t) })
      }
    }
    for (const cart of this.carts) ents.push({ y: cart.y, draw: () => this.drawCart(ctx, cart) })
    for (const at of this.autoTransporters) ents.push({ y: at.y, draw: () => this.drawAutoTransporter(ctx, at) })
    for (const p of this.players) ents.push({ y: p.y, draw: () => this.drawPlayer(ctx, p) })
    ents.sort((a, b) => a.y - b.y)
    for (const e of ents) e.draw()

    // Build cost panels drawn after all entities so they appear on top
    for (const spot of C.BUILD_SPOTS) {
      const def = C.BUILDINGS[spot.building]
      if (game.buildings[spot.building] > 0 || game.villageLevel < def.requiresLevel) continue
      const near = this.players.some((p) => Math.hypot(p.x - spot.x, p.y - spot.y) < nearDist)
      if (near) this.drawBuildCostPanel(ctx, spot, def, t)
    }

    this.renderParticles(ctx)
    this.drawVillageUpgradeIndicator(ctx, t)

    // Lighting overlays
    this.resetCam(ctx)
    if (warmA > 0.01) { ctx.fillStyle = `rgba(240,150,80,${warmA})`; ctx.fillRect(0, 0, this.canvasW, this.canvasH) }
    if (dark > 0.01)  { ctx.fillStyle = `rgba(20,26,66,${dark * 0.5})`; ctx.fillRect(0, 0, this.canvasW, this.canvasH) }

    this.applyCam(ctx)
    if (dark > 0.2) this.renderNight(ctx, dark, t)
    for (const p of this.players) this.drawLabel(ctx, p)
    this.resetCam(ctx)
  },
}

export const rendererMethods = {
  ...helperMethods,
  ...worldElementMethods,
  ...entityMethods,
  ...effectMethods,
  ...coreMethods,
}
