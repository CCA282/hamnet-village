import * as C from '../constants/index.js'

const TWO_PI = Math.PI * 2

export const particleMethods = {
  spawnIcon(kind, x, y) {
    this.particles.push({ type: kind, x, y, vx: 0, vy: -12, life: 1.1, maxLife: 1.1 })
  },

  spawnLeaves(x, y, n) {
    for (let i = 0; i < n; i++) {
      this.particles.push({
        type: 'leaf', x, y,
        vx: (Math.random() - 0.5) * 20, vy: 8 + Math.random() * 14,
        life: 1 + Math.random(), maxLife: 2,
        sway: Math.random() * TWO_PI,
        col: Math.random() < 0.5 ? '#5a9146' : '#c98a3a',
      })
    }
  },

  spawnPoof(x, y) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TWO_PI
      this.particles.push({ type: 'poof', x, y, vx: Math.cos(a) * 20, vy: Math.sin(a) * 20 - 6, life: 0.5, maxLife: 0.5 })
    }
  },

  spawnRipple(x, y) {
    this.particles.push({ type: 'ripple', x, y, life: 0.8, maxLife: 0.8, r: 1 })
  },

  emitCampfire(dt) {
    if (Math.random() < dt * 14) {
      this.particles.push({
        type: 'spark',
        x: C.VILLAGE.x + (Math.random() - 0.5) * 4,
        y: C.VILLAGE.y - 2,
        vx: (Math.random() - 0.5) * 6,
        vy: -14 - Math.random() * 8,
        life: 0.7, maxLife: 0.7,
      })
    }
  },

  updateParticles(dt) {
    const keep = []
    for (const p of this.particles) {
      p.life -= dt
      if (p.life <= 0) continue
      if (p.type === 'bird') {
        p.x += p.vx * dt; p.phase += dt * 10
        if (p.x > C.WORLD_W + 12) continue
      } else if (p.type === 'ripple') {
        p.r += dt * 22
      } else {
        p.x += (p.vx || 0) * dt
        p.y += (p.vy || 0) * dt
        if (p.type === 'leaf') p.x += Math.sin(this.time * 4 + (p.sway || 0)) * dt * 8
      }
      keep.push(p)
    }
    if (keep.length > 240) keep.splice(0, keep.length - 240)
    this.particles = keep
  },
}
