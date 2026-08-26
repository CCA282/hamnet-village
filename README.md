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
- Aucun backend custom : le mode local ne dépend de rien, et le mode en ligne parle directement à [Supabase](https://supabase.com) — Realtime (Broadcast + Presence) relaie les rooms, Postgres stocke les sauvegardes. Voir ci-dessous.

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

## Comptes, multijoueur en ligne et sauvegardes

Tout passe par [Supabase](https://supabase.com) (même projet que `cine-planner`) — pas de backend custom :

- **Auth** : email + mot de passe via Supabase Auth.
- **Relay temps réel** (rooms host/guest) : un channel Supabase Realtime par room
  (`hamnet:room:<CODE>`), Broadcast pour l'état du monde/inputs/menus, Presence pour
  savoir qui est host/guest et détecter les join/leave — voir `src/net/realtime.js`.
- **Sauvegardes** : table Postgres `hamnet_worlds`, RLS'd sur `auth.uid()` — voir
  `src/net/sync.js`.

> **Note** : `server/`, les Dockerfiles et `docker-compose*.yml` sont encore présents
> dans ce repo mais ne sont plus utilisés par le frontend (plus aucun appel HTTP/WS
> vers eux) — obsolètes en attendant une PR de nettoyage qui les supprime et bascule
> l'hébergement du frontend vers un hébergeur statique (GitHub Pages).

**Où est stockée une sauvegarde ?** Ça dépend uniquement de l'état de connexion, pas du mode de jeu (solo/multi) :

| | Non connecté | Connecté (compte) |
|---|---|---|
| Stockage | `localStorage` du navigateur | Table Postgres `hamnet_worlds` |
| Visible sur un autre appareil | Non | Oui (même compte) |
| Visible par d'autres joueurs | Non | Non — RLS filtre par `owner_id` |

Se connecter est **optionnel** : le solo/multi sans compte reste jouable normalement, juste sans persistance au-delà de cet appareil/navigateur.

### Configuration Supabase requise

En plus du projet Auth déjà configuré (voir `cine-planner`), créer la table `hamnet_worlds`
dans le SQL Editor du projet :

```sql
create table hamnet_worlds (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users not null,
  name text not null,
  data jsonb not null,
  saved_at timestamptz not null default now()
);
create index hamnet_worlds_owner_saved_idx on hamnet_worlds (owner_id, saved_at desc);
alter table hamnet_worlds enable row level security;
create policy "own rows" on hamnet_worlds for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
grant select, insert, update, delete on table hamnet_worlds to authenticated;
```

`hamnet_` préfixe le nom de la table à dessein : le projet Supabase est partagé entre
plusieurs jeux, chaque jeu doit préfixer ses propres objets (tables, topics Realtime)
pour ne pas collisionner avec les autres.

### Frontend

- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (variables d'env au build) pointent vers le projet Supabase. Sans elles, l'app reste jouable mais sans compte ni multijoueur en ligne (mode local uniquement) — voir `src/net/supabase.js`.
- La session est gérée par `@supabase/supabase-js` (persistée en `localStorage` par le SDK) ; `netState.user` suit `supabase.auth.onAuthStateChange`.

### Ancien backend (`server/`, obsolète)

<details>
<summary>Documentation historique — server/ n'est plus appelé par le frontend</summary>

Le `Dockerfile` de `server/` ne déclare pas de volume : sans configuration supplémentaire, `server/data/` vit dans le conteneur et **disparaît au redéploiement**. Pour persister les sauvegardes :

- Monter `DATA_DIR` sur un volume persistant (ex. `docker run -v hamnet-saves:/app/data/worlds -e DATA_DIR=/app/data/worlds ...`, ou l'équivalent chez l'hébergeur utilisé).
- Sauvegarder ce volume revient à sauvegarder ce dossier — un simple `tar`/`rsync` de `DATA_DIR` suffit (ce sont des fichiers JSON indépendants, pas de base de données à arrêter).
- **Migrer** un monde vers un autre déploiement : copier le fichier `<id>.json` correspondant dans le `DATA_DIR` de la nouvelle instance ; l'ID redevient utilisable tel quel via `GET /api/worlds/:id`.

</details>
