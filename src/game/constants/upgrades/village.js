export const upgradesVillage = {
  village_lvl: {
    name: 'Améliorer le village',
    descs: [
      'Débloque le ponton de pêche et agrandit le hameau',
      "Débloque la carrière, le jardin et le beau chalet",
      "Débloque la tour d'astronomie et l'ère stellaire",
    ],
    costs: [
      { wood: 40, fish: 25 },
      { wood: 60, berries: 20, stone: 30 },
      { wood: 80, stone: 60, meteorite: 8 },
    ],
    repeatable: true,
    max: 3,
  },
}
