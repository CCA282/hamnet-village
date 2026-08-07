import * as C from '../../constants/index.js'
import { game } from '../../store.js'
import { sprite } from '../../sprites/index.js'

const TWO_PI = Math.PI * 2
const clamp01 = (v) => Math.max(0, Math.min(1, v))

export const effectMethods = {
  renderParticles(ctx) {
    for (const p of this.particles) {
      const a = clamp01(p.life / p.maxLife)
      if (['icon_wood', 'icon_fish', 'icon_stone', 'icon_berries', 'icon_meteorite'].includes(p.type)) {
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

    for (const h of this.villageHouses()) {
      const flick = 0.85 + Math.sin(t * 3 + h.x) * 0.12
      ctx.fillStyle = `rgba(255,200,90,${dark * 0.9 * flick})`
      ctx.fillRect(h.x - 8, h.y - 12, 4, 4)
      ctx.fillRect(h.x + 4, h.y - 12, 4, 4)
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
}
