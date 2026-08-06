// ============================================================================
// Gestion des entrées : clavier (2 schémas) + manettes (USB & Bluetooth via
// la Gamepad API). Chaque state expose :
//   action     → front d'appui (une seule frame) : menu, build, premier coup
//   actionHeld → bouton maintenu : récolte continue (géré avec harvestCd)
// ============================================================================

export const KB_SCHEMES = {
  kb1: {
    up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD',
    action: ['Space', 'KeyE'], cancel: ['KeyQ', 'Escape'],
  },
  kb2: {
    up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight',
    action: ['Enter', 'ShiftRight'], cancel: ['ControlRight'],
  },
}

export class Input {
  constructor() {
    this.keysDown = new Set()
    this._prevKeys = new Set()
    this._pads = {}
    // Souris : one-shot (front d'appui, effacé en endFrame)
    this.mouseAction = false
    // Souris : état maintenu (suit pointerdown/up au niveau window)
    this.mouseHeld = false
    this.now = 0

    // État tactile : joystick + bouton. Alimenté par TouchControls.vue.
    this.touch = { mx: 0, my: 0, down: false, _wasDown: false }

    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault()
      }
      this.keysDown.add(e.code)
    })
    window.addEventListener('keyup', (e) => this.keysDown.delete(e.code))
    window.addEventListener('blur', () => { this.keysDown.clear(); this.mouseHeld = false })

    // Suivi de la souris (filtré sur pointerType != touch pour éviter conflits)
    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') return
      this.mouseHeld = true
    })
    window.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'touch') return
      this.mouseHeld = false
    })
    window.addEventListener('pointercancel', (e) => {
      if (e.pointerType === 'touch') return
      this.mouseHeld = false
    })

    window.addEventListener('gamepadconnected', () => {})
    window.addEventListener('gamepaddisconnected', () => {})
  }

  beginFrame() {
    this.now = performance.now() / 1000
    const pads = navigator.getGamepads ? navigator.getGamepads() : []
    const seen = {}
    for (const gp of pads) {
      if (!gp) continue
      seen[gp.index] = true
      const cur = gp.buttons.map((b) => b.pressed || b.value > 0.4)
      if (!this._pads[gp.index]) {
        this._pads[gp.index] = { pressed: cur, prev: cur.map(() => false), axes: gp.axes }
      } else {
        this._pads[gp.index].prev = this._pads[gp.index].pressed
        this._pads[gp.index].pressed = cur
        this._pads[gp.index].axes = gp.axes
      }
    }
    for (const idx in this._pads) if (!seen[idx]) delete this._pads[idx]
  }

  endFrame() {
    this._prevKeys = new Set(this.keysDown)
    this.mouseAction = false
    this.touch._wasDown = this.touch.down
  }

  // --- Tactile ---------------------------------------------------------------
  touchState() {
    const t = this.touch
    return {
      mx: t.mx,
      my: t.my,
      action: t.down && !t._wasDown,  // front d'appui uniquement
      actionHeld: t.down,             // maintenu → récolte continue via harvestCd
      cancel: false,
      up: false,
      down: false,
    }
  }
  touchEngaged() {
    return this.touch.down || Math.abs(this.touch.mx) > 0.05 || Math.abs(this.touch.my) > 0.05
  }

  // --- Utilitaires clavier ---------------------------------------------------
  keyDown(code) { return this.keysDown.has(code) }
  keyPressed(code) { return this.keysDown.has(code) && !this._prevKeys.has(code) }
  anyPressed(codes) { for (const c of codes) if (this.keyPressed(c)) return true; return false }
  anyDown(codes) { for (const c of codes) if (this.keyDown(c)) return true; return false }

  // État d'un schéma clavier -> { mx, my, action, actionHeld, cancel }
  keyboardState(scheme) {
    const s = KB_SCHEMES[scheme]
    let mx = 0, my = 0
    if (this.keyDown(s.left)) mx -= 1
    if (this.keyDown(s.right)) mx += 1
    if (this.keyDown(s.up)) my -= 1
    if (this.keyDown(s.down)) my += 1
    return {
      mx, my,
      action: this.anyPressed(s.action),
      actionHeld: this.anyDown(s.action),
      cancel: this.anyPressed(s.cancel),
    }
  }

  // --- Utilitaires manette ---------------------------------------------------
  padList() { return Object.keys(this._pads).map(Number) }

  padPressed(index, button) {
    const p = this._pads[index]
    return !!(p && p.pressed[button] && !p.prev[button])
  }
  padAnyPressed(index) {
    const p = this._pads[index]
    if (!p) return false
    for (let i = 0; i < p.pressed.length; i++) if (p.pressed[i] && !p.prev[i]) return true
    return false
  }

  // État d'une manette -> { mx, my, action, actionHeld, cancel, up, down }
  padState(index) {
    const p = this._pads[index]
    if (!p) return { mx: 0, my: 0, action: false, actionHeld: false, cancel: false, up: false, down: false }
    const ax = p.axes || []
    let mx = Math.abs(ax[0] || 0) > 0.25 ? ax[0] : 0
    let my = Math.abs(ax[1] || 0) > 0.25 ? ax[1] : 0
    if (p.pressed[14]) mx = -1
    if (p.pressed[15]) mx = 1
    if (p.pressed[12]) my = -1
    if (p.pressed[13]) my = 1
    return {
      mx, my,
      action: this.padPressed(index, 0),      // A / croix : front
      actionHeld: !!(p.pressed[0]),            // A / croix : maintenu
      cancel: this.padPressed(index, 1),
      up: this.padPressed(index, 12),
      down: this.padPressed(index, 13),
    }
  }
}
