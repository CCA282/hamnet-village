import * as C from '../constants/index.js'
import { game } from '../store.js'

const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by)

export const natureMethods = {
  updateNature(dt) {
    const target = Math.min(130, Math.floor(game.totalHarvested / 5))
    if (this.flowers.length < target) {
      for (let k = 0; k < 3 && this.flowers.length < target; k++) {
        const x = 16 + Math.random() * (C.WORLD_W - 180)
        const y = 26 + Math.random() * (C.WORLD_H - 52)
        if (this._inWater(x, y)) continue
        if (dist(x, y, C.VILLAGE.x, C.VILLAGE.y) < C.VILLAGE.r - 4) continue
        const kinds = ['flower_pink', 'flower_white', 'flower_gold']
        this.flowers.push({ x, y, kind: kinds[(Math.random() * 3) | 0], grow: 0 })
      }
    }
    for (const f of this.flowers) if (f.grow < 1) f.grow = Math.min(1, f.grow + dt * 1.5)

    const deerTarget = game.totalHarvested > 90 ? 4 : game.totalHarvested > 60 ? 3 : game.totalHarvested > 22 ? 2 : 0
    while (this.deer.length < deerTarget) {
      this.deer.push({ x: 80 + Math.random() * 500, y: 80 + Math.random() * 400, tx: 0, ty: 0, timer: 0, facing: 1, state: 'idle' })
    }
  },

  updateDeer(dt) {
    for (const d of this.deer) {
      d.timer -= dt
      if (d.state === 'idle') {
        if (d.timer <= 0) { d.tx = 50 + Math.random() * 720; d.ty = 60 + Math.random() * 480; d.state = 'walk' }
      } else {
        const dx = d.tx - d.x, dy = d.ty - d.y
        const dd = Math.hypot(dx, dy)
        if (dd < 3) { d.state = 'idle'; d.timer = 1.5 + Math.random() * 3 }
        else {
          d.facing = dx < 0 ? -1 : 1
          const sp = 18 * dt
          const nx = d.x + (dx / dd) * sp
          const ny = d.y + (dy / dd) * sp
          if (!this._inWater(nx, ny) && dist(nx, ny, C.VILLAGE.x, C.VILLAGE.y) > C.VILLAGE.r) { d.x = nx; d.y = ny }
          else { d.state = 'idle'; d.timer = 1 }
        }
      }
    }
  },

  updateBirds(dt) {
    this.birdTimer -= dt
    if (this.birdTimer <= 0) {
      this.birdTimer = 7 + Math.random() * 12
      const y = 12 + Math.random() * 50
      this.particles.push({ type: 'bird', x: -10, y, vx: 26 + Math.random() * 14, vy: 0, life: 40, maxLife: 40, phase: 0 })
    }
  },
}
