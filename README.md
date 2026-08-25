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

## Images Docker

Chaque merge sur `main` déclenche `.github/workflows/docker-publish.yml`, qui build et publie deux images sur le GitHub Container Registry (ghcr.io) :

- `ghcr.io/cca282/hamnet-village-frontend`
- `ghcr.io/cca282/hamnet-village-server`

Tags poussés : `latest` et `sha-<court>` (le sha du commit sur `main`).

> **`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`** — l'image `frontend` est buildée avec ces variables (via les variables de repo GitHub `vars.SUPABASE_URL`/`vars.SUPABASE_ANON_KEY`, passées en `--build-arg` dans `docker-publish.yml`) pour pointer vers le projet Supabase. Tant qu'elles ne sont pas configurées sur le repo, l'image publiée reste jouable mais sans compte ni sauvegarde en ligne (mode local uniquement).

### Déployer sur un NAS / Raspberry Pi

Les packages GHCR sont **privés** par défaut : il faut se connecter une fois sur la machine cible avec un [Personal Access Token](https://github.com/settings/tokens) (scope `read:packages`) :

```bash
echo <TOKEN> | docker login ghcr.io -u <ton-user-github> --password-stdin
```

Puis, avec `docker-compose.prod.yml` (référence les images publiées au lieu de les rebuild) copié sur la machine :

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

> Les images sont buildées en `amd64` uniquement pour l'instant — à adapter (build multi-arch) si le déploiement cible est un Raspberry Pi en ARM64.

### Mise à jour automatique (Watchtower)

`docker-compose.prod.yml` inclut un service `watchtower` : il vérifie ghcr.io toutes les 5 min (`WATCHTOWER_POLL_INTERVAL`) et, si une nouvelle image `latest` a été publiée, la pull et redémarre le conteneur concerné automatiquement.

- **Aucun port entrant** n'est ouvert sur le NAS/RPi : Watchtower ne fait que du sortant vers ghcr.io.
- **Périmètre limité** aux services `frontend`/`backend` de ce projet via le label `com.centurylinklabs.watchtower.enable=true` — les autres conteneurs éventuellement présents sur la machine ne sont pas touchés (`WATCHTOWER_LABEL_ENABLE=true`).
- Watchtower réutilise les identifiants du `docker login ghcr.io` déjà fait sur la machine (monte `~/.docker/config.json` en lecture seule) — pas de token dupliqué dans le compose file.
- `WATCHTOWER_CLEANUP=true` supprime les anciennes images après update, pour éviter d'accumuler des couches inutiles.
- Le `docker compose -f docker-compose.prod.yml up -d` de la section précédente suffit à le démarrer — rien à installer en plus.

## Comptes et sauvegardes

L'authentification passe par [Supabase Auth](https://supabase.com) (email + mot de passe) — même projet Supabase que cine-planner. Hamnet ne stocke ni mot de passe ni compte lui-même : `server/` vérifie juste les tokens émis par Supabase.

**Où est stockée une sauvegarde ?** Ça dépend uniquement de l'état de connexion, pas du mode de jeu (solo/multi) :

| | Non connecté | Connecté (compte) |
|---|---|---|
| Stockage | `localStorage` du navigateur | Backend Hamnet (`server/`) |
| Visible sur un autre appareil | Non | Oui (même compte) |
| Visible par d'autres joueurs | Non | Non — filtré par compte |

Se connecter est **optionnel** : le solo/multi sans compte reste jouable normalement, juste sans persistance au-delà de cet appareil/navigateur.

### Backend (`server/`)

- `POST /api/worlds`, `GET /api/worlds` (liste) et `GET /api/worlds/:id` (chargement) nécessitent désormais un header `Authorization: Bearer <token>` valide — sans compte, ces routes renvoient `401`.
- Chaque sauvegarde est taguée `ownerId` (l'id du compte Supabase, un uuid) ; la liste et le chargement sont filtrés pour qu'un compte ne voie jamais les mondes d'un autre.
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` (variables d'env) pointent vers le même projet Supabase que le frontend — `server/` appelle `supabase.auth.getUser(token)` pour vérifier chaque requête (l'anon key suffit, aucune clé privilégiée n'est nécessaire côté serveur). Sans elles, le serveur démarre quand même (le multijoueur en direct sans sauvegarde fonctionne) mais toutes les routes `/api/worlds` renvoient `401`.
- Les sauvegardes sont des fichiers JSON, un par monde, dans `DATA_DIR` (défaut `./data/worlds`, créé automatiquement). **`server/data/` n'est pas versionné** (voir `.gitignore`).

### Frontend

- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (variables d'env au build) pointent vers le projet Supabase. Sans elles, l'app reste jouable mais sans compte (mode local uniquement) — voir `src/net/supabase.js`.
- La session est gérée par `@supabase/supabase-js` (persistée en `localStorage` par le SDK) ; `netState.user` suit `supabase.auth.onAuthStateChange`.

### En production

Le `Dockerfile` de `server/` ne déclare pas de volume : sans configuration supplémentaire, `server/data/` vit dans le conteneur et **disparaît au redéploiement**. Pour persister les sauvegardes :

- Monter `DATA_DIR` sur un volume persistant (ex. `docker run -v hamnet-saves:/app/data/worlds -e DATA_DIR=/app/data/worlds ...`, ou l'équivalent chez l'hébergeur utilisé).
- Sauvegarder ce volume revient à sauvegarder ce dossier — un simple `tar`/`rsync` de `DATA_DIR` suffit (ce sont des fichiers JSON indépendants, pas de base de données à arrêter).
- **Migrer** un monde vers un autre déploiement : copier le fichier `<id>.json` correspondant dans le `DATA_DIR` de la nouvelle instance ; l'ID redevient utilisable tel quel via `GET /api/worlds/:id`.
