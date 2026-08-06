import * as C from '../constants/index.js'
import { game, harvest, effectiveInterval } from '../store.js'

const ICON_MAP = { wood: 'icon_wood', fish: 'icon_fish', stone: 'icon_stone', berries: 'icon_berries' }

export const buildingMethods = {
  updateBuildings(dt) {
    for (const id in this.prodTimers) {
      if (game.buildings[id] <= 0) continue
      this.prodTimers[id] += dt
      const iv = effectiveInterval(id)
      if (this.prodTimers[id] >= iv) {
        this.prodTimers[id] -= iv
        const def = C.BUILDINGS[id]
        harvest(def.produces, def.amount)
        const spot = C.BUILD_SPOTS.find((s) => s.building === id)
        this.spawnIcon(ICON_MAP[def.produces] || 'icon_wood', spot.x, spot.y - 18)
      }
    }
  },
}
