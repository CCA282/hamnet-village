// Bonus joueur — améliorent vitesse, rendement ou cadence de récolte
export const upgradesBonus = {
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
  bag_size: {
    name: '🎒 Grand sac',
    desc: '+3 objets dans l\'inventaire de chaque joueur',
    baseCost: { wood: 20, stone: 8 },
    growth: 2.0,
    repeatable: true,
    max: 3,
  },
  cart_size: {
    name: '🛒 Grande charrette',
    desc: '+9 objets dans la charrette',
    baseCost: { wood: 25, stone: 12 },
    growth: 2.0,
    repeatable: true,
    max: 3,
  },
}
