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
      game.noisetierStage = n.stage
      n.growing = false
      n.growTimer = 0
      this.spawnLeaves(n.x, n.y - 20, 8)
      if (n.stage === 3) n.squirrelSpawnTimers = [5, 25]
    }
  },

  _spawnSquirrel() {
    const n = this.noisette
    const offset = this.squirrels.length === 0 ? 14 : -14
    this.squirrels.push({
      x: n.x + offset, y: n.y + 6,
      state: 'wandering', pausing: true, timer: 1.5,
      targetX: n.x + offset, targetY: n.y + 6,
      followTimer: 0, facing: offset > 0 ? 1 : -1,
    })
    this.spawnPoof(n.x + offset, n.y + 2)
    this.spawnLeaves(n.x + offset, n.y, 3)
  },

  updateSquirrels(dt) {
    if (game.villageLevel < 4) return
    const n = this.noisette
    const SPD = 12
    const WANDER_R = 60

    // Spawn squirrels progressively once noisetier is fully grown
    if (n.stage >= 3 && this.squirrels.length < 2) {
      if (n.squirrelSpawnTimers === null) {
        // Recover from a loaded save where stage was already 3
        n.squirrelSpawnTimers = [0, 15]
      }
      if (n.squirrelSpawnTimers.length > 0) {
        n.squirrelSpawnTimers[0] -= dt
        if (n.squirrelSpawnTimers[0] <= 0) {
          n.squirrelSpawnTimers.shift()
          this._spawnSquirrel()
        }
      }
    }

    for (const sq of this.squirrels) {
      if (sq.state === 'wandering') {
        if (sq.pausing) {
          sq.timer -= dt
          if (sq.timer <= 0) {
            // Pick a new target to walk toward
            sq.pausing = false
            const angle = Math.random() * Math.PI * 2
            const r = 10 + Math.random() * WANDER_R
            sq.targetX = n.x + Math.cos(angle) * r
            sq.targetY = n.y + Math.sin(angle) * r * 0.5
          }
        } else {
          const dx = sq.targetX - sq.x, dy = sq.targetY - sq.y
          const dist = Math.hypot(dx, dy)
          if (dist < 2) {
            // Arrived — start a pause (sometimes long, sometimes short)
            sq.pausing = true
            sq.timer = 1.5 + Math.random() * (Math.random() < 0.4 ? 5 : 1.5)
          } else {
            const spd = SPD * dt
            sq.x += (dx / dist) * Math.min(spd, dist)
            sq.y += (dy / dist) * Math.min(spd, dist)
            if (dx > 0.1) sq.facing = 1
            else if (dx < -0.1) sq.facing = -1
          }
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
          const spd = SPD * 1.6 * dt
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
          sq.pausing = true
          sq.timer = 1
        } else {
          const spd = SPD * 1.4 * dt
          sq.x += (dx / dist) * Math.min(spd, dist)
          sq.y += (dy / dist) * Math.min(spd, dist)
          if (dx > 0.1) sq.facing = 1
          else if (dx < -0.1) sq.facing = -1
        }
      }
    }
  },

  petSquirrel(sq) {
    sq.state = 'following'
    sq.followTimer = 30
    sq.pausing = false
    game.squirrelPetted = true
    this.spawnHearts(sq.x, sq.y - 6)
  },

  waterNoisette(p) {
    const n = this.noisette
    p.water = false
    if (n.growing) return
    if (n.stage >= 3) return
    n.growing = true
    n.growTimer = GROW_TIMES[n.stage]
    game.noisetierWatered = true
    this.spawnPoof(n.x, n.y - 4)
    this.spawnLeaves(n.x, n.y - 10, 5)
  },
}
