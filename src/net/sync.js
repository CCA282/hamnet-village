import { game } from '../game/store.js'
import { BUILDINGS, BUILD_SPOTS } from '../game/constants/index.js'

const BUILDING_ICON_MAP = { wood: 'icon_wood', fish: 'icon_fish', stone: 'icon_stone', berries: 'icon_berries' }

export function serializeWorld(world, { includeSpotsState = false } = {}) {
  const snap = {
    // Reactive state
    wood: game.wood, fish: game.fish, stone: game.stone, berries: game.berries,
    villageLevel: game.villageLevel,
    totalHarvested: game.totalHarvested,
    timeOfDay: game.timeOfDay,
    buildings: { ...game.buildings },
    upgrades: { ...game.upgrades },
    buildingUpgrades: JSON.parse(JSON.stringify(game.buildingUpgrades)),

    // World non-reactive
    players: world.players.map((p) => ({
      id: p.id, label: p.label, color: p.color,
      x: p.x, y: p.y, facing: p.facing,
      walkPhase: p.walkPhase, moving: p.moving, spawn: p.spawn,
      harvestCd: p.harvestCd,
      inventory: { ...p.inventory },
      hint: p.hint ?? '',
      source: p.source === 'remote' ? 'remote' : p.source,
      remoteGuestId: p.remoteGuestId ?? null,
      targetHalo: p.target
        ? { kind: p.target.kind, haloX: p.target.haloX, haloY: p.target.haloY, ok: p.target.ok }
        : null,
    })),

    carts: world.carts.map((c) => ({
      id: c.id, x: c.x, y: c.y, following: c.following,
      inventory: { ...c.inventory },
    })),

    buildingInventories: JSON.parse(JSON.stringify(world.buildingInventories)),
    prodTimers: { ...world.prodTimers },

    autoTransporters: world.autoTransporters.map((at) => ({
      buildingId: at.buildingId, state: at.state,
      x: at.x, y: at.y, facing: at.facing,
      inventory: { ...at.inventory },
      loadTimer: at.loadTimer, stateTimer: at.stateTimer,
    })),

    _nextId: world._nextId,
    devMode: game.devMode,
  }

  if (includeSpotsState) {
    snap.trees = world.trees.map((t) => ({ hp: t.hp, maxHp: t.maxHp, regrow: t.regrow, shake: t.shake }))
    snap.stoneSpots = world.stoneSpots.map((s) => ({ hp: s.hp, maxHp: s.maxHp, regrow: s.regrow }))
    snap.berryBushes = world.berryBushes.map((b) => ({ hp: b.hp, maxHp: b.maxHp, regrow: b.regrow }))
    snap.fishSpots = world.fishSpots.map((f) => ({ cd: f.cd }))
  }

  return snap
}

export function applyWorldState(world, snap) {
  // Reactive state
  if (snap.wood !== undefined) game.wood = snap.wood
  if (snap.fish !== undefined) game.fish = snap.fish
  if (snap.stone !== undefined) game.stone = snap.stone
  if (snap.berries !== undefined) game.berries = snap.berries
  if (snap.villageLevel !== undefined) game.villageLevel = snap.villageLevel
  if (snap.totalHarvested !== undefined) game.totalHarvested = snap.totalHarvested
  if (snap.timeOfDay !== undefined) game.timeOfDay = snap.timeOfDay
  if (snap.buildings) Object.assign(game.buildings, snap.buildings)
  if (snap.upgrades) Object.assign(game.upgrades, snap.upgrades)
  if (snap.buildingUpgrades) {
    for (const [k, v] of Object.entries(snap.buildingUpgrades)) {
      if (game.buildingUpgrades[k]) Object.assign(game.buildingUpgrades[k], v)
    }
  }

  // Players
  if (snap.players) {
    const ids = new Set(snap.players.map((p) => p.id))
    world.players = world.players.filter((p) => ids.has(p.id))
    for (const sp of snap.players) {
      let p = world.players.find((p) => p.id === sp.id)
      if (!p) {
        // New player: snap immediately, init lerp targets
        p = { ...sp, targetX: sp.x, targetY: sp.y, target: sp.targetHalo ?? null, remoteInput: null }
        world.players.push(p)
      } else {
        // Existing player: update everything except x/y (those lerp in updateGuestVisuals)
        const { x, y, targetHalo, ...rest } = sp
        Object.assign(p, rest)
        p.targetX = x
        p.targetY = y
        p.target = targetHalo ?? null
      }
    }
    world._nextId = snap._nextId ?? world._nextId
    world.syncPlayers()
  }

  // Carts
  if (snap.carts) {
    const ids = new Set(snap.carts.map((c) => c.id))
    world.carts = world.carts.filter((c) => ids.has(c.id))
    for (const sc of snap.carts) {
      let c = world.carts.find((c) => c.id === sc.id)
      if (!c) { world.carts.push({ ...sc }) } else { Object.assign(c, sc) }
    }
  }

  if (snap.devMode !== undefined) game.devMode = snap.devMode

  if (snap.buildingInventories) {
    for (const [id, newInv] of Object.entries(snap.buildingInventories)) {
      const def = BUILDINGS[id]
      if (def) {
        const res = def.produces
        const oldAmt = (world.buildingInventories[id] || {})[res] || 0
        const newAmt = newInv[res] || 0
        const spot = BUILD_SPOTS.find((s) => s.building === id)
        if (spot && newAmt > oldAmt) {
          world.spawnIcon(BUILDING_ICON_MAP[res], spot.x, spot.y - 18)
        } else if (spot && newAmt < oldAmt) {
          world.spawnIcon(BUILDING_ICON_MAP[res], spot.x + (Math.random() - 0.5) * 8, spot.y - 14)
        }
      }
    }
    Object.assign(world.buildingInventories, snap.buildingInventories)
  }
  if (snap.prodTimers) Object.assign(world.prodTimers, snap.prodTimers)
  if (snap.autoTransporters) {
    world.autoTransporters = snap.autoTransporters.map((at) => ({ ...at }))
  }

  // Resource spots — apply HP and spawn local particles when HP drops
  if (snap.trees) {
    snap.trees.forEach((t, i) => {
      const tree = world.trees[i]
      if (!tree) return
      const prevHp = tree.hp
      Object.assign(tree, t)
      if (t.hp < prevHp && prevHp > 0) {
        world.spawnIcon('icon_wood', tree.x + 4, tree.y - 20)
        world.spawnLeaves(tree.x, tree.y - 16, t.hp > 0 ? 3 : 6)
      }
    })
  }
  if (snap.stoneSpots) {
    snap.stoneSpots.forEach((s, i) => {
      const rock = world.stoneSpots[i]
      if (!rock) return
      const prevHp = rock.hp
      Object.assign(rock, s)
      if (s.hp < prevHp && prevHp > 0) world.spawnIcon('icon_stone', rock.x + 2, rock.y - 10)
    })
  }
  if (snap.berryBushes) {
    snap.berryBushes.forEach((b, i) => {
      const bush = world.berryBushes[i]
      if (!bush) return
      const prevHp = bush.hp
      Object.assign(bush, b)
      if (b.hp < prevHp && prevHp > 0) world.spawnIcon('icon_berries', bush.x, bush.y - 10)
    })
  }
  if (snap.fishSpots) snap.fishSpots.forEach((f, i) => { if (world.fishSpots[i]) Object.assign(world.fishSpots[i], f) })
}

// ── Local save (localStorage) ─────────────────────────────────────────────────

const LS_INDEX = 'hamnet_saves'

function lsIndex() {
  try { return JSON.parse(localStorage.getItem(LS_INDEX) || '[]') } catch { return [] }
}
function lsSave(index) { localStorage.setItem(LS_INDEX, JSON.stringify(index)) }

export function listLocalSaves() {
  return lsIndex().map(({ id, name, savedAt }) => ({ id, name, savedAt }))
}

export function saveLocal(world, id, name) {
  const data = serializeWorld(world, { includeSpotsState: true })
  data.name = name
  data.savedAt = new Date().toISOString()
  data.id = id
  localStorage.setItem('hamnet_world_' + id, JSON.stringify(data))
  const idx = lsIndex().filter((e) => e.id !== id)
  idx.unshift({ id, name, savedAt: data.savedAt })
  lsSave(idx)
  return id
}

export function loadLocal(id) {
  try { return JSON.parse(localStorage.getItem('hamnet_world_' + id)) } catch { return null }
}

// ── Server save (HTTP) ────────────────────────────────────────────────────────

export async function listServerSaves() {
  const r = await fetch('/api/worlds')
  return r.ok ? r.json() : []
}

export async function saveServer(world, id, name) {
  const data = serializeWorld(world, { includeSpotsState: true })
  data.name = name
  data.id = id || undefined
  const r = await fetch('/api/worlds', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (r.ok) { const { id: newId } = await r.json(); return newId }
  return null
}

export async function loadServer(id) {
  const r = await fetch(`/api/worlds/${id}`)
  return r.ok ? r.json() : null
}
