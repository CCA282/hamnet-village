// ── Améliorations achetables au village ───────────────────────────────────────
// Pour ajouter une amélioration :
//   1. Ajouter une entrée ici (id = clé)
//   2. Ajouter l'id dans game.upgrades (store.js)
//   3. Ajouter l'id dans TAB_KEYS[onglet approprié] (store.js)
//   4. Implémenter l'effet dans world/ si nécessaire

export const UPGRADES = {
  // ── Village ────────────────────────────────────────────────────────────────
  village_lvl: {
    name: 'Améliorer le village',
    descs: [
      'Débloque le ponton de pêche et agrandit le hameau',
      'Débloque la carrière, le jardin et le beau chalet',
    ],
    costs: [{ wood: 40, fish: 25 }, { wood: 60, fish: 20, stone: 30 }],
    repeatable: true,
    max: 2,
  },

  // ── Outils (débloquent la récolte d'une ressource) ────────────────────────
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
    desc: "Transporter les ressources jusqu'au village",
    baseCost: { wood: 18 },
    growth: 2,
    repeatable: true,
    max: 4,
  },

  // ── Stockage ───────────────────────────────────────────────────────────────
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
  cap_meteorite: {
    name: '📦 Stockage météorite',
    costs: [{ meteorite: 3 }, { meteorite: 8 }, { meteorite: 18 }, { meteorite: 40 }, { meteorite: 80 }, { meteorite: 200 }],
    repeatable: true,
    max: 6,
  },

  // ── Bonus joueur ───────────────────────────────────────────────────────────
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
}
