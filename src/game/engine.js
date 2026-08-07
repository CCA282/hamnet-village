import { World } from './world/World.js'
import { Input } from './input/index.js'
import { netState } from '../net/netState.js'
import { send, disconnect } from '../net/socket.js'
import { serializeWorld, applyWorldState } from '../net/sync.js'
import { resetGame, buyUpgrade, buyBuildingUpgrade } from './store.js'
import { game } from './store.js'

class Engine {
  constructor() {
    this.world = new World()
    this.input = new Input()
    this.ctx = null
    this.canvas = null
    this.raf = 0
    this.last = 0
    this.running = false
    this._resizeObs = null
    this._syncTimer = 0
    this._inputTimer = 0
    this._pendingAction = false
    this._pendingCancel = false
  }

  _resize() {
    if (!this.canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = Math.round(this.canvas.clientWidth * dpr)
    const h = Math.round(this.canvas.clientHeight * dpr)
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w
      this.canvas.height = h
    }
    this.world.setCanvasSize(w, h)
  }

  start(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.ctx.imageSmoothingEnabled = false

    this._resize()
    this._resizeObs = new ResizeObserver(() => this._resize())
    this._resizeObs.observe(canvas)

    this.running = true
    this.last = performance.now()
    const loop = (now) => {
      if (!this.running) return
      let dt = (now - this.last) / 1000
      this.last = now
      if (dt > 0.05) dt = 0.05

      this.input.beginFrame()

      if (netState.mode === 'guest') {
        this._tickGuest(dt)
      } else {
        this.world.update(dt, this.input)
        if (netState.mode === 'host') this._tickHost(dt)
      }

      this.ctx.imageSmoothingEnabled = false
      this.world.render(this.ctx)
      this.input.endFrame()
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }

  _tickHost(dt) {
    // Notify guest if their remote player just opened a menu
    if (this.world._pendingRemoteMenuOpen) {
      const { guestId, buildingId } = this.world._pendingRemoteMenuOpen
      this.world._pendingRemoteMenuOpen = null
      send({ type: 'open_menu_for_guest', guestId, buildingId: buildingId ?? null })
    }
    // Notify guest if their remote player's menu was closed (e.g. cancel key)
    if (this.world._pendingRemoteMenuClose) {
      const { guestId } = this.world._pendingRemoteMenuClose
      this.world._pendingRemoteMenuClose = null
      send({ type: 'close_menu_for_guest', guestId })
    }
    this._syncTimer += dt
    if (this._syncTimer >= 0.033) {
      this._syncTimer = 0
      const snap = serializeWorld(this.world, { includeSpotsState: true })
      send({ type: 'state', data: snap })
    }
  }

  _tickGuest(dt) {
    // Buffer one-frame presses between sends
    const s = this.input.keyboardState('kb1')
    if (s.action || this.input.mouseAction) this._pendingAction = true
    if (s.cancel) this._pendingCancel = true

    this._inputTimer += dt
    if (this._inputTimer >= 0.033) {
      this._inputTimer = 0
      send({ type: 'input', input: {
        mx: s.mx || 0,
        my: s.my || 0,
        action: this._pendingAction,
        actionHeld: s.actionHeld || !!this.input.mouseHeld,
        cancel: this._pendingCancel,
        up:    this.input.keyDown('KeyW'),
        down:  this.input.keyDown('KeyS'),
        left:  this.input.keyDown('KeyA'),
        right: this.input.keyDown('KeyD'),
      }})
      this._pendingAction = false
      this._pendingCancel = false
    }
    this.world.updateGuestVisuals(dt)
  }

  applySnapshot(snap) {
    applyWorldState(this.world, snap)
    if (snap.guestPlayerId && !netState.myPlayerId) {
      netState.myPlayerId = snap.guestPlayerId
    }
  }

  // Guest: host tells us our remote player just opened a menu
  applyRemoteMenuOpen(buildingId) {
    // Consume the press that triggered the menu open so it doesn't also buy an upgrade
    this._pendingAction = false
    this._pendingCancel = false
    if (buildingId) {
      game.buildingMenuOpen = true
      game.buildingMenuBuilding = buildingId
      game.buildingMenuIndex = 0
      game.buildingMenuOpener = netState.myPlayerId
    } else {
      game.menuOpen = true
      game.menuOpener = netState.myPlayerId
      game.menuIndex = 0
      game.menuTab = 0
    }
  }

  // Guest: send a menu action to host
  sendGuestMenuAction(action) {
    send({ type: 'guest_menu_action', action })
    this._pendingAction = false
    this._pendingCancel = false
  }

  // Host: execute a menu action requested by a guest
  processGuestMenuAction(guestId, action) {
    const remoteP = this.world.players.find((pl) => pl.remoteGuestId === guestId)
    if (action.type === 'close_village') {
      if (remoteP) this.world.closeRemoteMenu(remoteP)
    } else if (action.type === 'close_building') {
      if (remoteP) this.world.closeRemoteBuildingMenu(remoteP)
    } else if (action.type === 'buy_upgrade') {
      buyUpgrade(action.key)
    } else if (action.type === 'buy_building_upgrade') {
      buyBuildingUpgrade(action.buildingId, action.upgradeType)
    }
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.raf)
    if (this._resizeObs) { this._resizeObs.disconnect(); this._resizeObs = null }
  }

  reset() {
    this.stop()
    disconnect()
    resetGame()
    this.world = new World()
    this._syncTimer = 0
    this._inputTimer = 0
    this._pendingAction = false
    this._pendingCancel = false
    netState.mode = null
    netState.roomCode = null
    netState.connected = false
    netState.myPlayerId = null
    netState.worldId = null
    netState.worldName = 'Mon monde'
  }
}

export const engine = new Engine()
