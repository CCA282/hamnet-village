export const touchMethods = {
  touchState() {
    const t = this.touch
    return {
      mx: t.mx,
      my: t.my,
      action: t.down && !t._wasDown,
      actionHeld: t.down,
      cancel: false,
      up: false,
      down: false,
    }
  },

  touchEngaged() {
    return this.touch.down || Math.abs(this.touch.mx) > 0.05 || Math.abs(this.touch.my) > 0.05
  },
}
