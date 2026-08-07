import { game } from '../store.js'

// Growth timer in seconds between waterings.
// Stage 0→1: noisette → noisetier_1
// Stage 1→2: noisetier_1 → noisetier_2
// Stage 2→3: noisetier_2 → noisetier_3 (max)
const GROW_TIMES = [90, 120, 150]

export const noisetteMethods = {
  updateNoisette(dt) {
    const n = this.noisette
    if (!n.growing) return
    n.growTimer -= dt
    if (n.growTimer <= 0) {
      n.stage = Math.min(n.stage + 1, 3)
      n.growing = false
      n.growTimer = 0
      this.spawnLeaves(n.x, n.y - 20, 8)
    }
  },

  updateSquirrels(dt) {
    if (game.villageLevel < 4) return
    const n = this.noisette
    const SPD = 22
    const WANDER_R = 28

    for (const sq of this.squirrels) {
      sq.timer = Math.max(0, sq.timer - dt)

      if (sq.state === 'wandering') {
        const dx = sq.targetX - sq.x, dy = sq.targetY - sq.y
        const dist = Math.hypot(dx, dy)
        if (dist < 2 || sq.timer <= 0) {
          sq.timer = 1.2 + Math.random() * 2
          const angle = Math.random() * Math.PI * 2
          const r = 6 + Math.random() * WANDER_R
          sq.targetX = n.x + Math.cos(angle) * r
          sq.targetY = n.y + Math.sin(angle) * r * 0.5
        } else {
          const spd = SPD * dt
          sq.x += (dx / dist) * Math.min(spd, dist)
          sq.y += (dy / dist) * Math.min(spd, dist)
          if (dx > 0.1) sq.facing = 1
          else if (dx < -0.1) sq.facing = -1
        }
      } else if (sq.state === 'following') {
        sq.followTimer -= dt
        let nearest = null, nearestDist = Infinity
        for (const p of this.players) {
          const d = Math.hypot(p.x - sq.x, p.y - sq.y)
          if (d < nearestDist) { nearestDist = d; nearest = p }
        }
        if (nearest && nearestDist > 8) {
          const dx = nearest.x - sq.x, dy = nearest.y - sq.y
          const d = Math.hypot(dx, dy)
          const spd = SPD * 1.5 * dt
          sq.x += (dx / d) * Math.min(spd, d)
          sq.y += (dy / d) * Math.min(spd, d)
          if (dx > 0.1) sq.facing = 1
          else if (dx < -0.1) sq.facing = -1
        }
        if (sq.followTimer <= 0) {
          sq.state = 'returning'
          sq.targetX = n.x + (Math.random() - 0.5) * 20
          sq.targetY = n.y + (Math.random() - 0.5) * 10
        }
      } else if (sq.state === 'returning') {
        const dx = sq.targetX - sq.x, dy = sq.targetY - sq.y
        const dist = Math.hypot(dx, dy)
        if (dist < 5) {
          sq.state = 'wandering'
          sq.timer = 0
        } else {
          const spd = SPD * 1.3 * dt
          sq.x += (dx / dist) * Math.min(spd, dist)
          sq.y += (dy / dist) * Math.min(spd, dist)
          if (dx > 0.1) sq.facing = 1
          else if (dx < -0.1) sq.facing = -1
        }
      }
    }
  },

  waterNoisette(p) {
    const n = this.noisette
    p.water = false
    if (n.growing) return
    if (n.stage >= 3) return
    n.growing = true
    n.growTimer = GROW_TIMES[n.stage]
    this.spawnPoof(n.x, n.y - 4)
    this.spawnLeaves(n.x, n.y - 10, 5)
  },
}
