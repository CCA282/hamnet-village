import * as C from '../constants/index.js'
import { game } from '../store.js'

export const meteoriteMethods = {
  updateMeteorites(dt) {
    if (game.villageLevel < 3) return

    for (const m of this.meteoriteSpots) {
      if (m.impactT > 0) m.impactT = Math.max(0, m.impactT - dt)
    }
    this.meteoriteSpots = this.meteoriteSpots.filter((m) => m.hp > 0 || m.impactT > 0)

    // Spawning only at night (sunset → early morning)
    const t = game.timeOfDay
    const isNight = t > 0.55 || t < 0.10
    if (!isNight) return

    if (this.meteoriteSpots.filter((m) => m.hp > 0).length < C.METEORITE_MAX_ON_MAP) {
      this._meteoriteTimer += dt
      // Astronomy tower: 3× longer interval between wild spawns
      const delay = this._nextMeteoriteSpawn * (game.buildings.astronomy > 0 ? 3 : 1)
      if (this._meteoriteTimer >= delay) {
        this._meteoriteTimer = 0
        this._nextMeteoriteSpawn = C.METEORITE_SPAWN_INTERVAL * (0.7 + Math.random() * 0.6)
        this._spawnMeteorite()
      }
    }
  },

  _spawnMeteorite() {
    const { left, top, zoom } = this.camView
    const vw = C.VIEW_W / zoom
    const vh = C.VIEW_H / zoom
    const margin = 24

    let x, y, tries = 0
    do {
      // Spawn inside the current camera viewport
      x = left + margin + Math.random() * (vw - 2 * margin)
      y = top + margin + Math.random() * (vh - 2 * margin)
      tries++
    } while (tries < 40 && (
      x < 30 || x > C.WORLD_W - 220 ||
      y < 30 || y > C.WORLD_H - 80 ||
      this._inWater(x, y) ||
      Math.hypot(x - C.VILLAGE.x, y - C.VILLAGE.y) < C.VILLAGE.r + 40 ||
      this.meteoriteSpots.some((m) => Math.hypot(x - m.x, y - m.y) < 50) ||
      this.trees.some((tr) => Math.hypot(x - tr.x, y - tr.y) < 30) ||
      this.stoneSpots.some((s) => Math.hypot(x - s.x, y - s.y) < 28) ||
      this.berryBushes.some((b) => Math.hypot(x - b.x, y - b.y) < 28) ||
      C.BUILD_SPOTS.some((s) => Math.hypot(x - s.x, y - s.y) < 50)
    ))
    if (tries >= 40) return

    this.meteoriteSpots.push({
      id: this._nextId++,
      x, y,
      hp: C.METEORITE_HP,
      maxHp: C.METEORITE_HP,
      impactT: 1.8,
    })
    this.spawnPoof(x, y)
    this.spawnPoof(x + 4, y - 6)
    this.spawnPoof(x - 6, y - 2)
  },
}
