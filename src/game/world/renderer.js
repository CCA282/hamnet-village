import * as C from '../constants/index.js'
import { game, canBuild } from '../store.js'
import { sprite, characterSprite, shadowSprite } from '../sprites/index.js'

const TWO_PI = Math.PI * 2
const clamp01 = (v) => Math.max(0, Math.min(1, v))

export const rendererMethods = {
  // ── Camera helpers ─────────────────────────────────────────────────────────
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

  // ── Main render ────────────────────────────────────────────────────────────
  render(ctx) {
    const t = this.time
    const { dark, warmA } = this.overlay()

    this.resetCam(ctx)
    ctx.fillStyle = '#26331f'
    ctx.fillRect(0, 0, this.canvasW, this.canvasH)

    this.applyCam(ctx)

    ctx.fillStyle = '#7bb161'
    ctx.fillRect(0, 0, C.WORLD_W, C.WORLD_H)

    ctx.fillStyle = '#6ba354'
    this._ellipse(ctx, 190, 320, 240, 320)

    ctx.fillStyle = '#c9b184'
    this._ellipse(ctx, C.VILLAGE.x, C.VILLAGE.y + 6, C.VILLAGE.r + 14, C.VILLAGE.r)
    for (const s of C.BUILD_SPOTS) this._ellipse(ctx, s.x, s.y + 2, 18, 9)

    this.renderWater(ctx, t, C.WORLD_W, C.WORLD_H)

    for (const f of this.fishSpots) {
      if (f.cd <= 0) this.drawFishZone(ctx, f, t)
    }

    for (const g of this.grassTufts) this.drawBottom(ctx, sprite('grass'), g.x, g.y)
    for (const f of this.flowers) {
      this.drawBottom(ctx, sprite(f.kind), f.x, f.y, { scale: f.grow, alpha: f.grow })
    }

    const nearDist = C.INTERACT_RANGE * 3.5
    for (const spot of C.BUILD_SPOTS) {
      const def = C.BUILDINGS[spot.building]
      if (game.buildings[spot.building] > 0) continue
      if (game.villageLevel < def.requiresLevel) continue
      const near = this.players.some((p) => Math.hypot(p.x - spot.x, p.y - spot.y) < nearDist)
      this.drawBuildMarker(ctx, spot, t, near)
    }

    // Depth-sorted entities
    const ents = []
    for (const tr of this.trees) ents.push({ y: tr.y, draw: () => this.drawTree(ctx, tr) })
    for (const b of this.berryBushes) ents.push({ y: b.y, draw: () => this.drawBerryBush(ctx, b) })
    for (const s of this.stoneSpots) ents.push({ y: s.y, draw: () => this.drawStoneSpot(ctx, s) })
    for (const d of this.deer) ents.push({ y: d.y, draw: () => this.drawDeer(ctx, d) })
    const houses = this.villageHouses()
    for (const h of houses) ents.push({ y: h.y, draw: () => this.drawBottom(ctx, sprite(h.sprite), h.x, h.y) })
    if (game.villageLevel >= 3) {
      const v = C.VILLAGE
      ents.push({ y: v.y - 8, draw: () => this.drawBottom(ctx, sprite('bush'), v.x - 30, v.y - 8, { scale: 0.7 }) })
      ents.push({ y: v.y - 8, draw: () => this.drawBottom(ctx, sprite('bush'), v.x + 28, v.y - 8, { scale: 0.7 }) })
      ents.push({ y: v.y - 12, draw: () => this.drawBottom(ctx, sprite('flower_pink'), v.x - 18, v.y - 12) })
      ents.push({ y: v.y - 12, draw: () => this.drawBottom(ctx, sprite('flower_white'), v.x + 16, v.y - 12) })
    }
    ents.push({ y: C.VILLAGE.y + 4, draw: () => this.drawCampfire(ctx, t) })
    for (const spot of C.BUILD_SPOTS) {
      if (game.buildings[spot.building] > 0) {
        const def = C.BUILDINGS[spot.building]
        ents.push({ y: spot.y, draw: () => this.drawBuilding(ctx, spot, def, t) })
      }
    }
    for (const cart of this.carts) ents.push({ y: cart.y, draw: () => this.drawCart(ctx, cart) })
    for (const p of this.players) ents.push({ y: p.y, draw: () => this.drawPlayer(ctx, p) })
    ents.sort((a, b) => a.y - b.y)
    for (const e of ents) e.draw()

    this.renderParticles(ctx)

    this.resetCam(ctx)
    if (warmA > 0.01) { ctx.fillStyle = `rgba(240,150,80,${warmA})`; ctx.fillRect(0, 0, this.canvasW, this.canvasH) }
    if (dark > 0.01)  { ctx.fillStyle = `rgba(20,26,66,${dark * 0.5})`; ctx.fillRect(0, 0, this.canvasW, this.canvasH) }

    this.applyCam(ctx)
    if (dark > 0.2) this.renderNight(ctx, dark, t)
    for (const p of this.players) {
      if (p.target && !(game.menuOpen && game.menuOpener === p.id)) this.drawPrompt(ctx, p.target, t, p.color)
    }
    for (const p of this.players) this.drawLabel(ctx, p)

    this.resetCam(ctx)
  },

  villageHouses() {
    const v = C.VILLAGE
    if (game.villageLevel === 1) return []
    if (game.villageLevel === 2) return [{ x: v.x - 20, y: v.y - 10, sprite: 'cabin' }]
    return [{ x: v.x, y: v.y - 22, sprite: 'chalet' }]
  },

  // ── Scene elements ─────────────────────────────────────────────────────────
  renderWater(ctx, t, W, H) {
    for (let y = 0; y < H; y += 2) {
      const left = C.riverCenterX(y) - C.RIVER.halfWidth
      ctx.fillStyle = '#4f9ec4'
      ctx.fillRect(left, y, W - left, 2)
      ctx.fillStyle = '#7ec7e6'
      ctx.fillRect(left, y, 2, 2)
    }
    ctx.fillStyle = 'rgba(255,255,255,0.18)'
    for (let i = 0; i < 60; i++) {
      const y = (i * 11 + Math.sin(t * 0.6 + i) * 4) % H
      const left = C.riverCenterX(y) - C.RIVER.halfWidth
      const x = left + 8 + ((i * 37 + t * 12) % (W - left - 12))
      ctx.fillRect(x, y, 5, 1)
    }
  },

  drawTree(ctx, tr) {
    if (tr.hp <= 0) { this.drawBottom(ctx, sprite('stump'), tr.x, tr.y); return }
    const dx = tr.shake > 0 ? Math.sin(this.time * 40) * 1 : 0
    this.drawBottom(ctx, sprite('tree'), tr.x + dx, tr.y)
  },

  drawDeer(ctx, d) {
    const s = sprite('deer')
    this.drawShadow(ctx, d.x, d.y, s.width)
    this.drawBottom(ctx, s, d.x, d.y, { flip: d.facing < 0 })
  },

  drawCampfire(ctx, t) {
    const glow = 6 + Math.sin(t * 8) * 1.5
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = 'rgba(255,170,70,0.16)'
    this._ellipse(ctx, C.VILLAGE.x, C.VILLAGE.y - 2, 14 + glow, 8 + glow * 0.5)
    ctx.restore()
    this.drawBottom(ctx, sprite('campfire'), C.VILLAGE.x, C.VILLAGE.y + 4)
  },

  drawBuilding(ctx, spot, def, t) {
    const s = sprite(def.sprite)
    const bob = Math.sin(t * 3 + spot.x) * 0.5
    this.drawShadow(ctx, spot.x, spot.y, s.width)
    this.drawBottom(ctx, s, spot.x, spot.y - bob * 0.4)
  },

  drawStoneSpot(ctx, s) {
    this.drawBottom(ctx, sprite(s.hp > 0 ? 'rock' : 'rock_depleted'), s.x, s.y)
  },

  drawBerryBush(ctx, b) {
    this.drawBottom(ctx, sprite(b.hp > 0 ? 'bush_full' : 'bush_empty'), b.x, b.y)
  },

  drawCart(ctx, cart) {
    const s = sprite('cart')
    this.drawShadow(ctx, cart.x, cart.y, s.width)
    this.drawBottom(ctx, s, cart.x, cart.y)
    const total = Object.values(cart.inventory).reduce((a, b) => a + b, 0)
    if (total > 0) {
      ctx.font = '5px monospace'
      ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(0,0,0,0.45)'
      ctx.fillText(total, cart.x + 0.3, cart.y - s.height - 2.3)
      ctx.fillStyle = '#f4ead5'
      ctx.fillText(total, cart.x, cart.y - s.height - 2)
      ctx.textAlign = 'left'
    }
    if (cart.following !== null) {
      const d = Math.sin(this.time * 5) * 1.5
      ctx.fillStyle = 'rgba(255,255,200,0.7)'
      ctx.beginPath()
      ctx.arc(cart.x, cart.y - s.height - 7 + d, 2, 0, TWO_PI)
      ctx.fill()
    }
  },

  drawPlayer(ctx, p) {
    const s = characterSprite(p.color)
    this.drawShadow(ctx, p.x, p.y, s.width - 1)
    const bob = p.moving ? Math.abs(Math.sin(p.walkPhase)) * 1.4 : Math.sin(this.time * 2 + p.id) * 0.4
    const scale = p.spawn > 0 ? 1 + p.spawn * 0.6 : 1
    const alpha = p.spawn > 0 ? 1 - p.spawn * 0.4 : 1
    this.drawBottom(ctx, s, p.x, p.y - bob, { flip: p.facing < 0, scale, alpha })
  },

  drawBuildMarker(ctx, spot, t, near = false) {
    const def = C.BUILDINGS[spot.building]
    ctx.save()
    ctx.strokeStyle = canBuild(spot.building) ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)'
    ctx.lineWidth = 0.8
    ctx.setLineDash([3, 3])
    ctx.lineDashOffset = -t * 8
    ctx.strokeRect(spot.x - 12, spot.y - 20, 24, 22)
    ctx.setLineDash([])
    const alpha = near ? 0.45 + Math.sin(t * 3) * 0.08 : 0.22 + Math.sin(t * 3) * 0.05
    this.drawBottom(ctx, sprite(def.sprite), spot.x, spot.y, { alpha })
    if (near) this.drawBuildCostPanel(ctx, spot, def, t)
    ctx.restore()
  },

  drawBuildCostPanel(ctx, spot, def, t) {
    const entries = Object.entries(def.cost)
    const iconW = 9, colW = iconW + 20
    const panW = entries.length * colW + 10
    const panH = 18
    const panX = spot.x - panW / 2
    const panY = spot.y - 50 + Math.sin(t * 2.5) * 0.8
    ctx.fillStyle = 'rgba(30,22,14,0.84)'
    this._roundRect(ctx, panX, panY, panW, panH, 3)
    ctx.fill()
    ctx.fillStyle = 'rgba(30,22,14,0.84)'
    ctx.beginPath()
    ctx.moveTo(spot.x - 4, panY + panH); ctx.lineTo(spot.x + 4, panY + panH); ctx.lineTo(spot.x, panY + panH + 4)
    ctx.closePath(); ctx.fill()
    ctx.font = '5px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(244,234,213,0.7)'
    ctx.fillText(def.name, spot.x, panY + 6)
    const sprKey = { wood: 'icon_wood', fish: 'icon_fish', stone: 'icon_stone', berries: 'icon_berries' }
    let x = panX + 5
    for (const [res, amount] of entries) {
      const have = game[res] || 0
      this.drawBottom(ctx, sprite(sprKey[res]), x + iconW / 2, panY + panH - 3, { scale: 0.75 })
      ctx.font = '5px monospace'
      ctx.textAlign = 'left'
      ctx.fillStyle = have >= amount ? '#7de87a' : '#f07878'
      ctx.fillText(`${Math.floor(have)}/${amount}`, x + iconW + 1, panY + panH - 4)
      x += colW
    }
    ctx.textAlign = 'left'
  },

  drawFishZone(ctx, f, t) {
    const JUMP_DUR = 0.72
    const wx = f.x + 10, wy = f.y
    ctx.save()
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.8 + f.y * 0.04)
    ctx.fillStyle = `rgba(170,230,255,${0.12 * pulse})`
    ctx.beginPath(); ctx.ellipse(wx, wy, 16, 8, 0, 0, TWO_PI); ctx.fill()
    for (let i = 0; i < 3; i++) {
      const phase = ((t * 0.7 + i / 3) % 1)
      const rx = 4 + phase * 14, ry = rx * 0.45, alpha = (1 - phase) * 0.55
      ctx.strokeStyle = `rgba(210,245,255,${alpha})`; ctx.lineWidth = 0.7
      ctx.beginPath(); ctx.ellipse(wx, wy, rx, ry, 0, 0, TWO_PI); ctx.stroke()
    }
    if (f.jumping) {
      const jt = f.jumpT / JUMP_DUR
      const up = Math.sin(jt * Math.PI)
      const jx = wx + (jt - 0.5) * 7, jy = wy - 18 * up
      const angle = (jt < 0.5 ? -1 : 1) * (1 - Math.abs(jt * 2 - 1)) * 1.1
      ctx.save(); ctx.translate(jx, jy); ctx.rotate(angle)
      ctx.fillStyle = '#5db8da'; ctx.beginPath(); ctx.ellipse(0, 0, 6, 2.5, 0, 0, TWO_PI); ctx.fill()
      ctx.fillStyle = '#aae4f5'; ctx.beginPath(); ctx.ellipse(1, 0.5, 3.5, 1.2, 0, 0, TWO_PI); ctx.fill()
      ctx.fillStyle = '#1a2a3a'; ctx.beginPath(); ctx.arc(4, -0.8, 0.8, 0, TWO_PI); ctx.fill()
      ctx.fillStyle = '#3a98bc'; ctx.beginPath()
      ctx.moveTo(-5.5, 0); ctx.lineTo(-9, -3); ctx.lineTo(-9, 3); ctx.closePath(); ctx.fill()
      if (jt > 0.85) {
        const splash = (jt - 0.85) / 0.15
        ctx.restore()
        ctx.strokeStyle = `rgba(200,240,255,${(1 - splash) * 0.8})`; ctx.lineWidth = 0.8
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * TWO_PI, len = 4 * splash
          ctx.beginPath()
          ctx.moveTo(jx + Math.cos(a) * 2, jy + Math.sin(a) * 1)
          ctx.lineTo(jx + Math.cos(a) * (2 + len), jy + Math.sin(a) * (1 + len * 0.5))
          ctx.stroke()
        }
      } else { ctx.restore() }
    }
    ctx.restore()
  },

  drawPrompt(ctx, target, t, color) {
    const bob = Math.sin(t * 6) * 1.5
    const x = Math.round(target.x), y = Math.round(target.y + bob)
    ctx.fillStyle = target.ok ? 'rgba(255,255,255,0.92)' : 'rgba(230,120,120,0.9)'
    this._roundRect(ctx, x - 5, y - 5, 10, 10, 2); ctx.fill()
    ctx.fillStyle = color
    this._roundRect(ctx, x - 3, y - 3, 6, 6, 1); ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.92)'
    ctx.beginPath()
    ctx.moveTo(x - 3, y + 6); ctx.lineTo(x + 3, y + 6); ctx.lineTo(x, y + 9)
    ctx.closePath(); ctx.fill()
  },

  drawLabel(ctx, p) {
    const s = characterSprite(p.color)
    ctx.font = '6px monospace'
    ctx.textAlign = 'center'
    const y = p.y - s.height - 4
    ctx.fillStyle = 'rgba(0,0,0,0.4)'
    ctx.fillText(p.label, p.x + 0.3, y + 0.3)
    ctx.fillStyle = p.color
    ctx.fillText(p.label, p.x, y)
    const invTotal = Object.values(p.inventory).reduce((a, b) => a + b, 0)
    if (invTotal > 0) {
      const barW = 14, barH = 2
      const bx = Math.round(p.x - barW / 2), by = Math.round(y - 5)
      ctx.fillStyle = 'rgba(0,0,0,0.45)'
      ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2)
      ctx.fillStyle = invTotal >= C.PLAYER_INVENTORY_MAX ? '#e05050' : '#f0d050'
      ctx.fillRect(bx, by, Math.round(barW * invTotal / C.PLAYER_INVENTORY_MAX), barH)
    }
    ctx.textAlign = 'left'
  },

  renderParticles(ctx) {
    for (const p of this.particles) {
      const a = clamp01(p.life / p.maxLife)
      if (['icon_wood', 'icon_fish', 'icon_stone', 'icon_berries'].includes(p.type)) {
        this.drawBottom(ctx, sprite(p.type), p.x, p.y, { alpha: a })
      } else if (p.type === 'leaf') {
        ctx.globalAlpha = a; ctx.fillStyle = p.col
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2)
        ctx.globalAlpha = 1
      } else if (p.type === 'poof') {
        ctx.globalAlpha = a * 0.8; ctx.fillStyle = '#f4ead5'
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2)
        ctx.globalAlpha = 1
      } else if (p.type === 'spark') {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a
        ctx.fillStyle = '#ffb24d'
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1)
        ctx.restore(); ctx.globalAlpha = 1
      } else if (p.type === 'ripple') {
        ctx.strokeStyle = `rgba(255,255,255,${a * 0.6})`; ctx.lineWidth = 1
        ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r, p.r * 0.5, 0, 0, TWO_PI); ctx.stroke()
      } else if (p.type === 'bird') {
        this.drawBottom(ctx, sprite('bird'), p.x, p.y + Math.sin(p.phase) * 1.5)
      }
    }
  },

  renderNight(ctx, dark, t) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const houses = this.villageHouses()
    for (const h of houses) {
      const flick = 0.85 + Math.sin(t * 3 + h.x) * 0.12
      ctx.fillStyle = `rgba(255,200,90,${dark * 0.9 * flick})`
      ctx.fillRect(h.x - 8, h.y - 12, 4, 4)
      ctx.fillRect(h.x + 4, h.y - 12, 4, 4)
    }
    for (const spot of C.BUILD_SPOTS) {
      if (game.buildings[spot.building] <= 0) continue
      ctx.fillStyle = `rgba(255,200,90,${dark * 0.8})`
      ctx.fillRect(spot.x - 7, spot.y - 14, 3, 3)
    }
    ctx.fillStyle = `rgba(255,150,60,${dark * 0.5})`
    this._ellipse(ctx, C.VILLAGE.x, C.VILLAGE.y - 2, 20, 12)
    for (const f of this.fireflies) {
      const gx = f.x + Math.sin(t * f.spd + f.phase) * 6
      const gy = f.y + Math.cos(t * f.spd * 0.7 + f.phase) * 5
      const gl = 0.4 + 0.4 * Math.sin(t * 3 + f.phase)
      ctx.fillStyle = `rgba(255,245,150,${dark * gl})`
      ctx.fillRect(Math.round(gx), Math.round(gy), 1, 1)
      ctx.fillStyle = `rgba(255,245,150,${dark * gl * 0.4})`
      ctx.fillRect(Math.round(gx) - 1, Math.round(gy), 3, 1)
      ctx.fillRect(Math.round(gx), Math.round(gy) - 1, 1, 3)
    }
    ctx.restore()
  },

  // ── Low-level draw helpers ─────────────────────────────────────────────────
  drawBottom(ctx, cv, cx, by, opts = {}) {
    const scale = opts.scale ?? 1
    const w = cv.width * scale, h = cv.height * scale
    const x = Math.round(cx - w / 2), y = Math.round(by - h)
    if (opts.alpha != null) ctx.globalAlpha = opts.alpha
    if (opts.flip) {
      ctx.save(); ctx.translate(x + w, y); ctx.scale(-1, 1)
      ctx.drawImage(cv, 0, 0, w, h)
      ctx.restore()
    } else {
      ctx.drawImage(cv, x, y, w, h)
    }
    if (opts.alpha != null) ctx.globalAlpha = 1
  },

  drawShadow(ctx, cx, by, w) {
    const s = shadowSprite(Math.max(6, Math.round(w)))
    ctx.drawImage(s, Math.round(cx - s.width / 2), Math.round(by - s.height / 2))
  },

  _ellipse(ctx, cx, cy, rx, ry) {
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TWO_PI); ctx.fill()
  },

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  },
}
