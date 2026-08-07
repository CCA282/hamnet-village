import * as C from '../../constants/index.js'
import { game, canBuild, effectiveStorageMax } from '../../store.js'
import { sprite } from '../../sprites/index.js'

const TWO_PI = Math.PI * 2

export const worldElementMethods = {
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
      const wy = (i * 11 + Math.sin(t * 0.6 + i) * 4) % H
      const left = C.riverCenterX(wy) - C.RIVER.halfWidth
      const x = left + 8 + ((i * 37 + t * 12) % (W - left - 12))
      ctx.fillRect(x, wy, 5, 1)
    }
  },

  drawTree(ctx, tr) {
    if (tr.hp <= 0) { this.drawBottom(ctx, sprite('stump'), tr.x, tr.y); return }
    const dx = tr.shake > 0 ? Math.sin(this.time * 40) * 1 : 0
    this.drawBottom(ctx, sprite('tree'), tr.x + dx, tr.y)
  },

  drawNoisette(ctx, n) {
    const sKey = n.stage === 0 ? 'noisette' : `noisetier_${n.stage}`
    const s = sprite(sKey)
    // Gentle sway for the tree stages
    const dx = n.stage > 0 ? Math.sin(this.time * 1.4 + n.x) * 0.6 : 0
    this.drawShadow(ctx, n.x, n.y, Math.max(6, s.width * 0.7))
    this.drawBottom(ctx, s, n.x + dx, n.y)
    // Sparkle drips while growing
    if (n.growing) {
      const phase = (this.time * 2) % 1
      ctx.globalAlpha = 0.7 * Math.abs(Math.sin(this.time * 3))
      ctx.fillStyle = '#4ab0e8'
      ctx.fillRect(Math.round(n.x - 2 + Math.sin(this.time * 4) * 3), Math.round(n.y - s.height * 0.5 - phase * s.height * 0.4), 1, 2)
      ctx.globalAlpha = 1
    }
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

    // Transporter dock (drawn first, appears behind building and cart)
    if ((game.buildingUpgrades[spot.building]?.transporter || 0) > 0) {
      const dockX = Math.round(spot.x + C.AT_DOCK_X_OFFSET)
      const dockY = Math.round(spot.y)
      // Ground patch
      ctx.fillStyle = 'rgba(150,110,55,0.38)'
      ctx.fillRect(dockX - 7, dockY - 2, 14, 3)
      // Roof beam (lighter top, darker underside)
      ctx.fillStyle = '#a06828'
      ctx.fillRect(dockX - 8, dockY - 11, 16, 2)
      ctx.fillStyle = '#7a5018'
      ctx.fillRect(dockX - 8, dockY - 10, 16, 1)
      // Posts
      ctx.fillStyle = '#7a5018'
      ctx.fillRect(dockX - 8, dockY - 10, 2, 10)
      ctx.fillRect(dockX + 6, dockY - 10, 2, 10)
    }

    this.drawShadow(ctx, spot.x, spot.y, s.width)
    this.drawBottom(ctx, s, spot.x, spot.y - bob * 0.4)

    // Storage upgrade: wooden crates stacked on the right side of the building
    const storageLvl = game.buildingUpgrades[spot.building]?.storage || 0
    if (storageLvl > 0) {
      const cw = 8, ch = 5, gap = 1
      const lid  = '#e0bc70'
      const body = '#b8832c'
      const plank = '#7a5018'
      const resColor = {
        wood: '#c07828', fish: '#2890cc', stone: '#8a96a2',
        berries: '#c82828', meteorite: '#7848c8',
      }[def.produces] ?? '#808080'
      const cx = Math.round(spot.x + s.width / 2 + 3)

      for (let i = 0; i < storageLvl; i++) {
        const isTop = i === storageLvl - 1
        const cy = Math.round(spot.y) - ch - i * (ch + gap)

        if (isTop) {
          // Open crate: top rim + resource color visible inside
          ctx.fillStyle = lid
          ctx.fillRect(cx + 1, cy, cw - 2, 1)                   // top rim
          ctx.fillRect(cx, cy + 1, 1, 1)                        // left rim
          ctx.fillRect(cx + cw - 1, cy + 1, 1, 1)               // right rim
          ctx.fillStyle = resColor
          ctx.fillRect(cx + 1, cy + 1, cw - 2, 1)               // resource inside
          ctx.fillStyle = body
          ctx.fillRect(cx, cy + 2, cw, ch - 3)                  // front face
          ctx.fillStyle = plank
          ctx.fillRect(cx + 2, cy + 2, 1, ch - 3)               // plank line
          ctx.fillRect(cx + 5, cy + 2, 1, ch - 3)               // plank line
          ctx.fillRect(cx + 1, cy + ch - 1, cw - 2, 1)          // bottom edge
        } else {
          // Closed crate
          ctx.fillStyle = lid
          ctx.fillRect(cx, cy, cw, 1)                            // lid
          ctx.fillStyle = body
          ctx.fillRect(cx, cy + 1, cw, ch - 2)                  // body
          ctx.fillStyle = plank
          ctx.fillRect(cx + 2, cy + 1, 1, ch - 2)               // plank line
          ctx.fillRect(cx + 5, cy + 1, 1, ch - 2)               // plank line
          ctx.fillRect(cx + 1, cy + ch - 1, cw - 2, 1)          // bottom edge
        }
      }
    }

    const inv = this.buildingInventories[spot.building]
    if (!inv) return
    const total = Object.values(inv).reduce((a, b) => a + b, 0)
    if (total <= 0) return

    const storageMax = effectiveStorageMax(spot.building)
    const full = total >= storageMax
    const topY = spot.y - s.height

    // Count
    ctx.font = '5px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.fillText(total, spot.x + 0.3, topY - 2.3)
    ctx.fillStyle = full ? '#e05050' : '#f4ead5'
    ctx.fillText(total, spot.x, topY - 2)

    // Fill bar
    const barW = 14, barH = 2
    const bx = Math.round(spot.x - barW / 2), by = Math.round(topY - 13)
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2)
    ctx.fillStyle = full ? '#e05050' : (storageLvl > 0 ? '#80d0ff' : '#f0d050')
    ctx.fillRect(bx, by, Math.round(barW * total / storageMax), barH)

    ctx.textAlign = 'left'
  },

  drawStoneSpot(ctx, s) {
    this.drawBottom(ctx, sprite(s.hp > 0 ? 'rock' : 'rock_depleted'), s.x, s.y)
  },

  drawBerryBush(ctx, b) {
    this.drawBottom(ctx, sprite(b.hp > 0 ? 'bush_full' : 'bush_empty'), b.x, b.y)
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
    ctx.restore()
  },

  drawBuildCostPanel(ctx, spot, def, t) {
    const entries = Object.entries(def.cost)
    const iconW = 9, colW = iconW + 20
    ctx.font = '5px monospace'
    const nameW = ctx.measureText(def.name).width
    const panW = Math.max(entries.length * colW + 10, nameW + 12), panH = 18
    const panX = spot.x - panW / 2
    const panY = spot.y - 50 + Math.sin(t * 2.5) * 0.8

    ctx.fillStyle = 'rgba(30,22,14,0.84)'
    this._roundRect(ctx, panX, panY, panW, panH, 3)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(spot.x - 4, panY + panH)
    ctx.lineTo(spot.x + 4, panY + panH)
    ctx.lineTo(spot.x, panY + panH + 4)
    ctx.closePath()
    ctx.fill()

    ctx.font = '5px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(244,234,213,0.7)'
    ctx.fillText(def.name, spot.x, panY + 6)

    const sprKey = { wood: 'icon_wood', fish: 'icon_fish', stone: 'icon_stone', berries: 'icon_berries', meteorite: 'icon_meteorite' }
    let x = panX + 5
    for (const [res, amount] of entries) {
      if (sprKey[res]) this.drawBottom(ctx, sprite(sprKey[res]), x + iconW / 2, panY + panH - 3, { scale: 0.75 })
      ctx.font = '5px monospace'
      ctx.textAlign = 'left'
      ctx.fillStyle = (game[res] || 0) >= amount ? '#7de87a' : '#f07878'
      ctx.fillText(`${Math.floor(game[res] || 0)}/${amount}`, x + iconW + 1, panY + panH - 4)
      x += colW
    }
    ctx.textAlign = 'left'
  },

  // ── Village fortifications ────────────────────────────────────────────────

  _villageStake(ctx, sx, sy) {
    const sH = 10, sW = 3
    ctx.fillStyle = '#3e2008'
    ctx.fillRect(sx + 1, sy - sH, 1, 1)          // pointed tip
    ctx.fillStyle = '#d4a050'
    ctx.fillRect(sx, sy - sH + 1, sW, 3)          // cut wood (pale)
    ctx.fillStyle = '#8a5c24'
    ctx.fillRect(sx, sy - sH + 4, sW, sH - 5)    // body
    ctx.fillStyle = '#5a3810'
    ctx.fillRect(sx, sy - 1, sW, 1)               // base
    ctx.fillStyle = '#5a3810'
    ctx.fillRect(sx + 1, sy - sH + 1, 1, sH - 2) // grain
  },

  _palisadeRail(ctx, rx, ry, rw) {
    if (rw <= 0) return
    ctx.fillStyle = '#5a3810'
    ctx.fillRect(rx, ry - 4, rw, 1)
    ctx.fillStyle = '#8a5c24'
    ctx.fillRect(rx, ry - 3, rw, 1)
  },

  drawVillagePalisadeBack(ctx, v) {
    const x0 = v.x - 62, x1 = v.x + 62
    const y0 = v.y - 38
    const y1 = v.y + 52
    const gH = 18, sW = 3, sStep = 5

    // North wall
    for (let sx = x0; sx <= x1 - sW; sx += sStep) {
      if (sx + 1 > v.x - gH && sx < v.x + gH) continue
      this._villageStake(ctx, sx, y0)
    }
    this._palisadeRail(ctx, x0, y0, v.x - gH - x0)
    this._palisadeRail(ctx, v.x + gH, y0, x1 - (v.x + gH))

    // West wall
    for (let sy = y0 + sStep; sy < y1; sy += sStep) {
      if (sy > v.y - gH && sy < v.y + gH) continue
      this._villageStake(ctx, x0, sy)
    }
    // East wall
    for (let sy = y0 + sStep; sy < y1; sy += sStep) {
      if (sy > v.y - gH && sy < v.y + gH) continue
      this._villageStake(ctx, x1 - sW, sy)
    }
  },

  drawVillagePalisadeFront(ctx, v) {
    const x0 = v.x - 62, x1 = v.x + 62
    const y1 = v.y + 52
    const gH = 18, sW = 3, sStep = 5

    for (let sx = x0; sx <= x1 - sW; sx += sStep) {
      if (sx + 1 > v.x - gH && sx < v.x + gH) continue
      this._villageStake(ctx, sx, y1)
    }
    this._palisadeRail(ctx, x0, y1, v.x - gH - x0)
    this._palisadeRail(ctx, v.x + gH, y1, x1 - (v.x + gH))
  },

  _castleWallH(ctx, x, y, w) {
    if (w <= 0) return
    const wH = 9, mH = 5, mW = 5, cW = 4
    // Wall body
    ctx.fillStyle = '#a8aab8'
    ctx.fillRect(x, y - wH, w, wH)
    // Stone block courses (horizontal mortar)
    ctx.fillStyle = '#6e7080'
    ctx.fillRect(x, y - wH + 3, w, 1)
    ctx.fillRect(x, y - wH + 6, w, 1)
    // Vertical joints (upper course)
    for (let jx = x + 3; jx < x + w; jx += 8) {
      ctx.fillRect(jx, y - wH, 1, 3)
    }
    // Vertical joints (lower course, offset)
    for (let jx = x + 7; jx < x + w; jx += 8) {
      ctx.fillRect(jx, y - wH + 4, 1, 3)
    }
    // Bottom shadow
    ctx.fillStyle = '#5a5c6e'
    ctx.fillRect(x, y - 1, w, 1)
    // Battlements (merlons)
    for (let mx = x; mx < x + w; mx += mW + cW) {
      const mEnd = Math.min(mx + mW, x + w)
      ctx.fillStyle = '#b8bac8'
      ctx.fillRect(mx, y - wH - mH, mEnd - mx, mH)
      ctx.fillStyle = '#6e7080'
      ctx.fillRect(mx, y - wH - 1, mEnd - mx, 1)
    }
  },

  _castleTower(ctx, tx, ty) {
    const tW = 11, tH = 18
    // Shadow
    ctx.fillStyle = '#5a5c6e'
    ctx.fillRect(tx + tW, ty - tH + 2, 2, tH)
    // Body
    ctx.fillStyle = '#a0a2b0'
    ctx.fillRect(tx, ty - tH, tW, tH)
    // Stone courses
    ctx.fillStyle = '#6e7080'
    for (let cy = ty - tH + 4; cy < ty; cy += 5) ctx.fillRect(tx, cy, tW, 1)
    // Vertical joints
    for (let jx = tx + 2; jx < tx + tW; jx += 5) ctx.fillRect(jx, ty - tH, 1, 4)
    for (let jx = tx + 4; jx < tx + tW; jx += 5) ctx.fillRect(jx, ty - tH + 5, 1, 4)
    // Face shadow (right edge)
    ctx.fillStyle = '#5a5c6e'
    ctx.fillRect(tx + tW - 1, ty - tH, 1, tH)
    // Battlements
    ctx.fillStyle = '#b0b2c0'
    ctx.fillRect(tx,     ty - tH - 4, 4, 4)
    ctx.fillRect(tx + 7, ty - tH - 4, 4, 4)
    ctx.fillStyle = '#6e7080'
    ctx.fillRect(tx, ty - tH, tW, 1)
  },

  drawVillageCastleBack(ctx, v) {
    const x0 = v.x - 76, x1 = v.x + 76
    const y0 = v.y - 46, y1 = v.y + 52
    const gH = 15, tW = 11

    // Side walls (thin strips)
    ctx.fillStyle = '#8890a0'
    ctx.fillRect(x0, y0, 3, y1 - y0)
    ctx.fillRect(x1 - 3, y0, 3, y1 - y0)

    // North wall segments (between towers, excluding gate)
    this._castleWallH(ctx, x0 + tW, y0, v.x - gH - (x0 + tW))
    this._castleWallH(ctx, v.x + gH, y0, x1 - tW - (v.x + gH))

    // North towers
    this._castleTower(ctx, x0 - 2, y0)
    this._castleTower(ctx, x1 - tW + 2, y0)
  },

  drawVillageCastleFront(ctx, v) {
    const x0 = v.x - 76, x1 = v.x + 76
    const y1 = v.y + 52
    const gH = 15, tW = 11

    // South wall segments
    this._castleWallH(ctx, x0 + tW, y1, v.x - gH - (x0 + tW))
    this._castleWallH(ctx, v.x + gH, y1, x1 - tW - (v.x + gH))

    // South towers
    this._castleTower(ctx, x0 - 2, y1)
    this._castleTower(ctx, x1 - tW + 2, y1)
  },

  drawMeteorite(ctx, m) {
    if (m.impactT > 0) {
      const progress = 1 - m.impactT / 1.8
      const radius = 6 + progress * 12
      ctx.save()
      ctx.globalAlpha = (1 - progress) * 0.75
      ctx.fillStyle = '#d8c8ff'
      ctx.beginPath()
      ctx.arc(m.x, m.y - 4, radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
    if (m.hp > 0) {
      this.drawShadow(ctx, m.x, m.y, 10)
      this.drawBottom(ctx, sprite('meteorite'), m.x, m.y)
    }
  },

  drawTelescope(ctx, x, y, t) {
    this.drawShadow(ctx, x, y, 8)
    this.drawBottom(ctx, sprite('telescope'), x, y)
    const glow = 0.12 + Math.sin(t * 2.5) * 0.06
    ctx.save()
    ctx.globalAlpha = glow
    ctx.fillStyle = '#a090ff'
    ctx.beginPath()
    ctx.arc(x + 3, y - 8, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
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
      ctx.strokeStyle = `rgba(210,245,255,${(1 - phase) * 0.55})`
      ctx.lineWidth = 0.7
      ctx.beginPath()
      ctx.ellipse(wx, wy, 4 + phase * 14, (4 + phase * 14) * 0.45, 0, 0, TWO_PI)
      ctx.stroke()
    }
    if (f.jumping) {
      const jt = f.jumpT / JUMP_DUR
      const jx = wx + (jt - 0.5) * 7, jy = wy - 18 * Math.sin(jt * Math.PI)
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
}
