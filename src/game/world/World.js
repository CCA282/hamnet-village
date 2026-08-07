import * as C from '../constants/index.js'
import { game } from '../store.js'

import { playerMethods }   from './players.js'
import { menuMethods }     from './menu.js'
import { actionMethods }   from './actions.js'
import { resourceMethods } from './resources.js'
import { cartMethods }     from './carts.js'
import { buildingMethods } from './buildings.js'
import { particleMethods } from './particles.js'
import { natureMethods }   from './nature.js'
import { cameraMethods }   from './camera.js'
import { hintMethods }      from './hints.js'
import { meteoriteMethods } from './meteorites.js'
import { rendererMethods }  from './renderer/index.js'

const TWO_PI = Math.PI * 2

export class World {
  constructor() {
    this._nextId = 1
    this._nextPlayerNum = 1
    this.players = []

    this.trees = C.TREES.map(([x, y]) => ({ x, y, hp: C.TREE_HP, maxHp: C.TREE_HP, regrow: 0, shake: 0 }))
    this.fishSpots = C.FISH_SPOTS_Y.map((y) => ({
      x: C.riverCenterX(y) - C.RIVER.halfWidth - 6, y, cd: 0,
      jumpTimer: 2 + Math.random() * 4, jumping: false, jumpT: 0,
    }))
    this.stoneSpots  = [...C.ROCKS, ...C.STONE_SPOTS].map(([x, y]) => ({ x, y, hp: C.STONE_HP, maxHp: C.STONE_HP, regrow: 0 }))
    this.berryBushes = [...C.BUSHES, ...C.BERRY_SPOTS].map(([x, y]) => ({ x, y, hp: C.BERRY_HP, maxHp: C.BERRY_HP, regrow: 0 }))

    this.grassTufts = this._scatterGrass(120)
    this.flowers = []
    this.deer = []
    this.birdTimer = 6
    this.particles = []

    this.fireflies = Array.from({ length: 24 }, () => ({
      x: 40 + Math.random() * (C.WORLD_W - 200),
      y: 60 + Math.random() * (C.WORLD_H - 160),
      phase: Math.random() * TWO_PI,
      spd: 0.5 + Math.random(),
    }))

    this.meteoriteSpots = []
    this._meteoriteTimer = 0
    this._nextMeteoriteSpawn = 20

    this.prodTimers = { lumberjack: 0, fishinghut: 0, quarry: 0, garden: 0, astronomy: 0 }
    this.buildingInventories = {}
    for (const [id, def] of Object.entries(C.BUILDINGS)) {
      this.buildingInventories[id] = { [def.produces]: 0 }
    }
    this.carts = []
    this.autoTransporters = []

    this.cam = { x: C.VILLAGE.x, y: C.VILLAGE.y, zoom: 1 }
    this.camView = { left: 0, top: 0, zoom: 1 }
    this.canvasW = C.VIEW_W
    this.canvasH = C.VIEW_H

    this.menuNavTimer = 0
    this._lastDt = 0
    this.time = 0
    this._pendingRemoteMenuOpen = null
    this._pendingRemoteMenuClose = null
  }

  setCanvasSize(w, h) { this.canvasW = w; this.canvasH = h }

  // Used by guest mode: only update visuals (camera, particles, nature) — no game logic.
  updateGuestVisuals(dt) {
    this._lastDt = dt
    this.time += dt
    // Smooth player positions between snapshots
    const k = Math.min(1, dt * 22)
    for (const p of this.players) {
      if (p.targetX !== undefined) { p.x += (p.targetX - p.x) * k; p.y += (p.targetY - p.y) * k }
    }
    this.updateNature(dt)
    this.updateDeer(dt)
    this.updateBirds(dt)
    this.updateParticles(dt)
    if (game.villageLevel <= 3) this.emitCampfire(dt)
    this.updateCamera(dt)
  }

  _scatterGrass(n) {
    const out = []
    let tries = 0
    while (out.length < n && tries < n * 8) {
      tries++
      const x = 16 + Math.random() * (C.WORLD_W - 40)
      const y = 24 + Math.random() * (C.WORLD_H - 48)
      if (this._inWater(x, y)) continue
      if (Math.hypot(x - C.VILLAGE.x, y - C.VILLAGE.y) < C.VILLAGE.r) continue
      out.push({ x, y })
    }
    return out
  }

  _inWater(x, y) { return x >= C.riverCenterX(y) - C.RIVER.halfWidth }

  update(dt, input) {
    this._lastDt = dt
    this.time += dt
    game.timeOfDay = (game.timeOfDay + dt / C.DAY_LENGTH) % 1

    this.handleJoins(input)
    this.handleDisconnects(input)

    const speed = C.BASE_SPEED + game.upgrades.speed * C.SPEED_PER_UPGRADE

    for (const p of this.players) {
      p.spawn = Math.max(0, p.spawn - dt)
      const st = this.inputFor(input, p)

      if (p.source === 'remote') {
        if (p.isInMenu) { this.handleMenu(p, st); continue }
        if (p.buildingMenuId !== null) { this.handleBuildingMenu(p, st); continue }
      } else {
        if (game.menuOpen && game.menuOpener === p.id) { this.handleMenu(p, st); continue }
        if (game.buildingMenuOpen && game.buildingMenuOpener === p.id) { this.handleBuildingMenu(p, st); continue }
      }
      if (p.frozen) continue

      let mx = st.mx, my = st.my
      const mag = Math.hypot(mx, my)
      if (mag > 1) { mx /= mag; my /= mag }
      p.moving = mag > 0.05
      if (p.moving) {
        if (mx < -0.1) p.facing = -1
        else if (mx > 0.1) p.facing = 1
        p.walkPhase += dt * 10
        let nx = p.x + mx * speed * dt
        let ny = p.y + my * speed * dt
        nx = Math.max(8, Math.min(C.WORLD_W - 8, nx))
        ny = Math.max(18, Math.min(C.WORLD_H - 10, ny))
        const bank = C.riverCenterX(ny) - C.RIVER.halfWidth - 2
        if (nx > bank) nx = bank
        p.x = nx; p.y = ny
      }

      if (Math.hypot(p.x - C.VILLAGE.x, p.y - C.VILLAGE.y) < C.VILLAGE.r + 8) {
        this.depositPlayerInventory(p)
      }

      p.target = this.computeTarget(p)
      p.harvestCd = Math.max(0, p.harvestCd - dt)

      // Remote players have their own per-player menu state (already checked above);
      // only gate local players on the global game.menuOpen flag.
      const localMenuBlocking = p.source !== 'remote' && game.menuOpen
      if (!localMenuBlocking) {
        if (st.action) {
          this.doAction(p, true)
          // Remote input stays true for the full 33ms packet; consume it so
          // the next host frame doesn't trigger a second action.
          if (p.source === 'remote' && p.remoteInput) p.remoteInput.action = false
        } else if (st.actionHeld && p.harvestCd <= 0) {
          this.doAction(p, false)
        }
      }
    }

    while (this.carts.length < game.upgrades.charrette) this.createCart()

    this.updateHint()
    this.updateMeteorites(dt)
    this.updateCarts(dt)
    this.updateBuildings(dt)
    this.updateBuildingCollection()
    this.updateAutoTransporters(dt)
    this.updateTrees(dt)
    this.updateFish(dt)
    this.updateStone(dt)
    this.updateNature(dt)
    this.updateDeer(dt)
    this.updateBirds(dt)
    this.updateParticles(dt)
    if (game.villageLevel <= 3) this.emitCampfire(dt)
    this.updateCamera(dt)
  }
}

// Compose all modules onto World prototype
Object.assign(
  World.prototype,
  playerMethods,
  menuMethods,
  actionMethods,
  resourceMethods,
  cartMethods,
  buildingMethods,
  particleMethods,
  natureMethods,
  cameraMethods,
  hintMethods,
  meteoriteMethods,
  rendererMethods,
)
