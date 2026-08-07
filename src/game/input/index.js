export { KB_SCHEMES } from './keyboard.js'
import { keyboardMethods } from './keyboard.js'
import { gamepadMethods }  from './gamepad.js'
import { touchMethods }    from './touch.js'

export class Input {
  constructor() {
    this.keysDown   = new Set()
    this._prevKeys  = new Set()
    this._pads      = {}
    this.mouseAction = false
    this.mouseHeld  = false
    this.now = 0
    this.touch = { mx: 0, my: 0, down: false, _wasDown: false }

    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault()
      }
      this.keysDown.add(e.code)
    })
    window.addEventListener('keyup',  (e) => this.keysDown.delete(e.code))
    window.addEventListener('blur',   ()  => { this.keysDown.clear(); this.mouseHeld = false })

    window.addEventListener('pointerdown',  (e) => { if (e.pointerType === 'touch') return; this.mouseHeld = true })
    window.addEventListener('pointerup',    (e) => { if (e.pointerType === 'touch') return; this.mouseHeld = false })
    window.addEventListener('pointercancel',(e) => { if (e.pointerType === 'touch') return; this.mouseHeld = false })

    window.addEventListener('gamepadconnected',    () => {})
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
        this._pads[gp.index].prev    = this._pads[gp.index].pressed
        this._pads[gp.index].pressed = cur
        this._pads[gp.index].axes    = gp.axes
      }
    }
    for (const idx in this._pads) if (!seen[idx]) delete this._pads[idx]
  }

  endFrame() {
    this._prevKeys  = new Set(this.keysDown)
    this.mouseAction = false
    this.touch._wasDown = this.touch.down
  }
}

Object.assign(Input.prototype, keyboardMethods, gamepadMethods, touchMethods)
