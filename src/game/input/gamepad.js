export const gamepadMethods = {
  padList() { return Object.keys(this._pads).map(Number) },

  padPressed(index, button) {
    const p = this._pads[index]
    return !!(p && p.pressed[button] && !p.prev[button])
  },

  padAnyPressed(index) {
    const p = this._pads[index]
    if (!p) return false
    for (let i = 0; i < p.pressed.length; i++) if (p.pressed[i] && !p.prev[i]) return true
    return false
  },

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
      action: this.padPressed(index, 0),
      actionHeld: !!(p.pressed[0]),
      cancel: this.padPressed(index, 1),
      up: this.padPressed(index, 12),
      down: this.padPressed(index, 13),
    }
  },
}
