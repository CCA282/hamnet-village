// ============================================================================
// État réactif partagé entre le moteur de jeu (canvas) et l'UI Vue (HUD/menu).
// On garde ici uniquement ce que l'UI doit afficher / ce qui change peu souvent.
// Les positions par frame vivent dans world.js (objets JS non réactifs = perf).
// ============================================================================
import { reactive } from 'vue'
import { UPGRADES, BUILDINGS, GLOBAL_CAPACITY_LEVELS } from './constants/index.js'

export const game = reactive({
  wood: 0,
  fish: 0,
  stone: 0,
  berries: 0,
  villageLevel: 1,
  totalHarvested: 0,

  // Compteurs de bâtiments construits (par id)
  buildings: { lumberjack: 0, fishinghut: 0, quarry: 0, garden: 0 },

  // Niveaux d'amélioration
  upgrades: {
    speed: 0, harvest_yield: 0, harvest_speed: 0, village_lvl: 0,
    hache: 0, pioche: 0, fishing_rod: 0, faucille: 0,
    charrette: 0,
    cap_wood: 0, cap_fish: 0, cap_stone: 0, cap_berries: 0,
  },

  // Joueurs (version légère pour le HUD : {id, label, color})
  players: [],

  // Menu village
  menuOpen: false,
  menuOpener: null,   // id du joueur qui a ouvert
  menuIndex: 0,       // sélection courante (nav clavier/manette)

  // Cycle jour/nuit (0 = aube, 0.25 = midi, 0.5 = crépuscule, 0.75 = nuit)
  timeOfDay: 0.15,

  // Astuce contextuelle affichée en bas
  hint: '',

  // Mode développeur : ressources gratuites
  devMode: false,

  // Onglet actif dans le menu village (0=village, 1=outils, 2=stockage, 3=bonus)
  menuTab: 0,
})

// --- Coût courant d'une amélioration ----------------------------------------
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

// --- Achat d'une amélioration ------------------------------------------------
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

// Capacité max du stock global pour une ressource (indexée sur le niveau d'upgrade)
export function globalCap(res) {
  const lvl = game.upgrades['cap_' + res] || 0
  return GLOBAL_CAPACITY_LEVELS[Math.min(lvl, GLOBAL_CAPACITY_LEVELS.length - 1)]
}

// Entrées par onglet (toujours toutes visibles, même au max)
const TAB_KEYS = [
  ['village_lvl'],
  ['hache', 'pioche', 'fishing_rod', 'faucille'],
  ['charrette', 'cap_wood', 'cap_fish', 'cap_stone', 'cap_berries'],
  ['speed', 'harvest_yield', 'harvest_speed'],
]
export { TAB_KEYS }

export function menuEntries() {
  return TAB_KEYS[game.menuTab] || TAB_KEYS[0]
}

// --- Construction d'un bâtiment (déclenchée dans le monde) -------------------
export function canBuild(id) {
  const def = BUILDINGS[id]
  if (game.buildings[id] > 0) return false          // un seul par emplacement en v1
  if (game.villageLevel < def.requiresLevel) return false
  return canAfford(def.cost)
}

export function build(id) {
  if (!canBuild(id)) return false
  pay(BUILDINGS[id].cost)
  game.buildings[id]++
  return true
}

export function effectiveInterval(id) {
  return BUILDINGS[id].interval
}

// --- Dépôt au stock global (bâtiments auto + charrette) — respecte la capacité
export function harvest(res, amount = 1) {
  const cap = globalCap(res)
  const have = game[res] || 0
  const actual = Math.min(amount, cap - have)
  if (actual <= 0) return 0
  game[res] = have + actual
  game.totalHarvested += actual
  return actual
}

// Format court pour l'UI
export function fmt(n) {
  return Math.floor(n).toString()
}
