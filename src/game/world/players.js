import * as C from '../constants/index.js'
import { game } from '../store.js'
import { netState } from '../../net/netState.js'
import { KB_SCHEMES } from '../input/index.js'

const TWO_PI = Math.PI * 2

export const playerMethods = {
  syncPlayers() {
    game.players = this.players.map((p) => ({ id: p.id, label: p.label, color: p.color, hint: p.hint ?? '' }))
  },

  addPlayer(source, gamepadIndex = null) {
    if (this.players.length >= C.MAX_PLAYERS) return
    const usedColors = new Set(this.players.map((p) => p.color))
    const color = C.PLAYER_COLORS.find((c) => !usedColors.has(c)) ?? C.PLAYER_COLORS[0]
    const num = this._nextPlayerNum++
    const idx = this.players.length
    const angle = (idx / C.MAX_PLAYERS) * TWO_PI
    const customName = source === 'kb1' ? (netState.playerName || '').trim() : ''
    const p = {
      id: this._nextId++,
      source, gamepadIndex, color,
      label: customName || ('P' + num),
      x: C.VILLAGE.x + Math.cos(angle) * 22,
      y: C.VILLAGE.y + C.VILLAGE.r + 10 + Math.sin(angle) * 6,
      facing: 1, walkPhase: 0, moving: false, frozen: false,
      spawn: 0.5, target: null, harvestCd: 0,
      inventory: { wood: 0, fish: 0, stone: 0, berries: 0, meteorite: 0 },
    }
    this.players.push(p)
    this.spawnPoof(p.x, p.y)
    this.syncPlayers()
    return p
  },

  removePlayer(p) {
    const i = this.players.indexOf(p)
    if (i >= 0) this.players.splice(i, 1)
    if (game.menuOpener === p.id) this.closeMenu()
    // Labels and colors are not reassigned — each player keeps their identity
    this.syncPlayers()
  },

  findPlayer(pred) { return this.players.find(pred) },

  inputFor(input, p) {
    if (p.source === 'remote') {
      return p.remoteInput || { mx: 0, my: 0, action: false, actionHeld: false }
    }
    if (p.source === 'pad') return input.padState(p.gamepadIndex)
    if (p.source === 'touch') return input.touchState()
    const s = input.keyboardState(p.source)
    if (p.source === 'kb1') {
      if (input.mouseAction) s.action = true
      if (input.mouseHeld) s.actionHeld = true
    }
    const kb = KB_SCHEMES[p.source]
    s.up    = input.keyPressed(kb.up)
    s.down  = input.keyPressed(kb.down)
    s.left  = input.keyPressed(kb.left)
    s.right = input.keyPressed(kb.right)
    return s
  },

  addRemotePlayer(guestId, name = null) {
    if (this.players.length >= C.MAX_PLAYERS) return null
    const usedColors = new Set(this.players.map((p) => p.color))
    const color = C.PLAYER_COLORS.find((c) => !usedColors.has(c)) ?? C.PLAYER_COLORS[0]
    const num = this._nextPlayerNum++
    const idx = this.players.length
    const angle = (idx / C.MAX_PLAYERS) * Math.PI * 2
    const customName = (name || '').trim()
    const p = {
      id: this._nextId++,
      source: 'remote', gamepadIndex: null, color,
      label: customName || ('P' + num),
      remoteGuestId: guestId,
      remoteInput: { mx: 0, my: 0, action: false, actionHeld: false },
      x: C.VILLAGE.x + Math.cos(angle) * 22,
      y: C.VILLAGE.y + C.VILLAGE.r + 10 + Math.sin(angle) * 6,
      facing: 1, walkPhase: 0, moving: false, frozen: false,
      spawn: 0.5, target: null, harvestCd: 0,
      inventory: { wood: 0, fish: 0, stone: 0, berries: 0, meteorite: 0 },
      isInMenu: false, menuIndex: 0, menuTab: 0,
      buildingMenuId: null, buildingMenuIndex: 0,
    }
    this.players.push(p)
    this.spawnPoof(p.x, p.y)
    this.syncPlayers()
    return p
  },

  applyRemoteInput(guestId, input) {
    const p = this.players.find((pl) => pl.remoteGuestId === guestId)
    if (p) p.remoteInput = input
  },

  handleJoins(input) {
    if (!this.findPlayer((p) => p.source === 'touch')) {
      if (input.touchEngaged()) this.addPlayer('touch')
    }
    if (!this.findPlayer((p) => p.source === 'kb1')) {
      const s = input.keyboardState('kb1')
      if (s.action || input.mouseAction) this.addPlayer('kb1')
    }
    if (!this.findPlayer((p) => p.source === 'kb2')) {
      const s = input.keyboardState('kb2')
      if (s.action) this.addPlayer('kb2')
    }
    for (const idx of input.padList()) {
      if (this.findPlayer((p) => p.source === 'pad' && p.gamepadIndex === idx)) continue
      if (input.padAnyPressed(idx)) this.addPlayer('pad', idx)
    }
  },

  handleDisconnects(input) {
    const connected = new Set(input.padList())
    for (const p of [...this.players]) {
      if (p.source === 'pad' && !connected.has(p.gamepadIndex)) {
        for (const c of this.carts) if (c.following === p.id) c.following = null
        this.removePlayer(p)
      }
    }
  },
}
