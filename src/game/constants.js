// ============================================================================
// Constantes du monde. Deux échelles :
//  - la CAMÉRA (viewport de rendu) = résolution logique fixe VIEW_W x VIEW_H
//  - le MONDE (WORLD_W x WORLD_H), plus grand : la caméra s'y déplace / zoome.
// Tout est en "pixels monde".
// ============================================================================

// Viewport de rendu (résolution interne du canvas, agrandie par CSS)
export const VIEW_W = 480
export const VIEW_H = 270
// Compat : anciens noms utilisés par le moteur
export const LOGICAL_W = VIEW_W
export const LOGICAL_H = VIEW_H

// Taille du monde (bien plus grand que le viewport)
export const WORLD_W = 1000
export const WORLD_H = 620

// --- Caméra dynamique -------------------------------------------------------
// La caméra cadre l'ensemble des joueurs : plus ils s'éloignent, plus elle
// dézoome (jusqu'à ZOOM_MIN) -> ça incite tout le monde à rester groupé.
export const ZOOM_MIN = 0.5   // dézoom max (joueurs très éloignés)
export const ZOOM_MAX = 1.5   // zoom max (un seul joueur / joueurs proches)
export const CAM_MARGIN = 100 // marge monde autour des joueurs
export const CAM_LERP = 4     // vitesse de lissage de la caméra

// --- Le village (hub central) -----------------------------------------------
export const VILLAGE = { x: 480, y: 320, r: 44 }

// --- La rivière (bande ondulée à droite) ------------------------------------
export const RIVER = { baseX: 862, amp: 18, freq: 0.02, halfWidth: 22 }
export function riverCenterX(y) {
  return RIVER.baseX + Math.sin(y * RIVER.freq) * RIVER.amp
}

// --- Emplacements de construction -------------------------------------------
export const BUILD_SPOTS = [
  { id: 'lumberjack', x: 332, y: 388, building: 'lumberjack' },
  { id: 'fishinghut', x: 792, y: 300, building: 'fishinghut' },
  { id: 'quarry',     x: 645, y: 348, building: 'quarry' },
  { id: 'garden',     x: 500, y: 490, building: 'garden' },
]

// --- Arbres de la forêt (moitié gauche du monde) ----------------------------
export const TREES = [
  [70, 110], [120, 150], [60, 200], [150, 220], [90, 270], [180, 300],
  [50, 330], [130, 360], [80, 420], [170, 440], [60, 500], [140, 520],
  [210, 120], [250, 180], [220, 260], [280, 320], [240, 400], [290, 470],
  [200, 540], [110, 90], [30, 260], [320, 220], [260, 540], [40, 440],
]

// --- Spots de pêche le long de la berge -------------------------------------
export const FISH_SPOTS_Y = [120, 220, 320, 420, 520]

// --- Décor initial (buissons, rochers) --------------------------------------
export const BUSHES = [[360, 180], [420, 480], [560, 200], [620, 460], [700, 540], [400, 300]]
export const ROCKS = [[380, 540], [640, 150], [720, 360], [560, 540], [340, 120]]

// --- Roches récoltables (pierre) --------------------------------------------
export const STONE_SPOTS = [
  [530, 118], [658, 208], [728, 378], [580, 470], [454, 538], [758, 492],
]

// --- Buissons de baies récoltables ------------------------------------------
export const BERRY_SPOTS = [
  [206, 478], [314, 98], [392, 352], [554, 578], [680, 76],
]

// --- Couleurs des joueurs (dans l'ordre d'arrivée) --------------------------
export const PLAYER_COLORS = ['#e06c6c', '#6c8fe0', '#6cc08a', '#e0c76c', '#b78ce0', '#e0956c']
export const MAX_PLAYERS = 6

// --- Réglages de gameplay ---------------------------------------------------
export const BASE_SPEED = 74          // px monde / seconde (monde plus grand)
export const SPEED_PER_UPGRADE = 8
export const INTERACT_RANGE = 18
export const HARVEST_COOLDOWN = 0.65  // secondes entre deux récoltes (base, réductible avec Outils affûtés)
export const TREE_HP = 3
export const TREE_REGROW = 14         // secondes avant qu'une souche redevienne arbre
export const FISH_COOLDOWN = 2.4      // secondes avant qu'un spot de pêche revienne
export const STONE_HP = 3             // coups de pioche pour épuiser un rocher
export const STONE_REGROW = 20        // secondes avant qu'un rocher redevienne plein
export const BERRY_HP = 3             // cueillettes avant épuisement d'un buisson
export const BERRY_REGROW = 12        // secondes avant que le buisson refleurisse
export const DAY_LENGTH = 150         // durée d'un cycle jour/nuit complet (s)

// --- Inventaire joueur + charrette ------------------------------------------
export const PLAYER_INVENTORY_MAX = 9   // max d'objets portés par un joueur
export const CART_DEPOSIT_RANGE = 58    // rayon (monde) pour le dépôt auto au village
export const GLOBAL_CAPACITY_LEVELS = [25, 50, 75, 100, 200, 500, 1000]

// --- Définitions des bâtiments récolteurs -----------------------------------
export const BUILDINGS = {
  lumberjack: {
    name: 'Cabane de bûcheron',
    sprite: 'cabin',
    cost: { wood: 15 },
    produces: 'wood',
    amount: 1,
    interval: 3.0,
    requiresLevel: 1,
    hint: 'Récolte le bois toute seule',
  },
  fishinghut: {
    name: 'Ponton de pêche',
    sprite: 'hut',
    cost: { wood: 10, fish: 12 },
    produces: 'fish',
    amount: 1,
    interval: 3.5,
    requiresLevel: 2,
    hint: 'Pêche le poisson tout seul',
  },
  quarry: {
    name: 'Carrière',
    sprite: 'quarry',
    cost: { wood: 30, stone: 12 },
    produces: 'stone',
    amount: 1,
    interval: 4.5,
    requiresLevel: 3,
    hint: 'Extrait la pierre toute seule',
  },
  garden: {
    name: 'Jardin',
    sprite: 'garden',
    cost: { wood: 25, berries: 10 },
    produces: 'berries',
    amount: 1,
    interval: 4.0,
    requiresLevel: 3,
    hint: 'Cueille les baies toute seule',
  },
}

// --- Améliorations achetables au village ------------------------------------
export const UPGRADES = {
  speed: {
    name: 'Bottes rapides',
    desc: 'Tout le monde se déplace plus vite',
    baseCost: { wood: 12 },
    growth: 1.7,
    repeatable: true,
    max: 6,
  },
  harvest_yield: {
    name: 'Récolteur entraîné',
    desc: '+1 coup par ressource (arbre, roche, buisson)',
    baseCost: { wood: 20, fish: 8 },
    growth: 1.8,
    repeatable: true,
    max: 3,
  },
  harvest_speed: {
    name: 'Outils affûtés',
    desc: 'Réduit le temps entre deux coups de récolte',
    baseCost: { wood: 15, stone: 8 },
    growth: 1.7,
    repeatable: true,
    max: 3,
  },
  village_lvl: {
    name: 'Améliorer le village',
    descs: [
      'Débloque le ponton de pêche et agrandit le hameau',
      'Débloque la carrière, le jardin et le beau chalet',
    ],
    costs: [
      { wood: 40, fish: 25 },
      { wood: 60, fish: 20, stone: 30 },
    ],
    repeatable: true,
    max: 2,
  },
  // Outils (débloquent la récolte d'une ressource pour tout le monde)
  hache: {
    name: '🪓 Hache',
    desc: 'Permet à tout le monde de couper du bois',
    baseCost: {},
    growth: 1,
    repeatable: false,
    max: 1,
  },
  pioche: {
    name: '⛏️ Pioche',
    desc: 'Permet à tout le monde de miner la pierre',
    baseCost: { wood: 20 },
    growth: 1,
    repeatable: false,
    max: 1,
  },
  fishing_rod: {
    name: '🎣 Canne à pêche',
    desc: 'Permet à tout le monde de pêcher',
    baseCost: { wood: 15, stone: 10 },
    growth: 1,
    repeatable: false,
    max: 1,
  },
  faucille: {
    name: '🌾 Faucille',
    desc: 'Permet à tout le monde de cueillir des baies',
    baseCost: { wood: 15, stone: 10 },
    growth: 1,
    repeatable: false,
    max: 1,
  },
  charrette: {
    name: '🛒 Charrette',
    desc: 'Transporter les ressources jusqu\'au village',
    baseCost: { wood: 18 },
    growth: 2,
    repeatable: true,
    max: 4,
  },
  cap_wood: {
    name: '📦 Stockage bois',
    costs: [{ wood: 8 }, { wood: 18 }, { wood: 40 }, { wood: 70 }, { wood: 150 }, { wood: 400 }],
    repeatable: true,
    max: 6,
  },
  cap_fish: {
    name: '📦 Stockage poisson',
    costs: [{ fish: 8 }, { fish: 18 }, { fish: 40 }, { fish: 70 }, { fish: 150 }, { fish: 400 }],
    repeatable: true,
    max: 6,
  },
  cap_stone: {
    name: '📦 Stockage pierre',
    costs: [{ stone: 8 }, { stone: 18 }, { stone: 40 }, { stone: 70 }, { stone: 150 }, { stone: 400 }],
    repeatable: true,
    max: 6,
  },
  cap_berries: {
    name: '📦 Stockage baies',
    costs: [{ berries: 8 }, { berries: 18 }, { berries: 40 }, { berries: 70 }, { berries: 150 }, { berries: 400 }],
    repeatable: true,
    max: 6,
  },
}

