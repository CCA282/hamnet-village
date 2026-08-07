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

export const keyboardMethods = {
  keyDown(code) { return this.keysDown.has(code) },
  keyPressed(code) { return this.keysDown.has(code) && !this._prevKeys.has(code) },
  anyPressed(codes) { for (const c of codes) if (this.keyPressed(c)) return true; return false },
  anyDown(codes) { for (const c of codes) if (this.keyDown(c)) return true; return false },

  keyboardState(scheme) {
    const s = KB_SCHEMES[scheme]
    let mx = 0, my = 0
    if (this.keyDown(s.left))  mx -= 1
    if (this.keyDown(s.right)) mx += 1
    if (this.keyDown(s.up))    my -= 1
    if (this.keyDown(s.down))  my += 1
    return {
      mx, my,
      action: this.anyPressed(s.action),
      actionHeld: this.anyDown(s.action),
      cancel: this.anyPressed(s.cancel),
    }
  },
}
