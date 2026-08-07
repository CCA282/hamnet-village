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
