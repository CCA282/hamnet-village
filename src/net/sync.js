import { game } from '../game/store.js'
import { BUILDINGS, BUILD_SPOTS, VILLAGE } from '../game/constants/index.js'
import { supabase } from './supabase.js'

const RESOURCES = ['wood', 'fish', 'stone', 'berries', 'meteorite']

const BUILDING_ICON_MAP = { wood: 'icon_wood', fish: 'icon_fish', stone: 'icon_stone', berries: 'icon_berries' }

export function serializeWorld(world, { includeSpotsState = false } = {}) {
  const snap = {
    // Reactive state
    wood: game.wood, fish: game.fish, stone: game.stone, berries: game.berries, meteorite: game.meteorite,
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

    meteoriteSpots: world.meteoriteSpots.map((m) => ({ id: m.id, x: m.x, y: m.y, hp: m.hp, maxHp: m.maxHp, impactT: m.impactT })),
    _meteoriteTimer: world._meteoriteTimer,
    _nextMeteoriteSpawn: world._nextMeteoriteSpawn,

    _nextId: world._nextId,
    devMode: game.devMode,
    lastProduced: world._lastProduced ? [...world._lastProduced] : [],

    noisetierStage: game.noisetierStage,
    noisetierWatered: game.noisetierWatered,
    squirrelPetted: game.squirrelPetted,
  }

  if (includeSpotsState) {
    snap.trees = world.trees.map((t) => ({ hp: t.hp, maxHp: t.maxHp, regrow: t.regrow, shake: t.shake }))
    snap.stoneSpots = world.stoneSpots.map((s) => ({ hp: s.hp, maxHp: s.maxHp, regrow: s.regrow }))
    snap.berryBushes = world.berryBushes.map((b) => ({ hp: b.hp, maxHp: b.maxHp, regrow: b.regrow }))
    snap.fishSpots = world.fishSpots.map((f) => ({ cd: f.cd }))
  }

  return snap
}

export function applyWorldState(world, snap, { dropPlayers = false } = {}) {
  // Reactive state
  if (snap.wood !== undefined) game.wood = snap.wood
  if (snap.fish !== undefined) game.fish = snap.fish
  if (snap.stone !== undefined) game.stone = snap.stone
  if (snap.berries !== undefined) game.berries = snap.berries
  if (snap.meteorite !== undefined) game.meteorite = snap.meteorite
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
  if (dropPlayers) {
    // Loading a save starts with nobody on screen — same as a brand new game.
    // Pressing a join input spawns a fresh player (World.handleJoins/addPlayer),
    // not a restored one; saved player stats/positions aren't reused.
    world.players = []
    world.syncPlayers()
  } else if (snap.players) {
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
        const prevInv = { ...p.inventory }
        Object.assign(p, rest)
        p.targetX = x
        p.targetY = y
        p.target = targetHalo ?? null
        // Spawn deposit particles when player inventory decreases (deposited at village)
        for (const res of RESOURCES) {
          if ((prevInv[res] || 0) > (p.inventory[res] || 0)) {
            world.spawnIcon(`icon_${res}`, sp.x + (Math.random() - 0.5) * 10, sp.y - 16)
          }
        }
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
      const c = world.carts.find((c) => c.id === sc.id)
      if (!c) {
        world.carts.push({ ...sc })
      } else {
        const prevInv = { ...c.inventory }
        Object.assign(c, sc)
        // Spawn deposit particles when cart inventory decreases (deposited at village)
        for (const res of RESOURCES) {
          if ((prevInv[res] || 0) > (c.inventory[res] || 0)) {
            world.spawnIcon(`icon_${res}`, VILLAGE.x + (Math.random() - 0.5) * 20, VILLAGE.y - 22)
          }
        }
      }
    }
  }

  if (snap.meteoriteSpots) world.meteoriteSpots = snap.meteoriteSpots.map((m) => ({ ...m }))
  if (snap._meteoriteTimer !== undefined) world._meteoriteTimer = snap._meteoriteTimer
  if (snap._nextMeteoriteSpawn !== undefined) world._nextMeteoriteSpawn = snap._nextMeteoriteSpawn

  if (snap.devMode !== undefined) game.devMode = snap.devMode
  if (snap.noisetierStage !== undefined) game.noisetierStage = snap.noisetierStage
  if (snap.noisetierWatered !== undefined) game.noisetierWatered = snap.noisetierWatered
  if (snap.squirrelPetted !== undefined) game.squirrelPetted = snap.squirrelPetted

  // Production icons: use lastProduced events so the icon fires even when the
  // auto-transporter picks up in the same frame (net inventory delta = 0).
  if (snap.lastProduced?.length) {
    for (const id of snap.lastProduced) {
      const def = BUILDINGS[id]
      const spot = BUILD_SPOTS.find((s) => s.building === id)
      if (def && spot && BUILDING_ICON_MAP[def.produces]) {
        world.spawnIcon(BUILDING_ICON_MAP[def.produces], spot.x, spot.y - 18)
      }
    }
  }

  if (snap.buildingInventories) {
    for (const [id, newInv] of Object.entries(snap.buildingInventories)) {
      const def = BUILDINGS[id]
      if (def) {
        const res = def.produces
        const oldAmt = (world.buildingInventories[id] || {})[res] || 0
        const newAmt = newInv[res] || 0
        const spot = BUILD_SPOTS.find((s) => s.building === id)
        // Spawn pickup icon when inventory decreases (player/transporter collected)
        if (spot && newAmt < oldAmt) {
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

export function deleteLocal(id) {
  localStorage.removeItem('hamnet_world_' + id)
  lsSave(lsIndex().filter((e) => e.id !== id))
}

// ── Server save (Supabase Postgres, table `hamnet_worlds`, RLS'd to auth.uid()) ────

export async function listServerSaves() {
  const { data, error } = await supabase
    .from('hamnet_worlds')
    .select('id, name, saved_at')
    .order('saved_at', { ascending: false })
  if (error) return []
  return data.map((w) => ({ id: w.id, name: w.name, savedAt: w.saved_at }))
}

export async function saveServer(world, id, name) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const snap = serializeWorld(world, { includeSpotsState: true })
  const row = { owner_id: user.id, name, data: snap }
  if (id) row.id = id
  const { data, error } = await supabase.from('hamnet_worlds').upsert(row).select('id').single()
  return error ? null : data.id
}

export async function loadServer(id) {
  const { data, error } = await supabase
    .from('hamnet_worlds')
    .select('name, data, saved_at')
    .eq('id', id)
    .maybeSingle()
  if (error || !data) return null
  return { ...data.data, name: data.name, id, savedAt: data.saved_at }
}

export async function deleteServer(id) {
  const { error } = await supabase.from('hamnet_worlds').delete().eq('id', id)
  return !error
}
