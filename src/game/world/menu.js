import { game, menuEntries, buyUpgrade } from '../store.js'

export const menuMethods = {
  openMenu(p) {
    game.menuOpen = true
    game.menuOpener = p.id
    game.menuIndex = 0
    game.menuTab = 0
    p.frozen = true
  },

  closeMenu() {
    game.menuOpen = false
    const op = this.findPlayer((x) => x.id === game.menuOpener)
    if (op) op.frozen = false
    game.menuOpener = null
  },

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

    // Gamepad
    this.menuNavTimer = Math.max(0, this.menuNavTimer - this._lastDt)
    const navLeft  = st.mx < -0.4
    const navRight = st.mx > 0.4
    const navUp    = st.my < -0.4 || st.up
    const navDown  = st.my > 0.4  || st.down
    if (navLeft && this.menuNavTimer <= 0)       { switchTab(-1); this.menuNavTimer = 0.3 }
    else if (navRight && this.menuNavTimer <= 0) { switchTab(1);  this.menuNavTimer = 0.3 }
    else if (navUp && this.menuNavTimer <= 0) {
      game.menuIndex = (game.menuIndex - 1 + entries.length) % entries.length
      this.menuNavTimer = 0.26
    } else if (navDown && this.menuNavTimer <= 0) {
      game.menuIndex = (game.menuIndex + 1) % entries.length
      this.menuNavTimer = 0.26
    }
    if (st.action) buySelected()
    if (st.cancel) this.closeMenu()
  },
}
