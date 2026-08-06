# Ajouter une amélioration achetable

Pour ajouter une nouvelle amélioration dans le menu village de Petit Hameau.

## Arguments
`$ARGUMENTS` — nom de l'amélioration et onglet (ex: "Forge bonus", "Entrepôt stockage")

## Étapes

### 1. Définir l'amélioration — `src/game/constants/upgrades.js`
Ajouter une entrée dans `UPGRADES` :

**Amélioration simple (coût croissant) :**
```js
mon_upgrade: {
  name: 'Mon Amélioration',
  desc: 'Description visible dans le menu',
  baseCost: { wood: 20, stone: 10 },
  growth: 1.7,         // multiplicateur de coût par niveau
  repeatable: true,    // false = achat unique
  max: 3,              // niveaux max
},
```

**Amélioration avec coûts fixes par niveau :**
```js
mon_upgrade: {
  name: 'Mon Amélioration',
  descs: ['Desc niveau 1', 'Desc niveau 2'],  // optionnel
  costs: [{ wood: 10 }, { wood: 25 }, { wood: 60 }],
  repeatable: true,
  max: 3,
},
```

### 2. Initialiser le niveau — `src/game/store.js`
Dans `game.upgrades` :
```js
upgrades: {
  // ... existants ...
  mon_upgrade: 0,
},
```

### 3. Placer dans un onglet — `src/game/store.js`
Dans `TAB_KEYS` (4 onglets : 0=village, 1=outils, 2=stockage, 3=bonus) :
```js
const TAB_KEYS = [
  ['village_lvl'],
  ['hache', 'pioche', 'fishing_rod', 'faucille'],
  ['charrette', 'cap_wood', 'cap_fish', 'cap_stone', 'cap_berries'],
  ['speed', 'harvest_yield', 'harvest_speed', 'mon_upgrade'],  // ← ici
]
```

### 4. Implémenter l'effet
Selon le type d'effet :

**Effet sur la récolte joueur** → `src/game/world/resources.js`
```js
// Dans effectiveHarvestCd, harvestToPlayer, ou updateTrees/updateStone/updateFish
```

**Effet sur la vitesse** → déjà géré dans `World.js` via `game.upgrades.speed`

**Nouvel effet** → ajouter la logique dans le module `world/` approprié et référencer `game.upgrades.mon_upgrade`

## Vérification
```bash
npm run build
```
L'amélioration apparaît dans le bon onglet du menu, avec badge niveau/max et grisée si non achetable.
