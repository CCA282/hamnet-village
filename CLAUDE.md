# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This repo lives under `dev/games/`. Auth is delegated to Supabase Auth (see "Comptes" below), same Supabase project as the sibling `cine-planner` repo — not to `accounts-service` (also under `dev/games/`), which this repo no longer depends on.

## Commands

```bash
npm run dev       # dev server at http://localhost:5173 — talks directly to Supabase, no backend proxy
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
| `src/net/realtime.js` | Room lifecycle + relay over a Supabase Realtime channel (Broadcast + Presence) — `createRoomAsHost`/`joinRoomAsGuest`, `broadcastState`/`sendInput`/etc., `onState`/`onGuestJoined`/etc. callbacks. See "Multijoueur en ligne" below |
| `src/net/sync.js` | `serializeWorld`/`applyWorldState` (world ↔ plain JSON), plus save/load — routes to `localStorage` or Supabase Postgres (`hamnet_worlds`) depending on `netState.user` (see "Comptes" below) |
| `src/net/netState.js` | Non-canvas reactive state: `mode` (`local`/`host`/`guest`), room code, `user` (signed-in account or `null`) |
| `src/net/supabase.js` | Supabase client (`createClient`), reads `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` |
| `src/net/accounts.js` | `signup`/`login`/`logout` — thin wrapper around `supabase.auth.*` |
| `server/index.js` | **Vestigial** — the old Node WS/HTTP relay, no longer called by the frontend (kept until a follow-up removes it + Docker/NAS, see "Multijoueur en ligne") |

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

Auth is delegated to Supabase Auth (email + password) — same Supabase project as `cine-planner`, but a separate concern from it (no shared table; hamnet only reuses the project for identity + its own storage).

### Multijoueur en ligne et sauvegardes (Supabase Realtime + Postgres)

**No custom backend** — `server/` is vestigial (see file map above), kept only until a follow-up PR removes it along with Docker/the NAS deployment and moves the static frontend to GitHub Pages. Both jobs it used to do now go straight to Supabase, same project as auth:

- **Room relay**: one Realtime channel per room, topic `hamnet:room:<CODE>` (the `hamnet:` prefix matters — Realtime topics are a namespace shared by every game on this Supabase project, so an unprefixed code could collide with another game's channel). `src/net/realtime.js` is the only file that touches `supabase.channel(...)` — everything else (`Lobby.vue`, `engine.js`) calls its named functions (`createRoomAsHost`, `joinRoomAsGuest`, `broadcastState`, `sendInput`, `sendGuestMenuAction`, `broadcastMenuOpenForGuest`/`broadcastMenuCloseForGuest`) and callbacks (`onState`, `onInput`, `onGuestJoined`/`onGuestLeft`, `onOpenMenu`/`onCloseMenu`, `onGuestMenuAction`, `onHostLeft`, `onDisconnected`). Host/guest roles and join/leave are tracked via Presence, not a server-side room registry — there's no central authority to ask "does this room exist", so a guest joining an unknown code is detected client-side by a short timeout (no host presence, no `state` broadcast) rather than an immediate server refusal.
- **Saves**: table `hamnet_worlds` (Postgres, RLS'd to `auth.uid() = owner_id`) — see `src/net/sync.js`. Signed in → reads/writes that table directly via `supabase.from('hamnet_worlds')`; signed out → `localStorage` only, nothing sent anywhere. The table must be created manually in the Supabase SQL editor (see README "Configuration Supabase requise") — it doesn't exist by default on a fresh project.

Where a save lives depends **only** on `netState.user` (signed in or not), not on local/host mode.

Note: this is a full re-architecture from the previous accounts-service/custom-server setup (see git history) — old accounts-service user ids and any world saved through the old `server/` HTTP API don't carry over.

### Tests

- **Unit** (`npm run test`, vitest, `src/tests/`): pure game-logic and `src/net/` modules. `localStorage`/`fetch` aren't available in the `node` test environment — stub them with `vi.stubGlobal(...)` at the top of the file before importing the module under test. `src/net/supabase.js` is mocked with `vi.mock('../net/supabase.js', ...)` rather than stubbing `fetch`, since `@supabase/supabase-js` isn't a thin fetch wrapper (see `src/tests/accounts.test.js`, `sync-storage.test.js`).
- **E2E** (`npm run test:e2e`, Playwright, `e2e/`): drives a real browser against `npm run dev`. **Nothing in `server/` or Supabase actually runs in CI**:
  - `playwright.config.js`'s `webServer.env` forces `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` empty regardless of a local `.env` — the client falls back to the fixed placeholder `https://not-configured.supabase.co` (see `src/net/supabase.js`). Without this override, e2e would silently hit whatever real project the local `.env` points at. Supabase Auth REST calls (`/auth/v1/*`) and PostgREST calls (`/rest/v1/hamnet_worlds*`) are intercepted against that placeholder host with `page.route()` (see `accounts.spec.js`).
  - Realtime (channels/presence/Phoenix wire protocol) is never touched: `src/net/realtime.js` checks `window.__HAMNET_REALTIME_TEST_HOOK__` before calling `supabase.channel(...)`, and e2e specs install a fake hook via `page.addInitScript` instead (see `online-coop.spec.js`, `menus-hints.spec.js`, `clipboard.spec.js`) — the hook is handed the module's internal `dispatch` and stashes it on `window.__dispatch` so a test can later simulate more events (a guest joining, a disconnect) the same way one would drive a mock WebSocket's `onmessage`.
  - Keep it that way — e2e tests must never assume a real backend or Supabase project is reachable.
