# Ajouter un bâtiment récolteur

Pour ajouter un nouveau bâtiment récolteur dans Petit Hameau, voici les 5 étapes à suivre exactement dans l'ordre.

## Arguments
`$ARGUMENTS` — nom du bâtiment (ex: "Moulin", "Ruche")

## Étapes

### 1. Définir le bâtiment — `src/game/constants/buildings.js`
Ajouter une entrée dans l'objet `BUILDINGS` :
```js
mon_batiment: {
  name: 'Mon Bâtiment',
  sprite: 'mon_sprite',      // clé dans sprites/defs.js
  cost: { wood: 20, stone: 10 },
  produces: 'wood',          // 'wood' | 'fish' | 'stone' | 'berries'
  amount: 1,                 // quantité produite par tick
  interval: 4.0,             // secondes entre deux productions
  requiresLevel: 2,          // niveau village requis (1, 2 ou 3)
  hint: 'Description courte',
},
```

### 2. Ajouter un emplacement — `src/game/constants/layout.js`
Ajouter dans `BUILD_SPOTS` :
```js
{ id: 'mon_batiment', x: 600, y: 250, building: 'mon_batiment' },
```
Choisir des coordonnées monde (0-1000 x, 0-620 y), pas dans l'eau (x < ~840).

### 3. Créer le sprite — `src/game/sprites/defs.js`
Ajouter dans `DEFS` :
```js
mon_sprite: {
  rows: [
    // grille pixel-art, '.' = transparent
    '..RRRRRR..',
    '.RRRRRRRR.',
    // ...
  ],
  pal: { R: '#cb8a42', /* ... */ },
},
```
S'inspirer des sprites existants (cabin, hut, quarry, garden). Largeur/hauteur libres.

### 4. Initialiser le compteur — `src/game/store.js`
Dans `game.buildings` :
```js
buildings: { lumberjack: 0, fishinghut: 0, quarry: 0, garden: 0, mon_batiment: 0 },
```

### 5. Initialiser le timer — `src/game/world/World.js`
Dans `this.prodTimers` :
```js
this.prodTimers = { lumberjack: 0, fishinghut: 0, quarry: 0, garden: 0, mon_batiment: 0 }
```

## Vérification
```bash
npm run build
```
Le bâtiment apparaît automatiquement sur la carte, son marqueur en pointillés s'affiche quand le joueur s'approche.
