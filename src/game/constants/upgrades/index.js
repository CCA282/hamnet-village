import { upgradesVillage } from './village.js'
import { upgradesTools }   from './tools.js'
import { upgradesStorage } from './storage.js'
import { upgradesBonus }   from './bonus.js'

export const UPGRADES = {
  ...upgradesVillage,
  ...upgradesTools,
  ...upgradesStorage,
  ...upgradesBonus,
}
