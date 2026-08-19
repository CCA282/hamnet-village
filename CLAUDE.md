# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This repo lives under `dev/games/` alongside sibling projects: [`accounts-service`](https://github.com/CCA282/accounts-service) (shared auth, its own repo, its own CLAUDE.md) and, eventually, a shared game template. Don't assume this repo is self-contained for identity/accounts — see "Comptes" below.

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
| `src/net/accounts.js` | Calls to accounts-service (`/signup`, `/login`, `/me`) — the only file that talks to that service |
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

### Comptes (accounts-service)

Auth is delegated entirely to [accounts-service](https://github.com/CCA282/accounts-service) — this repo never stores a password. Where a save lives depends **only** on `netState.user` (signed in or not), not on local/host mode:

- Signed in → `server/index.js` (`POST/GET /api/worlds`), tagged and filtered by `ownerId`.
- Signed out → `localStorage` only, nothing sent to the backend.

`server/index.js` verifies the JWT itself (`JWT_SECRET`, shared with accounts-service) — it never calls accounts-service over the network. If you add a new save-related endpoint, gate it the same way (`getUser(req)` in `server/index.js`) rather than trusting an unauthenticated `ownerId` from the client.

`VITE_ACCOUNTS_URL` (Vite env var, **build-time only**) points the frontend at accounts-service. In prod it's baked in via `docker-publish.yml`'s `--build-arg` from the `ACCOUNTS_URL` repo variable — changing it requires rebuilding the image, not just redeploying.

### Tests

- **Unit** (`npm run test`, vitest, `src/tests/`): pure game-logic and `src/net/` modules. `localStorage`/`fetch` aren't available in the `node` test environment — stub them with `vi.stubGlobal(...)` at the top of the file before importing the module under test (see `src/tests/accounts.test.js`, `sync-storage.test.js`).
- **E2E** (`npm run test:e2e`, Playwright, `e2e/`): drives a real browser against `npm run dev`. **Nothing in `server/` or accounts-service actually runs in CI** — WebSocket is replaced with a `MockWebSocket` (`page.addInitScript`, see `online-coop.spec.js`), and HTTP calls (`/api/worlds`, accounts-service) are intercepted with `page.route()` (see `accounts.spec.js`). Keep it that way — e2e tests must never assume a real backend or accounts-service instance is listening.
