// Outils — débloquent la récolte manuelle d'une ressource pour tous les joueurs
// + charrette pour le transport
export const upgradesTools = {
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
}
