# 🏡 Petit Hameau

Jeu incrémental cozy en coopération locale — jusqu'à 6 joueurs sur le même écran.

## Lancer le jeu

```bash
npm install
npm run dev
```

Ouvre [http://localhost:5173](http://localhost:5173) dans le navigateur. Le serveur est aussi accessible en local sur le réseau (pratique pour tester depuis un autre appareil).

## Comment jouer

### Rejoindre la partie
- **Clavier 1** (WASD + Espace/E) : appuyer sur Espace pour rejoindre
- **Clavier 2** (Flèches + Entrée) : appuyer sur Entrée pour rejoindre
- **Manette** : appuyer sur A pour rejoindre
- **Tactile** : toucher le joystick ou le bouton action

### Ressources
Récoltez du bois 🪵, du poisson 🐟, de la pierre ⛏️ et des baies 🫐 autour du hameau.

Chaque joueur porte un inventaire de 9 objets. Les ressources se déposent automatiquement :
- en passant dans le rayon du village
- en approchant une charrette 🛒

### Village
Approchez le feu de camp pour ouvrir le menu et acheter des améliorations :
- **Village** : niveaux qui débloquent de nouveaux bâtiments
- **Outils** : hache, pioche, canne à pêche, faucille — débloquent la récolte manuelle
- **Stockage** : augmente la capacité maximale du stock global
- **Bonus** : bottes rapides, récolteur entraîné, outils affûtés

### Navigation menu
- **Clavier** : ←→ pour changer d'onglet, ↑↓ pour sélectionner, Espace pour acheter
- **Manette** : stick gauche pour naviguer, A pour acheter, B pour fermer

## Stack technique

- Vue 3 + Vite
- Canvas 2D (pixel-art, nearest-neighbor scaling)
- Aucun framework de jeu — moteur maison (~60 fps, RAF loop)
- Le mode local ne dépend d'aucun backend. Le mode en ligne (`server/`) est un petit serveur Node (WebSocket + HTTP) qui relaie les rooms et stocke les sauvegardes — voir ci-dessous.

## Build production

```bash
npm run build    # → dist/
npm run preview  # prévisualiser le build
```

## Sauvegardes serveur

Le mode "Jouer en ligne" s'appuie sur `server/index.js` (Node, `ws` + `http`). Chaque monde est sauvegardé sous forme d'un fichier JSON, un par monde :

```
<DATA_DIR>/<id>.json
```

- `DATA_DIR` (variable d'env, défaut `./data/worlds`) définit où ces fichiers sont écrits. Le dossier est créé automatiquement au démarrage s'il n'existe pas.
- `<id>` est soit l'ID généré à la première sauvegarde, soit celui d'un monde déjà sauvegardé (ré-écrit à chaque save).
- Une sauvegarde peut être déclenchée par HTTP (`POST /api/worlds`, utilisé par le bouton "Sauvegarder" du HUD) ou par le host via WebSocket (`save_world`). La liste des mondes sauvegardés est exposée par `GET /api/worlds`, un monde précis par `GET /api/worlds/:id`.
- **`server/data/` n'est pas versionné** (voir `.gitignore`) : ces sauvegardes sont des données d'exécution, pas du code.

### En production

Le `Dockerfile` de `server/` ne déclare pas de volume : sans configuration supplémentaire, `server/data/` vit dans le conteneur et **disparaît au redéploiement**. Pour persister les sauvegardes :

- Monter `DATA_DIR` sur un volume persistant (ex. `docker run -v hamnet-saves:/app/data/worlds -e DATA_DIR=/app/data/worlds ...`, ou l'équivalent chez l'hébergeur utilisé).
- Sauvegarder ce volume revient à sauvegarder ce dossier — un simple `tar`/`rsync` de `DATA_DIR` suffit (ce sont des fichiers JSON indépendants, pas de base de données à arrêter).
- **Migrer** un monde vers un autre déploiement : copier le fichier `<id>.json` correspondant dans le `DATA_DIR` de la nouvelle instance ; l'ID redevient utilisable tel quel via `GET /api/worlds/:id`.
