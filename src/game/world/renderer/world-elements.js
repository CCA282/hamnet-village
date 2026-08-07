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
