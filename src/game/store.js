import { reactive } from 'vue'
import { UPGRADES, BUILDINGS, GLOBAL_CAPACITY_LEVELS, PLAYER_INVENTORY_MAX, CART_CAPACITY } from './constants/index.js'

export const game = reactive({
  wood: 0,
  fish: 0,
  stone: 0,
  berries: 0,
  meteorite: 0,
  villageLevel: 1,
  totalHarvested: 0,

  buildings: { lumberjack: 0, fishinghut: 0, quarry: 0, garden: 0, astronomy: 0, puits: 0 },

  upgrades: {
    speed: 0, harvest_yield: 0, harvest_speed: 0, village_lvl: 0,
    hache: 0, pioche: 0, pioche_stellaire: 0, fishing_rod: 0, faucille: 0,
    charrette: 0, bag_size: 0, cart_size: 0,
    cap_wood: 0, cap_fish: 0, cap_stone: 0, cap_berries: 0, cap_meteorite: 0,
  },

  // Niveaux d'amélioration par bâtiment
  buildingUpgrades: {
    lumberjack: { storage: 0, speed: 0, transporter: 0, transporter_speed: 0 },
    fishinghut:  { storage: 0, speed: 0, transporter: 0, transporter_speed: 0 },
    quarry:      { storage: 0, speed: 0, transporter: 0, transporter_speed: 0 },
    garden:      { storage: 0, speed: 0, transporter: 0, transporter_speed: 0 },
    astronomy:   { storage: 0, speed: 0, transporter: 0, transporter_speed: 0, observatory: 0 },
    puits:       {},
  },

  players: [],

  menuOpen: false,
  menuOpener: null,
  menuIndex: 0,
  menuTab: 0,

  // Menu d'amélioration d'un bâtiment spécifique
  buildingMenuOpen: false,
  buildingMenuBuilding: null,
  buildingMenuIndex: 0,
  buildingMenuOpener: null,

  timeOfDay: 0.15,
  hint: '',
  hintOverride: '',
  telescopeOpen: false,
  devMode: false,
})

// ── Upgrades village ──────────────────────────────────────────────────────────

export function upgradeCost(key) {
  const def = UPGRADES[key]
  const lvl = game.upgrades[key]
  if (def.costs) return { ...(def.costs[Math.min(lvl, def.costs.length - 1)] || {}) }
  const mult = Math.pow(def.growth, lvl)
  const out = {}
  for (const res in def.baseCost) out[res] = Math.round(def.baseCost[res] * mult)
  return out
}

export function canAfford(cost) {
  if (game.devMode) return true
  for (const res in cost) if ((game[res] || 0) < cost[res]) return false
  return true
}

function pay(cost) {
  if (game.devMode) return
  for (const res in cost) game[res] -= cost[res]
}

export function buyUpgrade(key) {
  const def = UPGRADES[key]
  if (game.upgrades[key] >= def.max) return false
  const cost = upgradeCost(key)
  if (!canAfford(cost)) return false
  pay(cost)
  game.upgrades[key]++
  if (key === 'village_lvl') game.villageLevel = game.upgrades.village_lvl + 1
  return true
}

export function upgradeMaxed(key) {
  return game.upgrades[key] >= UPGRADES[key].max
}

export function globalCap(res) {
  const lvl = game.upgrades['cap_' + res] || 0
  return GLOBAL_CAPACITY_LEVELS[Math.min(lvl, GLOBAL_CAPACITY_LEVELS.length - 1)]
}

export function effectiveInventoryMax() {
  return PLAYER_INVENTORY_MAX + game.upgrades.bag_size * 3
}

export function effectiveCartCapacity() {
  return CART_CAPACITY + game.upgrades.cart_size * 9
}

const TAB_KEYS = [
  ['village_lvl'],
  ['hache', 'pioche', 'pioche_stellaire', 'fishing_rod', 'faucille'],
  ['charrette', 'cap_wood', 'cap_fish', 'cap_stone', 'cap_berries', 'cap_meteorite'],
  ['speed', 'harvest_yield', 'harvest_speed', 'bag_size', 'cart_size'],
]
export { TAB_KEYS }

export function menuEntries() {
  return TAB_KEYS[game.menuTab] || TAB_KEYS[0]
}

// ── Upgrades bâtiment ─────────────────────────────────────────────────────────

export function buildingUpgradeCost(buildingId, type) {
  const def = BUILDINGS[buildingId]?.upgrades?.[type]
  if (!def) return {}
  const lvl = game.buildingUpgrades[buildingId]?.[type] || 0
  return { ...(def.costs[Math.min(lvl, def.costs.length - 1)] || {}) }
}

export function buildingUpgradeMaxed(buildingId, type) {
  const def = BUILDINGS[buildingId]?.upgrades?.[type]
  if (!def) return true
  return (game.buildingUpgrades[buildingId]?.[type] || 0) >= def.max
}

export function canBuyBuildingUpgrade(buildingId, type) {
  if (buildingUpgradeMaxed(buildingId, type)) return false
  return canAfford(buildingUpgradeCost(buildingId, type))
}

export function buyBuildingUpgrade(buildingId, type) {
  if (!canBuyBuildingUpgrade(buildingId, type)) return false
  pay(buildingUpgradeCost(buildingId, type))
  game.buildingUpgrades[buildingId][type]++
  return true
}

// Entrées visibles dans le popup d'un bâtiment (transporter_speed masqué si pas de transporteur)
export function buildingMenuEntries(buildingId) {
  const def = BUILDINGS[buildingId]
  if (!def?.upgrades) return []
  const types = ['storage', 'speed', 'transporter', 'transporter_speed', 'observatory']
  return types
    .filter((t) => def.upgrades[t])
    .filter((t) => t !== 'transporter_speed' || game.buildingUpgrades[buildingId]?.transporter > 0)
}

// ── Bâtiments : intervalles et stockage effectifs ────────────────────────────

export function effectiveInterval(id) {
  const speedLvl = game.buildingUpgrades[id]?.speed || 0
  return BUILDINGS[id].interval * Math.pow(0.75, speedLvl)
}

export function effectiveStorageMax(id) {
  const storageLvl = game.buildingUpgrades[id]?.storage || 0
  return BUILDINGS[id].storageMax * Math.pow(2, storageLvl)
}

// ── Construction ──────────────────────────────────────────────────────────────

export function canBuild(id) {
  const def = BUILDINGS[id]
  if (game.buildings[id] > 0) return false
  if (game.villageLevel < def.requiresLevel) return false
  if (def.requiresUpgrade && !game.upgrades[def.requiresUpgrade]) return false
  return canAfford(def.cost)
}

export function build(id) {
  if (!canBuild(id)) return false
  pay(BUILDINGS[id].cost)
  game.buildings[id]++
  return true
}

// ── Stock global ──────────────────────────────────────────────────────────────

export function harvest(res, amount = 1) {
  const cap = globalCap(res)
  const have = game[res] || 0
  const actual = Math.min(amount, cap - have)
  if (actual <= 0) return 0
  game[res] = have + actual
  game.totalHarvested += actual
  return actual
}

export function fmt(n) {
  return Math.floor(n).toString()
}

export function resetGame() {
  game.wood = 0; game.fish = 0; game.stone = 0; game.berries = 0; game.meteorite = 0
  game.villageLevel = 1; game.totalHarvested = 0
  Object.assign(game.buildings, { lumberjack: 0, fishinghut: 0, quarry: 0, garden: 0, astronomy: 0, puits: 0 })
  Object.assign(game.upgrades, {
    speed: 0, harvest_yield: 0, harvest_speed: 0, village_lvl: 0,
    hache: 0, pioche: 0, pioche_stellaire: 0, fishing_rod: 0, faucille: 0,
    charrette: 0, bag_size: 0, cart_size: 0,
    cap_wood: 0, cap_fish: 0, cap_stone: 0, cap_berries: 0, cap_meteorite: 0,
  })
  for (const id of Object.keys(game.buildingUpgrades)) {
    Object.assign(game.buildingUpgrades[id], { storage: 0, speed: 0, transporter: 0, transporter_speed: 0 })
  }
  game.buildingUpgrades.astronomy.observatory = 0
  game.players = []
  game.menuOpen = false; game.menuOpener = null; game.menuIndex = 0; game.menuTab = 0
  game.buildingMenuOpen = false; game.buildingMenuBuilding = null
  game.buildingMenuIndex = 0; game.buildingMenuOpener = null
  game.timeOfDay = 0.15; game.hint = ''; game.hintOverride = ''; game.telescopeOpen = false; game.devMode = false
}
