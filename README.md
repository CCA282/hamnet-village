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

## Déploiement (GitHub Pages)

Chaque merge sur `main` déclenche `.github/workflows/pages-deploy.yml` : build (`npm run build`, avec `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` injectées depuis les variables de repo GitHub `vars.SUPABASE_URL`/`vars.SUPABASE_ANON_KEY`) puis publication de `dist/` sur GitHub Pages.

Le frontend est 100% statique (aucun backend custom, voir ci-dessous) — GitHub Pages sert `dist/` tel quel.

## Comptes, multijoueur en ligne et sauvegardes

Tout passe par [Supabase](https://supabase.com) (même projet que `cine-planner`) — pas de backend custom :

- **Auth** : email + mot de passe via Supabase Auth.
- **Relay temps réel** (rooms host/guest) : un channel Supabase Realtime par room
  (`hamnet:room:<CODE>`), Broadcast pour l'état du monde/inputs/menus, Presence pour
  savoir qui est host/guest et détecter les join/leave — voir `src/net/realtime.js`.
- **Sauvegardes** : table Postgres `hamnet_worlds`, RLS'd sur `auth.uid()` — voir
  `src/net/sync.js`.

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
