// ── Bâtiments récolteurs ──────────────────────────────────────────────────────
// Pour ajouter un bâtiment :
//   1. Ajouter une entrée ici (id = clé)
//   2. Ajouter un BUILD_SPOT dans layout.js
//   3. Ajouter le sprite dans sprites/defs.js
//   4. Initialiser le compteur dans store.js → game.buildings
//   5. Initialiser le timer dans world/buildings.js → this.prodTimers

export const BUILDINGS = {
  lumberjack: {
    name: 'Atelier de bûcheron',
    sprite: 'workshop',
    cost: { wood: 15 },
    produces: 'wood',
    amount: 1,
    interval: 3.0,
    storageMax: 20,
    requiresLevel: 1,
    hint: 'Récolte le bois toute seule',
    upgrades: {
      storage:           { name: '📦 Entrepôt agrandi',      desc: 'Double la capacité de stockage',          costs: [{ wood: 30 }, { wood: 80 }, { wood: 200 }],                       max: 3 },
      speed:             { name: '⚡ Production accélérée',  desc: 'Réduit le temps de production de 25 %',   costs: [{ wood: 25, stone: 8 }, { wood: 60, stone: 20 }, { wood: 150, stone: 50 }], max: 3 },
      transporter:       { name: '🚗 Transporteur auto',     desc: 'Charrette automatique bâtiment↔village',  costs: [{ wood: 50, stone: 20 }],                                         max: 1 },
      transporter_speed: { name: '🚀 Vitesse transporteur',  desc: 'Augmente la vitesse du transporteur',     costs: [{ wood: 20, stone: 8 }, { wood: 50, stone: 20 }, { wood: 120, stone: 50 }], max: 3 },
    },
  },
  fishinghut: {
    name: 'Ponton de pêche',
    sprite: 'hut',
    cost: { wood: 10, fish: 12 },
    produces: 'fish',
    amount: 1,
    interval: 3.5,
    storageMax: 20,
    requiresLevel: 2,
    hint: 'Pêche le poisson tout seul',
    upgrades: {
      storage:           { name: '📦 Entrepôt agrandi',      desc: 'Double la capacité de stockage',          costs: [{ fish: 20, wood: 15 }, { fish: 50, wood: 35 }, { fish: 120, wood: 80 }],  max: 3 },
      speed:             { name: '⚡ Production accélérée',  desc: 'Réduit le temps de production de 25 %',   costs: [{ fish: 15, wood: 20 }, { fish: 40, wood: 50 }, { fish: 100, wood: 120 }], max: 3 },
      transporter:       { name: '🚗 Transporteur auto',     desc: 'Charrette automatique bâtiment↔village',  costs: [{ wood: 50, stone: 20 }],                                              max: 1 },
      transporter_speed: { name: '🚀 Vitesse transporteur',  desc: 'Augmente la vitesse du transporteur',     costs: [{ wood: 20, stone: 8 }, { wood: 50, stone: 20 }, { wood: 120, stone: 50 }], max: 3 },
    },
  },
  quarry: {
    name: 'Carrière',
    sprite: 'quarry',
    cost: { wood: 30, stone: 12 },
    produces: 'stone',
    amount: 1,
    interval: 4.5,
    storageMax: 20,
    requiresLevel: 3,
    hint: 'Extrait la pierre toute seule',
    upgrades: {
      storage:           { name: '📦 Entrepôt agrandi',      desc: 'Double la capacité de stockage',          costs: [{ stone: 20, wood: 20 }, { stone: 50, wood: 50 }, { stone: 120, wood: 120 }], max: 3 },
      speed:             { name: '⚡ Production accélérée',  desc: 'Réduit le temps de production de 25 %',   costs: [{ stone: 15, wood: 20 }, { stone: 40, wood: 50 }, { stone: 100, wood: 120 }], max: 3 },
      transporter:       { name: '🚗 Transporteur auto',     desc: 'Charrette automatique bâtiment↔village',  costs: [{ wood: 50, stone: 25 }],                                                  max: 1 },
      transporter_speed: { name: '🚀 Vitesse transporteur',  desc: 'Augmente la vitesse du transporteur',     costs: [{ wood: 20, stone: 8 }, { wood: 50, stone: 20 }, { wood: 120, stone: 50 }], max: 3 },
    },
  },
  garden: {
    name: 'Jardin',
    sprite: 'garden',
    cost: { wood: 25, berries: 10 },
    produces: 'berries',
    amount: 1,
    interval: 4.0,
    storageMax: 20,
    requiresLevel: 3,
    hint: 'Cueille les baies toute seule',
    upgrades: {
      storage:           { name: '📦 Entrepôt agrandi',      desc: 'Double la capacité de stockage',          costs: [{ berries: 25, wood: 15 }, { berries: 60, wood: 35 }, { berries: 150, wood: 80 }], max: 3 },
      speed:             { name: '⚡ Production accélérée',  desc: 'Réduit le temps de production de 25 %',   costs: [{ berries: 20, wood: 15 }, { berries: 50, wood: 35 }, { berries: 120, wood: 80 }], max: 3 },
      transporter:       { name: '🚗 Transporteur auto',     desc: 'Charrette automatique bâtiment↔village',  costs: [{ wood: 50, stone: 20 }],                                                    max: 1 },
      transporter_speed: { name: '🚀 Vitesse transporteur',  desc: 'Augmente la vitesse du transporteur',     costs: [{ wood: 20, stone: 8 }, { wood: 50, stone: 20 }, { wood: 120, stone: 50 }], max: 3 },
    },
  },
  astronomy: {
    name: "Tour d'astronomie",
    sprite: 'astronomy',
    cost: { wood: 60, stone: 50, meteorite: 5 },
    produces: 'meteorite',
    amount: 1,
    interval: 25,
    storageMax: 5,
    requiresLevel: 4,
    hint: 'Collecte les météorites automatiquement',
    upgrades: {
      storage:           { name: '📦 Réserve agrandie',       desc: 'Double la capacité de stockage',          costs: [{ meteorite: 3 }, { meteorite: 6 }, { meteorite: 12 }],                                        max: 3 },
      speed:             { name: '⚡ Captation accélérée',    desc: 'Réduit le temps de captation de 25 %',    costs: [{ meteorite: 2, stone: 15 }, { meteorite: 5, stone: 30 }, { meteorite: 10, stone: 60 }],        max: 3 },
      transporter:       { name: '🚗 Transporteur auto',      desc: 'Charrette automatique bâtiment↔village',  costs: [{ meteorite: 4, wood: 30 }],                                                                   max: 1 },
      transporter_speed: { name: '🚀 Vitesse transporteur',   desc: 'Augmente la vitesse du transporteur',     costs: [{ stone: 15, wood: 20 }, { stone: 30, wood: 50 }, { stone: 60, wood: 120 }],                   max: 3 },
      observatory:       { name: '🔭 Observatoire',           desc: 'Ajoute un télescope — chaque niveau enrichit la vue',  costs: [{ meteorite: 5 }, { meteorite: 10 }, { meteorite: 20 }],                          max: 3 },
    },
  },
}
