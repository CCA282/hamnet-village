// Capacités de stockage global — coûts fixes calibrés pour rester sous le plafond courant
// Niveaux : 25 → 50 → 75 → 100 → 200 → 500 → 1000
export const upgradesStorage = {
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
    requiresLevel: 3,
  },
}
