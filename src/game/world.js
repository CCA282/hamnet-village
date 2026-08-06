// ============================================================================
// Le monde : entités (joueurs, arbres, bâtiments, faune, déco), mise à jour
// de la logique et rendu sur le canvas logique. Non réactif (perf par frame).
// ============================================================================
import * as C from './constants.js'
import { sprite, characterSprite, shadowSprite } from './sprites.js'
import {
  game, harvest, build, canBuild, buyUpgrade, menuEntries, effectiveInterval, globalCap,
} from './store.js'

function effectiveHarvestCd() {
  return C.HARVEST_COOLDOWN * Math.pow(0.8, game.upgrades.harvest_speed)
}

const TWO_PI = Math.PI * 2
const clamp01 = (v) => Math.max(0, Math.min(1, v))
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by)

export class World {
  constructor() {
    let id = 1
    this.players = []
    this._nextId = 1

    // Arbres (baseline = pied du tronc)
    this.trees = C.TREES.map(([x, y]) => ({ x, y, hp: C.TREE_HP, maxHp: C.TREE_HP, regrow: 0, shake: 0 }))

    // Spots de pêche le long de la berge
    this.fishSpots = C.FISH_SPOTS_Y.map((y) => ({
      x: C.riverCenterX(y) - C.RIVER.halfWidth - 6, y, cd: 0,
      jumpTimer: 2 + Math.random() * 4,  // délai avant le prochain saut de poisson
      jumping: false, jumpT: 0,           // état de l'animation de saut
    }))

    // Toutes les roches sont récoltables (déco statique + spots dédiés)
    this.stoneSpots = [...C.ROCKS, ...C.STONE_SPOTS].map(([x, y]) => ({ x, y, hp: C.STONE_HP, maxHp: C.STONE_HP, regrow: 0 }))

    // Tous les buissons sont récoltables (déco statique + spots dédiés)
    this.berryBushes = [...C.BUSHES, ...C.BERRY_SPOTS].map(([x, y]) => ({ x, y, hp: C.BERRY_HP, maxHp: C.BERRY_HP, regrow: 0 }))
    this.grassTufts = this._scatterGrass(120)
    this.flowers = []       // grandissent avec la récolte (la nature s'épanouit)

    // Faune
    this.deer = []
    this.birdTimer = 6

    // Particules (icônes de récolte, feuilles, éclaboussures, étincelles...)
    this.particles = []

    // Lucioles (nuit) réparties sur le monde
    this.fireflies = Array.from({ length: 24 }, () => ({
      x: 40 + Math.random() * (C.WORLD_W - 200),
      y: 60 + Math.random() * (C.WORLD_H - 160),
      phase: Math.random() * TWO_PI,
      spd: 0.5 + Math.random(),
    }))

    // Timers de production des bâtiments
    this.prodTimers = { lumberjack: 0, fishinghut: 0, quarry: 0, garden: 0 }

    // Charrettes (une par upgrade acheté)
    this.carts = []

    // Caméra dynamique (cadre l'ensemble des joueurs)
    this.cam = { x: C.VILLAGE.x, y: C.VILLAGE.y, zoom: 1 }
    this.camView = { left: 0, top: 0, zoom: 1 }

    // Dimensions physiques réelles du canvas (mises à jour par engine._resize)
    this.canvasW = C.VIEW_W
    this.canvasH = C.VIEW_H

    // Timer pour éviter le scroll trop rapide du joystick dans le menu
    this.menuNavTimer = 0
    this._lastDt = 0

    this.time = 0
    this._id = id
  }

  // Appelé par le moteur à chaque resize (canvas physique)
  setCanvasSize(w, h) { this.canvasW = w; this.canvasH = h }

  _scatterGrass(n) {
    const out = []
    let tries = 0
    while (out.length < n && tries < n * 8) {
      tries++
      const x = 16 + Math.random() * (C.WORLD_W - 40)
      const y = 24 + Math.random() * (C.WORLD_H - 48)
      if (this._inWater(x, y)) continue
      if (dist(x, y, C.VILLAGE.x, C.VILLAGE.y) < C.VILLAGE.r) continue
      out.push({ x, y })
    }
    return out
  }

  _inWater(x, y) {
    return x >= C.riverCenterX(y) - C.RIVER.halfWidth
  }

  // ---------------------------------------------------------------- JOUEURS --
  syncPlayers() {
    game.players = this.players.map((p) => ({ id: p.id, label: p.label, color: p.color }))
  }

  addPlayer(source, gamepadIndex = null) {
    if (this.players.length >= C.MAX_PLAYERS) return
    const idx = this.players.length
    const color = C.PLAYER_COLORS[idx % C.PLAYER_COLORS.length]
    const angle = (idx / C.MAX_PLAYERS) * TWO_PI
    const p = {
      id: this._nextId++,
      source, gamepadIndex, color,
      label: 'P' + (idx + 1),
      x: C.VILLAGE.x + Math.cos(angle) * 22,
      y: C.VILLAGE.y + C.VILLAGE.r + 10 + Math.sin(angle) * 6,
      facing: 1, walkPhase: 0, moving: false, frozen: false,
      spawn: 0.5, target: null, harvestCd: 0,
      inventory: { wood: 0, fish: 0, stone: 0, berries: 0 },
    }
    this.players.push(p)
    this.spawnPoof(p.x, p.y)
    this.syncPlayers()
    return p
  }

  removePlayer(p) {
    const i = this.players.indexOf(p)
    if (i >= 0) this.players.splice(i, 1)
    if (game.menuOpener === p.id) this.closeMenu()
    this.players.forEach((pl, k) => (pl.label = 'P' + (k + 1)))
    this.syncPlayers()
  }

  findPlayer(pred) { return this.players.find(pred) }

  // ------------------------------------------------------------------ MENU --
  openMenu(p) {
    game.menuOpen = true
    game.menuOpener = p.id
    game.menuIndex = 0
    game.menuTab = 0
    p.frozen = true
  }
  closeMenu() {
    game.menuOpen = false
    const op = this.findPlayer((x) => x.id === game.menuOpener)
    if (op) op.frozen = false
    game.menuOpener = null
  }

  // ------------------------------------------------------------- MISE À JOUR --
  update(dt, input) {
    this._lastDt = dt
    this.time += dt
    // Cycle jour/nuit
    game.timeOfDay = (game.timeOfDay + dt / C.DAY_LENGTH) % 1

    this.handleJoins(input)
    this.handleDisconnects(input)

    const speed = C.BASE_SPEED + game.upgrades.speed * C.SPEED_PER_UPGRADE

    for (const p of this.players) {
      p.spawn = Math.max(0, p.spawn - dt)
      const st = this.inputFor(input, p)

      if (game.menuOpen && game.menuOpener === p.id) {
        this.handleMenu(p, st)
        continue
      }
      if (p.frozen) continue

      // Déplacement
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
        // Blocage à la berge (on ne marche pas dans l'eau)
        const bank = C.riverCenterX(ny) - C.RIVER.halfWidth - 2
        if (nx > bank) nx = bank
        p.x = nx; p.y = ny
      }

      // Dépôt automatique si le joueur passe dans le rayon du village
      if (dist(p.x, p.y, C.VILLAGE.x, C.VILLAGE.y) < C.VILLAGE.r + 8) {
        this.depositPlayerInventory(p)
      }

      // Cible contextuelle (pour l'action + le petit repère)
      p.target = this.computeTarget(p)

      // Cooldown de récolte (indépendant du mouvement)
      p.harvestCd = Math.max(0, p.harvestCd - dt)

      if (!game.menuOpen) {
        if (st.action) {
          // Front d'appui → toutes actions (menu, build, récolte immédiate)
          this.doAction(p, true)
        } else if (st.actionHeld && p.harvestCd <= 0) {
          // Maintenu + cooldown écoulé → récolte automatique seulement
          this.doAction(p, false)
        }
      }
    }

    // Création des charrettes selon le nombre acheté
    while (this.carts.length < game.upgrades.charrette) this.createCart()

    this.updateHint()
    this.updateCarts(dt)
    this.updateBuildings(dt)
    this.updateTrees(dt)
    this.updateFish(dt)
    this.updateStone(dt)
    this.updateNature(dt)
    this.updateDeer(dt)
    this.updateBirds(dt)
    this.updateParticles(dt)
    this.emitCampfire(dt)
    this.updateCamera(dt)
  }

  // La caméra cadre tous les joueurs ; plus ils s'éloignent, plus elle dézoome
  // (jusqu'à ZOOM_MIN) -> incite à rester groupés. Mouvement lissé.
  updateCamera(dt) {
    let tx, ty, tz
    if (this.players.length === 0) {
      tx = C.VILLAGE.x; ty = C.VILLAGE.y; tz = 1
    } else {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const p of this.players) {
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
      }
      tx = (minX + maxX) / 2; ty = (minY + maxY) / 2
      const spanX = (maxX - minX) + 2 * C.CAM_MARGIN
      const spanY = (maxY - minY) + 2 * C.CAM_MARGIN
      tz = Math.min(C.VIEW_W / spanX, C.VIEW_H / spanY)
      tz = Math.max(C.ZOOM_MIN, Math.min(C.ZOOM_MAX, tz))
    }
    const k = Math.min(1, dt * C.CAM_LERP)
    this.cam.zoom += (tz - this.cam.zoom) * k
    this.cam.x += (tx - this.cam.x) * k
    this.cam.y += (ty - this.cam.y) * k
    // Garde la vue à l'intérieur du monde
    const z = this.cam.zoom
    const hw = C.VIEW_W / (2 * z), hh = C.VIEW_H / (2 * z)
    this.cam.x = Math.max(hw, Math.min(C.WORLD_W - hw, this.cam.x))
    this.cam.y = Math.max(hh, Math.min(C.WORLD_H - hh, this.cam.y))
    this.camView = { left: this.cam.x - hw, top: this.cam.y - hh, zoom: z }
  }

  inputFor(input, p) {
    if (p.source === 'pad') {
      return input.padState(p.gamepadIndex)
    }
    if (p.source === 'touch') {
      return input.touchState()
    }
    const s = input.keyboardState(p.source)
    // Clavier 1 : clic souris = action (one-shot) / maintien souris = actionHeld
    if (p.source === 'kb1') {
      if (input.mouseAction) s.action = true
      if (input.mouseHeld) s.actionHeld = true
    }
    // Nav menu : fronts directionnels
    s.up = input.keyPressed(KB(p.source).up)
    s.down = input.keyPressed(KB(p.source).down)
    s.left = input.keyPressed(KB(p.source).left)
    s.right = input.keyPressed(KB(p.source).right)
    return s
  }

  handleJoins(input) {
    // Tactile (mobile) : rejoint dès qu'on touche le joystick ou le bouton
    if (!this.findPlayer((p) => p.source === 'touch')) {
      if (input.touchEngaged()) this.addPlayer('touch')
    }
    // Clavier 1
    if (!this.findPlayer((p) => p.source === 'kb1')) {
      const s = input.keyboardState('kb1')
      if (s.action || input.mouseAction) this.addPlayer('kb1')
    }
    // Clavier 2
    if (!this.findPlayer((p) => p.source === 'kb2')) {
      const s = input.keyboardState('kb2')
      if (s.action) this.addPlayer('kb2')
    }
    // Manettes
    for (const idx of input.padList()) {
      if (this.findPlayer((p) => p.source === 'pad' && p.gamepadIndex === idx)) continue
      if (input.padAnyPressed(idx)) this.addPlayer('pad', idx)
    }
  }

  handleDisconnects(input) {
    const connected = new Set(input.padList())
    for (const p of [...this.players]) {
      if (p.source === 'pad' && !connected.has(p.gamepadIndex)) {
        for (const c of this.carts) if (c.following === p.id) c.following = null
        this.removePlayer(p)
      }
    }
  }

  handleMenu(p, st) {
    const entries = menuEntries()

    const TAB_COUNT = 4
    const switchTab = (dir) => {
      game.menuTab = (game.menuTab + dir + TAB_COUNT) % TAB_COUNT
      game.menuIndex = 0
    }
    const buySelected = () => {
      const key = menuEntries()[game.menuIndex]
      buyUpgrade(key)
      const n = menuEntries().length
      if (game.menuIndex >= n) game.menuIndex = Math.max(0, n - 1)
    }

    if (p.source === 'touch') {
      this.menuNavTimer = Math.max(0, this.menuNavTimer - this._lastDt)
      if (st.mx < -0.45 && this.menuNavTimer <= 0) { switchTab(-1); this.menuNavTimer = 0.3 }
      else if (st.mx > 0.45 && this.menuNavTimer <= 0) { switchTab(1); this.menuNavTimer = 0.3 }
      else if (st.my < -0.45 && this.menuNavTimer <= 0) {
        game.menuIndex = (game.menuIndex - 1 + entries.length) % entries.length
        this.menuNavTimer = 0.28
      } else if (st.my > 0.45 && this.menuNavTimer <= 0) {
        game.menuIndex = (game.menuIndex + 1) % entries.length
        this.menuNavTimer = 0.28
      }
      if (st.action) buySelected()
      return
    }

    if (p.source === 'kb1' || p.source === 'kb2') {
      if (st.left) switchTab(-1)
      if (st.right) switchTab(1)
      if (st.up) game.menuIndex = (game.menuIndex - 1 + entries.length) % entries.length
      if (st.down) game.menuIndex = (game.menuIndex + 1) % entries.length
      if (st.action) buySelected()
      if (st.cancel) this.closeMenu()
      return
    }

    // Manette
    this.menuNavTimer = Math.max(0, this.menuNavTimer - this._lastDt)
    const navLeft = st.mx < -0.4
    const navRight = st.mx > 0.4
    const navUp = st.my < -0.4 || st.up
    const navDown = st.my > 0.4 || st.down
    if (navLeft && this.menuNavTimer <= 0) { switchTab(-1); this.menuNavTimer = 0.3 }
    else if (navRight && this.menuNavTimer <= 0) { switchTab(1); this.menuNavTimer = 0.3 }
    else if (navUp && this.menuNavTimer <= 0) {
      game.menuIndex = (game.menuIndex - 1 + entries.length) % entries.length
      this.menuNavTimer = 0.26
    } else if (navDown && this.menuNavTimer <= 0) {
      game.menuIndex = (game.menuIndex + 1) % entries.length
      this.menuNavTimer = 0.26
    }
    if (st.action) buySelected()
    if (st.cancel) this.closeMenu()
  }

  // ----------------------------------------------------------- CHARRETTES -----
  createCart() {
    const idx = this.carts.length
    this.carts.push({
      x: C.VILLAGE.x - 58 + idx * 18,
      y: C.VILLAGE.y + 22 + idx * 6,
      inventory: { wood: 0, fish: 0, stone: 0, berries: 0 },
      following: null,
    })
  }

  updateCarts(dt) {
    const iconMap = { wood: 'icon_wood', fish: 'icon_fish', stone: 'icon_stone', berries: 'icon_berries' }
    for (const cart of this.carts) {
      if (cart.following !== null) {
        const carrier = this.players.find((pl) => pl.id === cart.following)
        if (!carrier) { cart.following = null }
        else {
          const targetDist = carrier.moving ? 18 : 10
          const dx = cart.x - carrier.x, dy = cart.y - carrier.y
          const d = Math.hypot(dx, dy)
          if (d > 0) {
            const tx = carrier.x + (dx / d) * targetDist
            const ty = carrier.y + (dy / d) * targetDist
            const spd = Math.min(1, dt * (carrier.moving ? 9 : 5))
            cart.x += (tx - cart.x) * spd
            cart.y += (ty - cart.y) * spd
          }
        }
      }

      // Auto-transfer : les joueurs proches de cette charrette y déposent leur inventaire
      for (const pl of this.players) {
        const pd = dist(pl.x, pl.y, cart.x, cart.y)
        if (pd < C.INTERACT_RANGE + 2) {
          for (const res of ['wood', 'fish', 'stone', 'berries']) {
            const qty = pl.inventory[res] || 0
            if (qty > 0) {
              cart.inventory[res] = (cart.inventory[res] || 0) + qty
              pl.inventory[res] = 0
              this.spawnIcon(iconMap[res], cart.x + (Math.random() - 0.5) * 8, cart.y - 8)
            }
          }
        }
      }

      // Proximité du village → dépôt automatique dans le stock global
      const d = dist(cart.x, cart.y, C.VILLAGE.x, C.VILLAGE.y)
      if (d < C.CART_DEPOSIT_RANGE) {
        for (const res of ['wood', 'fish', 'stone', 'berries']) {
          const qty = cart.inventory[res] || 0
          if (qty > 0) {
            const added = harvest(res, qty)
            cart.inventory[res] = qty - added
            if (added > 0) this.spawnIcon(iconMap[res], C.VILLAGE.x + (Math.random() - 0.5) * 20, C.VILLAGE.y - 22)
          }
        }
      }
    }
  }

  // Dépôt de l'inventaire du joueur dans le stock global (passage au village)
  depositPlayerInventory(p) {
    const iconMap = { wood: 'icon_wood', fish: 'icon_fish', stone: 'icon_stone', berries: 'icon_berries' }
    for (const res of ['wood', 'fish', 'stone', 'berries']) {
      const qty = p.inventory[res] || 0
      if (qty > 0) {
        const added = harvest(res, qty)
        p.inventory[res] = qty - added
        if (added > 0) this.spawnIcon(iconMap[res], p.x + (Math.random() - 0.5) * 10, p.y - 16)
      }
    }
  }

  // Récolte dans l'inventaire personnel du joueur (pas dans le stock global)
  harvestToPlayer(p, res, amount) {
    const total = Object.values(p.inventory).reduce((a, b) => a + b, 0)
    if (total >= C.PLAYER_INVENTORY_MAX) return false
    p.inventory[res] = (p.inventory[res] || 0) + amount
    game.totalHarvested += amount
    return true
  }

  // Quelle interaction est disponible autour de p ?
  computeTarget(p) {
    if (dist(p.x, p.y, C.VILLAGE.x, C.VILLAGE.y) < C.VILLAGE.r + 4) {
      return { kind: 'menu', x: C.VILLAGE.x, y: C.VILLAGE.y - 30, ok: true }
    }
    for (const spot of C.BUILD_SPOTS) {
      const def = C.BUILDINGS[spot.building]
      if (game.buildings[spot.building] > 0) continue
      if (game.villageLevel < def.requiresLevel) continue
      if (dist(p.x, p.y, spot.x, spot.y) < C.INTERACT_RANGE + 4) {
        return { kind: 'build', spot, x: spot.x, y: spot.y - 20, ok: canBuild(spot.building) }
      }
    }

    // Charrette conduite par ce joueur → seule interaction possible (lâcher)
    const drivingCart = this.carts.find((c) => c.following === p.id)
    if (drivingCart) {
      const d = dist(p.x, p.y, drivingCart.x, drivingCart.y)
      if (d < C.INTERACT_RANGE) {
        return { kind: 'cart', cart: drivingCart, x: drivingCart.x, y: drivingCart.y - 14, ok: true }
      }
      return null  // conduit mais pas encore à portée → pas d'autre interaction
    }

    // Entité récoltable la plus proche (ok=false si outil manquant)
    let best = null, bestD = C.INTERACT_RANGE
    for (const t of this.trees) {
      if (t.hp <= 0) continue
      const d = dist(p.x, p.y, t.x, t.y)
      if (d < bestD) { bestD = d; best = { kind: 'chop', tree: t, x: t.x, y: t.y - 22, ok: game.upgrades.hache > 0 } }
    }
    for (const f of this.fishSpots) {
      if (f.cd > 0) continue
      const d = dist(p.x, p.y, f.x, f.y)
      if (d < bestD) { bestD = d; best = { kind: 'fish', spot: f, x: f.x, y: f.y - 10, ok: game.upgrades.fishing_rod > 0 } }
    }
    for (const s of this.stoneSpots) {
      if (s.hp <= 0) continue
      const d = dist(p.x, p.y, s.x, s.y)
      if (d < bestD) { bestD = d; best = { kind: 'mine', rock: s, x: s.x, y: s.y - 12, ok: game.upgrades.pioche > 0 } }
    }
    for (const b of this.berryBushes) {
      if (b.hp <= 0) continue
      const d = dist(p.x, p.y, b.x, b.y)
      if (d < bestD) { bestD = d; best = { kind: 'pick', bush: b, x: b.x, y: b.y - 12, ok: game.upgrades.faucille > 0 } }
    }

    // Charrettes posées (pas de porteur → n'importe qui peut prendre)
    for (const cart of this.carts) {
      if (cart.following !== null) continue
      const d = dist(p.x, p.y, cart.x, cart.y)
      if (d < bestD && d < C.INTERACT_RANGE) {
        best = { kind: 'cart', cart, x: cart.x, y: cart.y - 14, ok: true }
        bestD = d
      }
    }

    // Inventaire plein → bloquer la récolte (mais pas la charrette)
    if (best && ['chop', 'fish', 'mine', 'pick'].includes(best.kind)) {
      const invTotal = Object.values(p.inventory).reduce((a, b) => a + b, 0)
      if (invTotal >= C.PLAYER_INVENTORY_MAX) {
        best.inventoryFull = true
        best.ok = false
      }
    }

    return best
  }

  // isInitial = true  → front d'appui : menu, build et récolte immédiate autorisés
  // isInitial = false → bouton/touche maintenu : récolte seulement, avec cooldown
  doAction(p, isInitial) {
    const t = p.target
    if (!t) return

    // Actions ponctuelles (uniquement sur front d'appui)
    if (t.kind === 'menu') { if (isInitial) this.openMenu(p); return }
    if (t.kind === 'build') {
      if (isInitial && build(t.spot.building)) {
        this.spawnPoof(t.spot.x, t.spot.y)
        this.spawnLeaves(t.spot.x, t.spot.y - 8, 6)
      }
      return
    }
    if (t.kind === 'cart') {
      if (!isInitial) return
      const cart = t.cart
      if (!cart) return
      if (cart.following === p.id) {
        cart.following = null   // lâche la charrette (l'auto-transfer gère le dépôt)
        this.spawnPoof(cart.x, cart.y)
      } else if (cart.following === null) {
        cart.following = p.id   // prend la charrette
        this.spawnPoof(cart.x, cart.y)
      }
      return
    }

    // Cooldown identique clic ou maintien : pas de bypass sur front d'appui
    if (p.harvestCd > 0) return

    if (t.kind === 'chop') {
      if (!t.ok) return
      const tree = t.tree
      if (tree.hp <= 0) return
      tree.hp--
      tree.shake = 0.25
      if (!this.harvestToPlayer(p, 'wood', 1)) return
      p.harvestCd = effectiveHarvestCd()
      this.spawnIcon('icon_wood', tree.x + 4, tree.y - 20)
      this.spawnLeaves(tree.x, tree.y - 16, 3)
      if (tree.hp <= 0) tree.regrow = C.TREE_REGROW
      return
    }
    if (t.kind === 'fish') {
      if (!t.ok) return
      const f = t.spot
      if (f.cd > 0) return
      f.cd = C.FISH_COOLDOWN
      if (!this.harvestToPlayer(p, 'fish', 1 + game.upgrades.harvest_yield)) { f.cd = 0; return }
      p.harvestCd = effectiveHarvestCd()
      this.spawnIcon('icon_fish', f.x, f.y - 6)
      this.spawnRipple(f.x, f.y)
      return
    }
    if (t.kind === 'mine') {
      if (!t.ok) return
      const r = t.rock
      if (r.hp <= 0) return
      r.hp--
      if (!this.harvestToPlayer(p, 'stone', 1)) { r.hp++; return }
      p.harvestCd = effectiveHarvestCd()
      this.spawnIcon('icon_stone', r.x + 2, r.y - 10)
      this.spawnRipple(r.x, r.y)
      if (r.hp <= 0) r.regrow = C.STONE_REGROW
      return
    }
    if (t.kind === 'pick') {
      if (!t.ok) return
      const b = t.bush
      if (b.hp <= 0) return
      b.hp--
      if (!this.harvestToPlayer(p, 'berries', 1)) { b.hp++; return }
      p.harvestCd = effectiveHarvestCd()
      this.spawnIcon('icon_berries', b.x, b.y - 10)
      if (b.hp <= 0) b.regrow = C.BERRY_REGROW
      return
    }
  }

  updateHint() {
    let hint = ''
    for (const p of this.players) {
      const t = p.target
      if (!t) {
        // Sac plein et pas près d'une interaction : rappel de dépôt
        const inv = Object.values(p.inventory).reduce((a, b) => a + b, 0)
        if (inv >= C.PLAYER_INVENTORY_MAX) hint = 'Sac plein ! Déposez dans la charrette 🛒'
        continue
      }
      if (t.kind === 'menu') hint = 'Ouvrir le village 🏡'
      else if (t.kind === 'build') hint = t.ok
        ? 'Construire : ' + C.BUILDINGS[t.spot.building].name
        : 'Ressources insuffisantes'
      else if (t.kind === 'cart') {
        if (!t.cart) continue
        if (t.cart.following === p.id) hint = 'Lâcher la charrette 🛒'
        else hint = 'Prendre la charrette 🛒'
      }
      else if (t.kind === 'chop') {
        if (t.inventoryFull) hint = 'Sac plein ! Approchez la charrette pour déposer 🛒'
        else hint = t.ok ? 'Couper du bois 🪵' : "Besoin d'une hache 🪓"
      }
      else if (t.kind === 'fish') {
        if (t.inventoryFull) hint = 'Sac plein ! Approchez la charrette pour déposer 🛒'
        else hint = t.ok ? 'Pêcher 🐟' : "Besoin d'une canne à pêche 🎣"
      }
      else if (t.kind === 'mine') {
        if (t.inventoryFull) hint = 'Sac plein ! Approchez la charrette pour déposer 🛒'
        else hint = t.ok ? 'Miner de la pierre ⛏️' : "Besoin d'une pioche ⛏️"
      }
      else if (t.kind === 'pick') {
        if (t.inventoryFull) hint = 'Sac plein ! Approchez la charrette pour déposer 🛒'
        else hint = t.ok ? 'Cueillir des baies 🫐' : "Besoin d'une faucille 🌾"
      }
    }
    game.hint = hint
  }

  updateBuildings(dt) {
    for (const id in this.prodTimers) {
      if (game.buildings[id] <= 0) continue
      this.prodTimers[id] += dt
      const iv = effectiveInterval(id)
      if (this.prodTimers[id] >= iv) {
        this.prodTimers[id] -= iv
        const def = C.BUILDINGS[id]
        harvest(def.produces, def.amount)
        const spot = C.BUILD_SPOTS.find((s) => s.building === id)
        const iconMap = { wood: 'icon_wood', fish: 'icon_fish', stone: 'icon_stone', berries: 'icon_berries' }
        this.spawnIcon(iconMap[def.produces] || 'icon_wood', spot.x, spot.y - 18)
      }
    }
  }

  updateTrees(dt) {
    const treeMax = C.TREE_HP + game.upgrades.harvest_yield
    for (const t of this.trees) {
      if (t.shake > 0) t.shake = Math.max(0, t.shake - dt)
      if (t.hp > 0 && t.hp === t.maxHp && t.maxHp < treeMax) { t.hp = treeMax; t.maxHp = treeMax }
      if (t.hp <= 0) {
        t.regrow -= dt
        if (t.regrow <= 0) { t.hp = treeMax; t.maxHp = treeMax; this.spawnLeaves(t.x, t.y - 14, 5) }
      }
    }
  }

  updateFish(dt) {
    const JUMP_DUR = 0.72
    for (const f of this.fishSpots) {
      if (f.cd > 0) { f.cd -= dt; continue }
      // Compte à rebours avant le prochain saut
      if (!f.jumping) {
        f.jumpTimer -= dt
        if (f.jumpTimer <= 0) {
          f.jumping = true
          f.jumpT = 0
          f.jumpTimer = 3.5 + Math.random() * 5
        }
      } else {
        f.jumpT += dt
        if (f.jumpT >= JUMP_DUR) { f.jumping = false; f.jumpT = 0 }
      }
    }
  }

  updateStone(dt) {
    const stoneMax = C.STONE_HP + game.upgrades.harvest_yield
    const berryMax = C.BERRY_HP + game.upgrades.harvest_yield
    for (const s of this.stoneSpots) {
      if (s.hp > 0 && s.hp === s.maxHp && s.maxHp < stoneMax) { s.hp = stoneMax; s.maxHp = stoneMax }
      if (s.hp <= 0) {
        s.regrow -= dt
        if (s.regrow <= 0) { s.hp = stoneMax; s.maxHp = stoneMax }
      }
    }
    for (const b of this.berryBushes) {
      if (b.hp > 0 && b.hp === b.maxHp && b.maxHp < berryMax) { b.hp = berryMax; b.maxHp = berryMax }
      if (b.hp <= 0) {
        b.regrow -= dt
        if (b.regrow <= 0) { b.hp = berryMax; b.maxHp = berryMax }
      }
    }
  }

  updateNature(dt) {
    // Plus on récolte, plus la prairie fleurit
    const target = Math.min(130, Math.floor(game.totalHarvested / 5))
    if (this.flowers.length < target) {
      for (let k = 0; k < 3 && this.flowers.length < target; k++) {
        const x = 16 + Math.random() * (C.WORLD_W - 180)
        const y = 26 + Math.random() * (C.WORLD_H - 52)
        if (this._inWater(x, y)) continue
        if (dist(x, y, C.VILLAGE.x, C.VILLAGE.y) < C.VILLAGE.r - 4) continue
        const kinds = ['flower_pink', 'flower_white', 'flower_gold']
        this.flowers.push({ x, y, kind: kinds[(Math.random() * 3) | 0], grow: 0 })
      }
    }
    for (const f of this.flowers) if (f.grow < 1) f.grow = Math.min(1, f.grow + dt * 1.5)

    // Apparition des biches selon la progression
    const deerTarget = game.totalHarvested > 90 ? 4 : game.totalHarvested > 60 ? 3 : game.totalHarvested > 22 ? 2 : 0
    while (this.deer.length < deerTarget) {
      this.deer.push({ x: 80 + Math.random() * 500, y: 80 + Math.random() * 400, tx: 0, ty: 0, timer: 0, facing: 1, state: 'idle' })
    }
  }

  updateDeer(dt) {
    for (const d of this.deer) {
      d.timer -= dt
      if (d.state === 'idle') {
        if (d.timer <= 0) {
          d.tx = 50 + Math.random() * 720
          d.ty = 60 + Math.random() * 480
          d.state = 'walk'
        }
      } else {
        const dx = d.tx - d.x, dy = d.ty - d.y
        const dd = Math.hypot(dx, dy)
        if (dd < 3) { d.state = 'idle'; d.timer = 1.5 + Math.random() * 3 }
        else {
          d.facing = dx < 0 ? -1 : 1
          const sp = 18 * dt
          let nx = d.x + (dx / dd) * sp
          let ny = d.y + (dy / dd) * sp
          if (!this._inWater(nx, ny) && dist(nx, ny, C.VILLAGE.x, C.VILLAGE.y) > C.VILLAGE.r) { d.x = nx; d.y = ny }
          else { d.state = 'idle'; d.timer = 1 }
        }
      }
    }
  }

  updateBirds(dt) {
    this.birdTimer -= dt
    if (this.birdTimer <= 0) {
      this.birdTimer = 7 + Math.random() * 12
      const y = 12 + Math.random() * 50
      this.particles.push({ type: 'bird', x: -10, y, vx: 26 + Math.random() * 14, vy: 0, life: 40, maxLife: 40, phase: 0 })
    }
  }

  // ------------------------------------------------------------- PARTICULES --
  spawnIcon(kind, x, y) {
    this.particles.push({ type: kind, x, y, vx: 0, vy: -12, life: 1.1, maxLife: 1.1 })
  }
  spawnLeaves(x, y, n) {
    for (let i = 0; i < n; i++) {
      this.particles.push({
        type: 'leaf', x, y, vx: (Math.random() - 0.5) * 20, vy: 8 + Math.random() * 14,
        life: 1 + Math.random(), maxLife: 2, sway: Math.random() * TWO_PI,
        col: Math.random() < 0.5 ? '#5a9146' : '#c98a3a',
      })
    }
  }
  spawnPoof(x, y) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TWO_PI
      this.particles.push({ type: 'poof', x, y, vx: Math.cos(a) * 20, vy: Math.sin(a) * 20 - 6, life: 0.5, maxLife: 0.5 })
    }
  }
  spawnRipple(x, y) {
    this.particles.push({ type: 'ripple', x, y, life: 0.8, maxLife: 0.8, r: 1 })
  }
  emitCampfire(dt) {
    if (Math.random() < dt * 14) {
      this.particles.push({
        type: 'spark', x: C.VILLAGE.x + (Math.random() - 0.5) * 4, y: C.VILLAGE.y - 2,
        vx: (Math.random() - 0.5) * 6, vy: -14 - Math.random() * 8, life: 0.7, maxLife: 0.7,
      })
    }
  }
  updateParticles(dt) {
    const keep = []
    for (const p of this.particles) {
      p.life -= dt
      if (p.life <= 0) continue
      if (p.type === 'bird') {
        p.x += p.vx * dt; p.phase += dt * 10
        if (p.x > C.WORLD_W + 12) continue
      } else if (p.type === 'ripple') {
        p.r += dt * 22
      } else {
        p.x += (p.vx || 0) * dt
        p.y += (p.vy || 0) * dt
        if (p.type === 'leaf') p.x += Math.sin(this.time * 4 + (p.sway || 0)) * dt * 8
      }
      keep.push(p)
    }
    if (keep.length > 240) keep.splice(0, keep.length - 240)
    this.particles = keep
  }

  // ------------------------------------------------------------- ÉCLAIRAGE ---
  overlay() {
    const t = game.timeOfDay
    const dayLight = 0.5 + 0.5 * Math.cos((t - 0.25) * TWO_PI)
    const dark = clamp01(1 - dayLight)
    const gauss = (c, w) => Math.exp(-Math.pow(t - c, 2) / w)
    const warm = 0.24 * gauss(0.5, 0.004) + 0.18 * Math.max(gauss(0, 0.003), gauss(1, 0.003))
    return { dark, warmA: warm }
  }

  // ----------------------------------------------------------------- RENDU ---
  // Applique le cadrage caméra. La transformation canvas est :
  //   pixelsPerWorldUnit = cam.zoom × (canvasW / VIEW_W)
  // Ainsi zoom=1 montre exactement VIEW_W × VIEW_H world-units, quelle que
  // soit la résolution physique du canvas.
  applyCam(ctx) {
    const { left, top, zoom } = this.camView
    const scale = zoom * (this.canvasW / C.VIEW_W)
    ctx.setTransform(scale, 0, 0, scale, -left * scale, -top * scale)
  }
  resetCam(ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
  }

  render(ctx) {
    const t = this.time
    const { dark, warmA } = this.overlay()

    // Fond (visible si la vue dépasse le monde — normalement jamais)
    this.resetCam(ctx)
    ctx.fillStyle = '#26331f'
    ctx.fillRect(0, 0, this.canvasW, this.canvasH)

    // ---- PASSE MONDE (dans le repère caméra) --------------------------------
    this.applyCam(ctx)

    // 1) Herbe de base sur tout le monde
    ctx.fillStyle = '#7bb161'
    ctx.fillRect(0, 0, C.WORLD_W, C.WORLD_H)

    // 2) Sol de forêt (moitié gauche, légèrement plus sombre)
    ctx.fillStyle = '#6ba354'
    this._ellipse(ctx, 190, 320, 240, 320)

    // 3) Clairière (terre) sous le village + emplacements
    ctx.fillStyle = '#c9b184'
    this._ellipse(ctx, C.VILLAGE.x, C.VILLAGE.y + 6, C.VILLAGE.r + 14, C.VILLAGE.r)
    for (const s of C.BUILD_SPOTS) this._ellipse(ctx, s.x, s.y + 2, 18, 9)

    // 4) Rivière (remplit jusqu'au bord droit du monde)
    this.renderWater(ctx, t, C.WORLD_W, C.WORLD_H)

    // 4.5) Zones de pêche actives (dans l'eau, avant les entités)
    for (const f of this.fishSpots) {
      if (f.cd <= 0) this.drawFishZone(ctx, f, t)
    }

    // 5) Fleurs + touffes d'herbe (au sol, sous les entités)
    for (const g of this.grassTufts) this.drawBottom(ctx, sprite('grass'), g.x, g.y)
    for (const f of this.flowers) {
      const s = sprite(f.kind)
      this.drawBottom(ctx, s, f.x, f.y, { scale: f.grow, alpha: f.grow })
    }

    // 6) Repères d'emplacement de construction (pointillés) + panneau de coût
    const nearDist = C.INTERACT_RANGE * 3.5
    for (const spot of C.BUILD_SPOTS) {
      const def = C.BUILDINGS[spot.building]
      if (game.buildings[spot.building] > 0) continue
      if (game.villageLevel < def.requiresLevel) continue
      const near = this.players.some((p) => dist(p.x, p.y, spot.x, spot.y) < nearDist)
      this.drawBuildMarker(ctx, spot, t, near)
    }

    // 7) Entités triées par profondeur (baseline y)
    const ents = []
    for (const tr of this.trees) ents.push({ y: tr.y, draw: () => this.drawTree(ctx, tr) })
    for (const b of this.berryBushes) ents.push({ y: b.y, draw: () => this.drawBerryBush(ctx, b) })
    for (const s of this.stoneSpots) ents.push({ y: s.y, draw: () => this.drawStoneSpot(ctx, s) })
    for (const d of this.deer) ents.push({ y: d.y, draw: () => this.drawDeer(ctx, d) })
    const houses = this.villageHouses()
    for (const h of houses) ents.push({ y: h.y, draw: () => this.drawBottom(ctx, sprite(h.sprite), h.x, h.y) })
    if (game.villageLevel >= 3) {
      const v = C.VILLAGE
      ents.push({ y: v.y - 8, draw: () => this.drawBottom(ctx, sprite('bush'), v.x - 30, v.y - 8, { scale: 0.7 }) })
      ents.push({ y: v.y - 8, draw: () => this.drawBottom(ctx, sprite('bush'), v.x + 28, v.y - 8, { scale: 0.7 }) })
      ents.push({ y: v.y - 12, draw: () => this.drawBottom(ctx, sprite('flower_pink'), v.x - 18, v.y - 12) })
      ents.push({ y: v.y - 12, draw: () => this.drawBottom(ctx, sprite('flower_white'), v.x + 16, v.y - 12) })
    }
    ents.push({ y: C.VILLAGE.y + 4, draw: () => this.drawCampfire(ctx, t) })
    for (const spot of C.BUILD_SPOTS) {
      if (game.buildings[spot.building] > 0) {
        const def = C.BUILDINGS[spot.building]
        ents.push({ y: spot.y, draw: () => this.drawBuilding(ctx, spot, def, t) })
      }
    }
    for (const cart of this.carts) ents.push({ y: cart.y, draw: () => this.drawCart(ctx, cart) })
    for (const p of this.players) ents.push({ y: p.y, draw: () => this.drawPlayer(ctx, p) })
    ents.sort((a, b) => a.y - b.y)
    for (const e of ents) e.draw()

    // 8) Particules
    this.renderParticles(ctx)

    // ---- OVERLAYS (espace écran, plein cadre) -------------------------------
    this.resetCam(ctx)
    if (warmA > 0.01) { ctx.fillStyle = `rgba(240,150,80,${warmA})`; ctx.fillRect(0, 0, this.canvasW, this.canvasH) }
    if (dark > 0.01) { ctx.fillStyle = `rgba(20,26,66,${dark * 0.5})`; ctx.fillRect(0, 0, this.canvasW, this.canvasH) }

    // ---- PASSE NUIT + UI MONDE (au-dessus des overlays, repère caméra) ------
    this.applyCam(ctx)
    if (dark > 0.2) this.renderNight(ctx, dark, t)
    for (const p of this.players) {
      if (p.target && !(game.menuOpen && game.menuOpener === p.id)) this.drawPrompt(ctx, p.target, t, p.color)
    }
    for (const p of this.players) this.drawLabel(ctx, p)

    this.resetCam(ctx)
  }

  villageHouses() {
    const v = C.VILLAGE
    if (game.villageLevel === 1) return []
    if (game.villageLevel === 2) return [{ x: v.x - 20, y: v.y - 10, sprite: 'cabin' }]
    // Niveau 3 : grand chalet centré un peu au-dessus du feu de camp
    return [{ x: v.x, y: v.y - 22, sprite: 'chalet' }]
  }

  renderWater(ctx, t, W, H) {
    for (let y = 0; y < H; y += 2) {
      const left = C.riverCenterX(y) - C.RIVER.halfWidth
      ctx.fillStyle = '#4f9ec4'
      ctx.fillRect(left, y, W - left, 2)
      // Berge (liseré plus clair)
      ctx.fillStyle = '#7ec7e6'
      ctx.fillRect(left, y, 2, 2)
    }
    // Reflets animés
    ctx.fillStyle = 'rgba(255,255,255,0.18)'
    for (let i = 0; i < 60; i++) {
      const y = (i * 11 + Math.sin(t * 0.6 + i) * 4) % H
      const left = C.riverCenterX(y) - C.RIVER.halfWidth
      const x = left + 8 + ((i * 37 + t * 12) % (W - left - 12))
      ctx.fillRect(x, y, 5, 1)
    }
  }

  drawTree(ctx, tr) {
    if (tr.hp <= 0) { this.drawBottom(ctx, sprite('stump'), tr.x, tr.y); return }
    const s = sprite('tree')
    const dx = tr.shake > 0 ? Math.sin(this.time * 40) * 1 : 0
    this.drawBottom(ctx, s, tr.x + dx, tr.y)
  }

  drawDeer(ctx, d) {
    const s = sprite('deer')
    this.drawShadow(ctx, d.x, d.y, s.width)
    this.drawBottom(ctx, s, d.x, d.y, { flip: d.facing < 0 })
  }

  drawCampfire(ctx, t) {
    const s = sprite('campfire')
    // Lueur douce
    const glow = 6 + Math.sin(t * 8) * 1.5
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = 'rgba(255,170,70,0.16)'
    this._ellipse(ctx, C.VILLAGE.x, C.VILLAGE.y - 2, 14 + glow, 8 + glow * 0.5)
    ctx.restore()
    this.drawBottom(ctx, s, C.VILLAGE.x, C.VILLAGE.y + 4)
  }

  drawBuilding(ctx, spot, def, t) {
    const s = sprite(def.sprite)
    const bob = Math.sin(t * 3 + spot.x) * 0.5
    this.drawShadow(ctx, spot.x, spot.y, s.width)
    this.drawBottom(ctx, s, spot.x, spot.y - bob * 0.4)
  }

  drawStoneSpot(ctx, s) {
    this.drawBottom(ctx, sprite(s.hp > 0 ? 'rock' : 'rock_depleted'), s.x, s.y)
  }

  drawBerryBush(ctx, b) {
    this.drawBottom(ctx, sprite(b.hp > 0 ? 'bush_full' : 'bush_empty'), b.x, b.y)
  }

  drawCart(ctx, cart) {
    const s = sprite('cart')
    this.drawShadow(ctx, cart.x, cart.y, s.width)
    this.drawBottom(ctx, s, cart.x, cart.y)

    // Contenu de la charrette (total d'objets)
    const total = Object.values(cart.inventory).reduce((a, b) => a + b, 0)
    if (total > 0) {
      const cap = C.PLAYER_INVENTORY_MAX * 3
      ctx.font = '5px monospace'
      ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(0,0,0,0.45)'
      ctx.fillText(total, cart.x + 0.3, cart.y - s.height - 2.3)
      ctx.fillStyle = '#f4ead5'
      ctx.fillText(total, cart.x, cart.y - s.height - 2)
      ctx.textAlign = 'left'
    }

    // Indicateur visuel si la charrette suit un joueur
    if (cart.following !== null) {
      const d = Math.sin(this.time * 5) * 1.5
      ctx.fillStyle = 'rgba(255,255,200,0.7)'
      ctx.beginPath()
      ctx.arc(cart.x, cart.y - s.height - 7 + d, 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  drawPlayer(ctx, p) {
    const s = characterSprite(p.color)
    this.drawShadow(ctx, p.x, p.y, s.width - 1)
    const bob = p.moving ? Math.abs(Math.sin(p.walkPhase)) * 1.4 : Math.sin(this.time * 2 + p.id) * 0.4
    const scale = p.spawn > 0 ? 1 + p.spawn * 0.6 : 1
    const alpha = p.spawn > 0 ? 1 - p.spawn * 0.4 : 1
    this.drawBottom(ctx, s, p.x, p.y - bob, { flip: p.facing < 0, scale, alpha })
  }

  drawBuildMarker(ctx, spot, t, near = false) {
    const ok = canBuild(spot.building)
    const def = C.BUILDINGS[spot.building]
    ctx.save()
    ctx.strokeStyle = ok ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)'
    ctx.lineWidth = 0.8
    ctx.setLineDash([3, 3])
    ctx.lineDashOffset = -t * 8
    ctx.strokeRect(spot.x - 12, spot.y - 20, 24, 22)
    ctx.setLineDash([])
    // Icône fantôme du bâtiment
    const alpha = near ? 0.45 + Math.sin(t * 3) * 0.08 : 0.22 + Math.sin(t * 3) * 0.05
    this.drawBottom(ctx, sprite(def.sprite), spot.x, spot.y, { alpha })
    // Panneau de coût (apparaît quand on s'approche)
    if (near) this.drawBuildCostPanel(ctx, spot, def, t)
    ctx.restore()
  }

  drawBuildCostPanel(ctx, spot, def, t) {
    const entries = Object.entries(def.cost)
    const iconW = 9   // world units largeur sprite icône
    const colW = iconW + 20  // largeur par ressource (icône + nombre)
    const panW = entries.length * colW + 10
    const panH = 18
    // Position : au-dessus du marqueur, légèrement animée
    const panX = spot.x - panW / 2
    const panY = spot.y - 50 + Math.sin(t * 2.5) * 0.8

    // Fond sombre arrondi
    ctx.fillStyle = 'rgba(30,22,14,0.84)'
    this._roundRect(ctx, panX, panY, panW, panH, 3)
    ctx.fill()

    // Petite flèche pointant vers le bas
    ctx.fillStyle = 'rgba(30,22,14,0.84)'
    ctx.beginPath()
    ctx.moveTo(spot.x - 4, panY + panH)
    ctx.lineTo(spot.x + 4, panY + panH)
    ctx.lineTo(spot.x, panY + panH + 4)
    ctx.closePath()
    ctx.fill()

    // Nom du bâtiment (petit, centré)
    ctx.font = '5px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(244,234,213,0.7)'
    ctx.fillText(def.name, spot.x, panY + 6)

    // Ressources
    const sprKey = { wood: 'icon_wood', fish: 'icon_fish', stone: 'icon_stone', berries: 'icon_berries' }
    let x = panX + 5
    for (const [res, amount] of entries) {
      const have = game[res] || 0
      const ok = have >= amount
      // Icône sprite
      this.drawBottom(ctx, sprite(sprKey[res]), x + iconW / 2, panY + panH - 3, { scale: 0.75 })
      // Fraction "possédé/requis"
      ctx.font = '5px monospace'
      ctx.textAlign = 'left'
      ctx.fillStyle = ok ? '#7de87a' : '#f07878'
      ctx.fillText(`${Math.floor(have)}/${amount}`, x + iconW + 1, panY + panH - 4)
      x += colW
    }
    ctx.textAlign = 'left'
  }

  // Zone de pêche active : halo dans l'eau + ronds qui s'élargissent + poisson qui saute.
  drawFishZone(ctx, f, t) {
    const JUMP_DUR = 0.72
    // Point dans l'eau (légèrement décalé vers le centre de la rivière)
    const wx = f.x + 10
    const wy = f.y

    ctx.save()

    // 1) Halo lumineux pulsé (zone active)
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.8 + f.y * 0.04)
    ctx.fillStyle = `rgba(170,230,255,${0.12 * pulse})`
    ctx.beginPath()
    ctx.ellipse(wx, wy, 16, 8, 0, 0, TWO_PI)
    ctx.fill()

    // 2) Anneaux de remous qui s'élargissent (3 en décalage de phase)
    for (let i = 0; i < 3; i++) {
      const phase = ((t * 0.7 + i / 3) % 1)
      const rx = 4 + phase * 14
      const ry = rx * 0.45
      const alpha = (1 - phase) * 0.55
      ctx.strokeStyle = `rgba(210,245,255,${alpha})`
      ctx.lineWidth = 0.7
      ctx.beginPath()
      ctx.ellipse(wx, wy, rx, ry, 0, 0, TWO_PI)
      ctx.stroke()
    }

    // 3) Poisson qui saute en arc parabolique
    if (f.jumping) {
      const jt = f.jumpT / JUMP_DUR           // 0→1
      const up = Math.sin(jt * Math.PI)       // sinus : monte puis redescend
      const jumpH = 18 * up
      const jx = wx + (jt - 0.5) * 7         // légère dérive horizontale
      const jy = wy - jumpH

      // Rotation : incliné vers le haut en montée, vers le bas en descente
      const angle = (jt < 0.5 ? -1 : 1) * (1 - Math.abs(jt * 2 - 1)) * 1.1

      ctx.save()
      ctx.translate(jx, jy)
      ctx.rotate(angle)

      // Corps du poisson (ellipse)
      ctx.fillStyle = '#5db8da'
      ctx.beginPath()
      ctx.ellipse(0, 0, 6, 2.5, 0, 0, TWO_PI)
      ctx.fill()

      // Ventre plus clair
      ctx.fillStyle = '#aae4f5'
      ctx.beginPath()
      ctx.ellipse(1, 0.5, 3.5, 1.2, 0, 0, TWO_PI)
      ctx.fill()

      // Œil
      ctx.fillStyle = '#1a2a3a'
      ctx.beginPath()
      ctx.arc(4, -0.8, 0.8, 0, TWO_PI)
      ctx.fill()

      // Queue (triangle)
      ctx.fillStyle = '#3a98bc'
      ctx.beginPath()
      ctx.moveTo(-5.5, 0)
      ctx.lineTo(-9, -3)
      ctx.lineTo(-9, 3)
      ctx.closePath()
      ctx.fill()

      // Petite éclaboussure à l'atterrissage (derniers 15% du saut)
      if (jt > 0.85) {
        const splash = (jt - 0.85) / 0.15
        ctx.restore()
        ctx.strokeStyle = `rgba(200,240,255,${(1 - splash) * 0.8})`
        ctx.lineWidth = 0.8
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * TWO_PI
          const len = 4 * splash
          ctx.beginPath()
          ctx.moveTo(jx + Math.cos(a) * 2, jy + Math.sin(a) * 1)
          ctx.lineTo(jx + Math.cos(a) * (2 + len), jy + Math.sin(a) * (1 + len * 0.5))
          ctx.stroke()
        }
      } else {
        ctx.restore()
      }
    }

    ctx.restore()
  }

  drawPrompt(ctx, target, t, color) {
    const bob = Math.sin(t * 6) * 1.5
    const x = Math.round(target.x), y = Math.round(target.y + bob)
    // petite bulle
    ctx.fillStyle = target.ok ? 'rgba(255,255,255,0.92)' : 'rgba(230,120,120,0.9)'
    this._roundRect(ctx, x - 5, y - 5, 10, 10, 2)
    ctx.fill()
    ctx.fillStyle = color
    this._roundRect(ctx, x - 3, y - 3, 6, 6, 1)
    ctx.fill()
    // flèche
    ctx.fillStyle = 'rgba(255,255,255,0.92)'
    ctx.beginPath()
    ctx.moveTo(x - 3, y + 6); ctx.lineTo(x + 3, y + 6); ctx.lineTo(x, y + 9)
    ctx.closePath(); ctx.fill()
  }

  drawLabel(ctx, p) {
    const s = characterSprite(p.color)
    ctx.font = '6px monospace'
    ctx.textAlign = 'center'
    const y = p.y - s.height - 4
    ctx.fillStyle = 'rgba(0,0,0,0.4)'
    ctx.fillText(p.label, p.x + 0.3, y + 0.3)
    ctx.fillStyle = p.color
    ctx.fillText(p.label, p.x, y)

    // Jauge d'inventaire
    const invTotal = Object.values(p.inventory).reduce((a, b) => a + b, 0)
    if (invTotal > 0) {
      const barW = 14, barH = 2
      const bx = Math.round(p.x - barW / 2)
      const by = Math.round(y - 5)
      ctx.fillStyle = 'rgba(0,0,0,0.45)'
      ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2)
      ctx.fillStyle = invTotal >= C.PLAYER_INVENTORY_MAX ? '#e05050' : '#f0d050'
      ctx.fillRect(bx, by, Math.round(barW * invTotal / C.PLAYER_INVENTORY_MAX), barH)
    }

    ctx.textAlign = 'left'
  }

  renderParticles(ctx) {
    for (const p of this.particles) {
      const a = clamp01(p.life / p.maxLife)
      if (p.type === 'icon_wood' || p.type === 'icon_fish' || p.type === 'icon_stone' || p.type === 'icon_berries') {
        this.drawBottom(ctx, sprite(p.type), p.x, p.y, { alpha: a })
      } else if (p.type === 'leaf') {
        ctx.globalAlpha = a
        ctx.fillStyle = p.col
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2)
        ctx.globalAlpha = 1
      } else if (p.type === 'poof') {
        ctx.globalAlpha = a * 0.8
        ctx.fillStyle = '#f4ead5'
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2)
        ctx.globalAlpha = 1
      } else if (p.type === 'spark') {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'
        ctx.globalAlpha = a
        ctx.fillStyle = '#ffb24d'
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1)
        ctx.restore(); ctx.globalAlpha = 1
      } else if (p.type === 'ripple') {
        ctx.strokeStyle = `rgba(255,255,255,${a * 0.6})`
        ctx.lineWidth = 1
        ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r, p.r * 0.5, 0, 0, TWO_PI); ctx.stroke()
      } else if (p.type === 'bird') {
        const yo = Math.sin(p.phase) * 1.5
        this.drawBottom(ctx, sprite('bird'), p.x, p.y + yo)
      }
    }
  }

  renderNight(ctx, dark, t) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    // Fenêtres des maisons
    const houses = this.villageHouses()
    for (const h of houses) {
      const flick = 0.85 + Math.sin(t * 3 + h.x) * 0.12
      ctx.fillStyle = `rgba(255,200,90,${dark * 0.9 * flick})`
      ctx.fillRect(h.x - 8, h.y - 12, 4, 4)
      ctx.fillRect(h.x + 4, h.y - 12, 4, 4)
    }
    // Bâtiments récolteurs
    for (const spot of C.BUILD_SPOTS) {
      if (game.buildings[spot.building] <= 0) continue
      ctx.fillStyle = `rgba(255,200,90,${dark * 0.8})`
      ctx.fillRect(spot.x - 7, spot.y - 14, 3, 3)
    }
    // Lueur du feu de camp
    ctx.fillStyle = `rgba(255,150,60,${dark * 0.5})`
    this._ellipse(ctx, C.VILLAGE.x, C.VILLAGE.y - 2, 20, 12)
    // Lucioles
    for (const f of this.fireflies) {
      const gx = f.x + Math.sin(t * f.spd + f.phase) * 6
      const gy = f.y + Math.cos(t * f.spd * 0.7 + f.phase) * 5
      const gl = 0.4 + 0.4 * Math.sin(t * 3 + f.phase)
      ctx.fillStyle = `rgba(255,245,150,${dark * gl})`
      ctx.fillRect(Math.round(gx), Math.round(gy), 1, 1)
      ctx.fillStyle = `rgba(255,245,150,${dark * gl * 0.4})`
      ctx.fillRect(Math.round(gx) - 1, Math.round(gy), 3, 1)
      ctx.fillRect(Math.round(gx), Math.round(gy) - 1, 1, 3)
    }
    ctx.restore()
  }

  // ---------------------------------------------------------------- helpers --
  drawBottom(ctx, cv, cx, by, opts = {}) {
    const scale = opts.scale == null ? 1 : opts.scale
    const w = cv.width * scale, h = cv.height * scale
    const x = Math.round(cx - w / 2)
    const y = Math.round(by - h)
    if (opts.alpha != null) ctx.globalAlpha = opts.alpha
    if (opts.flip) {
      ctx.save()
      ctx.translate(x + w, y)
      ctx.scale(-1, 1)
      ctx.drawImage(cv, 0, 0, w, h)
      ctx.restore()
    } else {
      ctx.drawImage(cv, x, y, w, h)
    }
    if (opts.alpha != null) ctx.globalAlpha = 1
  }

  drawShadow(ctx, cx, by, w) {
    const s = shadowSprite(Math.max(6, Math.round(w)))
    ctx.drawImage(s, Math.round(cx - s.width / 2), Math.round(by - s.height / 2))
  }

  _ellipse(ctx, cx, cy, rx, ry) {
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TWO_PI); ctx.fill()
  }
  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  }
}

// Petit accès aux touches d'un schéma clavier (pour la nav menu up/down)
import { KB_SCHEMES } from './input.js'
function KB(source) { return KB_SCHEMES[source] }
