# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This repo lives under `dev/games/`. Auth is delegated to Supabase Auth (see "Comptes" below), same Supabase project as the sibling `cine-planner` repo — not to `accounts-service` (also under `dev/games/`), which this repo no longer depends on.

## Commands

```bash
npm run dev       # dev server at http://localhost:5173 (proxies /api and /ws to server/ on :3001)
npm run build     # production build (use to verify correctness — no type-checker)
npm run preview   # serve the production build locally
npm run lint      # eslint src/
npm run test      # vitest — unit tests (src/tests/)
npm run test:e2e  # playwright — e2e tests (e2e/), starts its own dev server
```

After any change, run `npm run build` — after a change touching game logic or `src/net/`, also run `npm run test`; after a UI/flow change, also run `npm run test:e2e` (or at least the relevant spec file).

**After completing each feature, ask the user if they want to commit before moving on.**

## Architecture

**Petit Hameau** is a cozy co-op idle game, playable **local** (couch co-op, no backend) or **online** (a small Node server relays rooms and can persist saves). Frontend: Vue 3 + Vite. The game loop runs on a `<canvas>`, UI overlays are Vue components.

### Two rendering layers

- **Canvas** (`GameCanvas.vue` → `engine.js` → `World`) — pixel-art game world, 60 fps loop, non-reactive JS objects for performance.
- **Vue UI** (`Hud.vue`, `VillageMenu.vue`, etc.) — reads from `game` (Vue `reactive`) and re-renders only when game state changes.

### Data flow

```
Input (keyboard/pad/touch/mouse)
  → engine.js game loop
    → World.update(dt, input)   ← all game logic
    → World.render(ctx)         ← all canvas drawing
  → game (Vue reactive)         ← shared state for UI (store.js)
    → Hud.vue, VillageMenu.vue
```

`game` in `store.js` is the only Vue-reactive object. Everything in `World` (player positions, tree HP, etc.) is plain JS — intentionally non-reactive for perf.

### File map

| Path | Role |
|------|------|
| `src/game/engine.js` | Singleton: RAF loop, canvas resize, input↔world bridge |
| `src/game/store.js` | Vue `reactive` game state + all store functions (upgradeCost, buyUpgrade, harvest, globalCap…) |
| `src/game/input.js` | Keyboard (2 schemes), gamepad (Gamepad API), mouse, touch |
| `src/game/constants/` | Split by theme: camera, layout (positions), gameplay (tuning), buildings, upgrades |
| `src/game/sprites/` | `palette.js` (colors), `defs.js` (pixel-art grids), `index.js` (build/cache/export) |
| `src/game/world/World.js` | `World` class shell: constructor + `update()` + `render()` entry points |
| `src/game/world/*.js` | World behaviour split as mixin objects assigned to `World.prototype` |
| `src/net/socket.js` | Thin WebSocket wrapper (connect/send/onMsg) used by online mode |
| `src/net/sync.js` | `serializeWorld`/`applyWorldState` (world ↔ plain JSON), plus save/load — routes to `localStorage` or the backend depending on `netState.user` (see "Comptes" below) |
| `src/net/netState.js` | Non-canvas reactive state: `mode` (`local`/`host`/`guest`), room code, `user` (signed-in account or `null`) |
| `src/net/supabase.js` | Supabase client (`createClient`), reads `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` |
| `src/net/accounts.js` | `signup`/`login`/`logout`/`fetchMe`/`authHeaders` — thin wrapper around `supabase.auth.*` |
| `server/index.js` | Node (`http` + `ws`) — relays room state between host/guests, persists worlds for signed-in users |

### World module pattern

`World` methods live in separate files and are merged via `Object.assign(World.prototype, …)` at the bottom of `World.js`. Each module exports a plain object of methods that use `this` normally.

Modules: `players`, `menu`, `actions`, `resources`, `carts`, `buildings`, `particles`, `nature`, `camera`, `hints`, `renderer`.

### Coordinate systems

- **World space**: 1000×620 px — all game logic lives here.
- **Viewport**: 480×270 logical px — camera maps world→viewport.
- **Canvas**: physical pixels = `clientSize × devicePixelRatio` — scaled by engine on resize.

### Sprites

All sprites are pixel-art grids rendered to offscreen `<canvas>` elements at startup and cached. Definition format: `{ rows: string[], pal: { char: hexColor } }`. `'.'` = transparent. Draw with `drawBottom(ctx, sprite('key'), cx, baselineY)` — positions by bottom-center.

### Adding a building

1. `constants/buildings.js` — add entry to `BUILDINGS`
2. `constants/layout.js` — add entry to `BUILD_SPOTS` (world coords, avoid x > 840)
3. `sprites/defs.js` — add sprite to `DEFS`
4. `store.js` — add `building_id: 0` to `game.buildings`
5. `world/World.js` — add `building_id: 0` to `this.prodTimers`

Or use `/add-building` slash command for a guided checklist.

### Adding an upgrade

1. `constants/upgrades.js` — add entry to `UPGRADES` (use `costs[]` for fixed per-level costs, `baseCost`+`growth` for exponential)
2. `store.js` — add `upgrade_id: 0` to `game.upgrades`; place key in the right `TAB_KEYS` slot (0=village, 1=outils, 2=stockage, 3=bonus)
3. Implement effect in the relevant `world/` module, reading `game.upgrades.upgrade_id`

Or use `/add-upgrade` slash command.

### Key gameplay constants

- `HARVEST_COOLDOWN` (0.65s base) — reduced by `harvest_speed` upgrade: `× 0.8^level`
- `PLAYER_INVENTORY_MAX` (9) — player carries items, auto-deposits at village or cart
- `GLOBAL_CAPACITY_LEVELS` — storage caps per resource, unlocked via `cap_*` upgrades
- Resource HP (TREE_HP=3, STONE_HP=3, BERRY_HP=3) — boosted by `harvest_yield` upgrade: `+1 per level`

### Dev mode

Toggle `game.devMode = true` in console → `canAfford` always returns true, `pay` is a no-op. Useful for testing late-game content without grinding.

### Comptes (Supabase Auth)

Auth is delegated to Supabase Auth (email + password) — same Supabase project as `cine-planner`, but a separate concern from it (no shared table; hamnet only uses Supabase for identity, not storage). This repo never stores a password. Where a save lives depends **only** on `netState.user` (signed in or not), not on local/host mode:

- Signed in → `server/index.js` (`POST/GET /api/worlds`), tagged and filtered by `ownerId` (the Supabase user's uuid).
- Signed out → `localStorage` only, nothing sent to the backend.

`server/index.js` verifies the JWT by calling `supabase.auth.getUser(token)` (`SUPABASE_URL`/`SUPABASE_ANON_KEY`) — unlike the old accounts-service setup, this is a network round-trip to Supabase's Auth API per request rather than local-only verification (Supabase's signing scheme isn't assumed to be a static shared secret). If you add a new save-related endpoint, gate it the same way (`getUser(req)` in `server/index.js`) rather than trusting an unauthenticated `ownerId` from the client.

`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` (Vite env vars, **build-time only**) point the frontend at the Supabase project. In prod they're baked in via `docker-publish.yml`'s `--build-arg` from the `SUPABASE_URL`/`SUPABASE_ANON_KEY` repo variables — changing them requires rebuilding the image, not just redeploying. The anon key is meant to be public (same key `supabase-js` ships to every browser).

Note: this is a full re-architecture from the previous accounts-service-based setup (see git history) — old accounts-service user ids don't match Supabase uuids, so worlds saved under an old account are orphaned (still on disk under their old `ownerId`, just no longer reachable through the account view).

### Tests

- **Unit** (`npm run test`, vitest, `src/tests/`): pure game-logic and `src/net/` modules. `localStorage`/`fetch` aren't available in the `node` test environment — stub them with `vi.stubGlobal(...)` at the top of the file before importing the module under test. `src/net/supabase.js` is mocked with `vi.mock('../net/supabase.js', ...)` rather than stubbing `fetch`, since `@supabase/supabase-js` isn't a thin fetch wrapper (see `src/tests/accounts.test.js`, `sync-storage.test.js`).
- **E2E** (`npm run test:e2e`, Playwright, `e2e/`): drives a real browser against `npm run dev`. **Nothing in `server/` or Supabase actually runs in CI** — WebSocket is replaced with a `MockWebSocket` (`page.addInitScript`, see `online-coop.spec.js`), and HTTP calls (`/api/worlds`, Supabase's `/auth/v1/*` REST endpoints) are intercepted with `page.route()` (see `accounts.spec.js`). `VITE_SUPABASE_URL` is unset in this suite, so the client falls back to the fixed placeholder `https://not-configured.supabase.co` (see `src/net/supabase.js`) — that's the exact host `accounts.spec.js` routes. Keep it that way — e2e tests must never assume a real backend or Supabase project is reachable.
