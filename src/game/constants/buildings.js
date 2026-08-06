// ── Bâtiments récolteurs ──────────────────────────────────────────────────────
// Pour ajouter un bâtiment :
//   1. Ajouter une entrée ici (id = clé)
//   2. Ajouter un BUILD_SPOT dans layout.js
//   3. Ajouter le sprite dans sprites/defs.js
//   4. Initialiser le compteur dans store.js → game.buildings
//   5. Initialiser le timer dans world/buildings.js → this.prodTimers

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
