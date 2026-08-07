import { game, menuEntries, buyUpgrade, buildingMenuEntries, buyBuildingUpgrade } from '../store.js'

export const menuMethods = {
  // ── Local player menus (use global game.* state) ─────────────────────────

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

  openBuildingMenu(p, buildingId) {
    game.buildingMenuOpen = true
    game.buildingMenuBuilding = buildingId
    game.buildingMenuIndex = 0
    game.buildingMenuOpener = p.id
    p.frozen = true
  },

  closeBuildingMenu() {
    game.buildingMenuOpen = false
    const op = this.findPlayer((x) => x.id === game.buildingMenuOpener)
    if (op) op.frozen = false
    game.buildingMenuBuilding = null
    game.buildingMenuOpener = null
  },

  // ── Remote player menus (per-player state, don't touch global) ───────────

  openRemoteMenu(p) {
    p.isInMenu = true
    p.menuIndex = 0
    p.menuTab = 0
    p.frozen = true
    this._pendingRemoteMenuOpen = { guestId: p.remoteGuestId, buildingId: null }
    if (p.remoteInput) { p.remoteInput.action = false; p.remoteInput.cancel = false }
  },

  closeRemoteMenu(p) {
    p.isInMenu = false
    p.frozen = false
    this._pendingRemoteMenuClose = { guestId: p.remoteGuestId }
  },

  openRemoteBuildingMenu(p, buildingId) {
    p.buildingMenuId = buildingId
    p.buildingMenuIndex = 0
    p.frozen = true
    this._pendingRemoteMenuOpen = { guestId: p.remoteGuestId, buildingId }
    if (p.remoteInput) { p.remoteInput.action = false; p.remoteInput.cancel = false }
  },

  closeRemoteBuildingMenu(p) {
    p.buildingMenuId = null
    p.frozen = false
    this._pendingRemoteMenuClose = { guestId: p.remoteGuestId }
  },

  // ── Menu input handlers ───────────────────────────────────────────────────

  handleMenu(p, st) {
    const TAB_COUNT = 4
    const isRemote = p.source === 'remote'
    const getIndex  = () => isRemote ? p.menuIndex : game.menuIndex
    const setIndex  = (i) => { if (isRemote) p.menuIndex = i; else game.menuIndex = i }
    const getTab    = () => isRemote ? p.menuTab : game.menuTab
    const setTab    = (t) => { if (isRemote) p.menuTab = t; else game.menuTab = t }
    const closeFn   = () => isRemote ? this.closeRemoteMenu(p) : this.closeMenu()

    const entries = () => menuEntries()
    const switchTab = (dir) => { setTab((getTab() + dir + TAB_COUNT) % TAB_COUNT); setIndex(0) }
    const buySelected = () => {
      const key = entries()[getIndex()]
      if (key) buyUpgrade(key)
      const n = entries().length
      if (getIndex() >= n) setIndex(Math.max(0, n - 1))
      if (isRemote && p.remoteInput) p.remoteInput.action = false
    }

    if (p.source === 'touch') {
      this.menuNavTimer = Math.max(0, this.menuNavTimer - this._lastDt)
      if (st.mx < -0.45 && this.menuNavTimer <= 0) { switchTab(-1); this.menuNavTimer = 0.3 }
      else if (st.mx > 0.45 && this.menuNavTimer <= 0) { switchTab(1); this.menuNavTimer = 0.3 }
      else if (st.my < -0.45 && this.menuNavTimer <= 0) { setIndex((getIndex() - 1 + entries().length) % entries().length); this.menuNavTimer = 0.28 }
      else if (st.my > 0.45 && this.menuNavTimer <= 0) { setIndex((getIndex() + 1) % entries().length); this.menuNavTimer = 0.28 }
      if (st.action) buySelected()
      return
    }

    if (p.source === 'kb1' || p.source === 'kb2') {
      if (st.left) switchTab(-1)
      if (st.right) switchTab(1)
      if (st.up) setIndex((getIndex() - 1 + entries().length) % entries().length)
      if (st.down) setIndex((getIndex() + 1) % entries().length)
      if (st.action) buySelected()
      if (st.cancel) closeFn()
      return
    }

    if (p.source === 'remote') {
      this.menuNavTimer = Math.max(0, this.menuNavTimer - this._lastDt)
      if (st.left && this.menuNavTimer <= 0)       { switchTab(-1); this.menuNavTimer = 0.28 }
      else if (st.right && this.menuNavTimer <= 0) { switchTab(1);  this.menuNavTimer = 0.28 }
      else if (st.up && this.menuNavTimer <= 0)    { setIndex((getIndex() - 1 + entries().length) % entries().length); this.menuNavTimer = 0.24 }
      else if (st.down && this.menuNavTimer <= 0)  { setIndex((getIndex() + 1) % entries().length); this.menuNavTimer = 0.24 }
      if (st.action) buySelected()
      if (st.cancel) { closeFn(); if (p.remoteInput) p.remoteInput.cancel = false }
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
    else if (navUp && this.menuNavTimer <= 0)    { setIndex((getIndex() - 1 + entries().length) % entries().length); this.menuNavTimer = 0.26 }
    else if (navDown && this.menuNavTimer <= 0)  { setIndex((getIndex() + 1) % entries().length); this.menuNavTimer = 0.26 }
    if (st.action) buySelected()
    if (st.cancel) closeFn()
  },

  handleBuildingMenu(p, st) {
    const isRemote = p.source === 'remote'
    const id       = isRemote ? p.buildingMenuId : game.buildingMenuBuilding
    const getIndex = () => isRemote ? p.buildingMenuIndex : game.buildingMenuIndex
    const setIndex = (i) => { if (isRemote) p.buildingMenuIndex = i; else game.buildingMenuIndex = i }
    const closeFn  = () => isRemote ? this.closeRemoteBuildingMenu(p) : this.closeBuildingMenu()

    const getEntries = () => buildingMenuEntries(id)
    const buySelected = () => {
      const types = getEntries()
      const type = types[getIndex()]
      if (type) buyBuildingUpgrade(id, type)
      const n = getEntries().length
      if (getIndex() >= n) setIndex(Math.max(0, n - 1))
      if (isRemote && p.remoteInput) p.remoteInput.action = false
    }

    if (p.source === 'touch') {
      this.menuNavTimer = Math.max(0, this.menuNavTimer - this._lastDt)
      if (st.my < -0.45 && this.menuNavTimer <= 0) { const n = getEntries().length; setIndex((getIndex() - 1 + n) % n); this.menuNavTimer = 0.28 }
      else if (st.my > 0.45 && this.menuNavTimer <= 0) { setIndex((getIndex() + 1) % getEntries().length); this.menuNavTimer = 0.28 }
      if (st.action) buySelected()
      return
    }

    if (p.source === 'kb1' || p.source === 'kb2') {
      if (st.up)   { const n = getEntries().length; setIndex((getIndex() - 1 + n) % n) }
      if (st.down) setIndex((getIndex() + 1) % getEntries().length)
      if (st.action) buySelected()
      if (st.cancel) closeFn()
      return
    }

    if (p.source === 'remote') {
      this.menuNavTimer = Math.max(0, this.menuNavTimer - this._lastDt)
      if (st.up && this.menuNavTimer <= 0)   { const n = getEntries().length; setIndex((getIndex() - 1 + n) % n); this.menuNavTimer = 0.24 }
      else if (st.down && this.menuNavTimer <= 0) { setIndex((getIndex() + 1) % getEntries().length); this.menuNavTimer = 0.24 }
      if (st.action) buySelected()
      if (st.cancel) { closeFn(); if (p.remoteInput) p.remoteInput.cancel = false }
      return
    }

    // Gamepad
    this.menuNavTimer = Math.max(0, this.menuNavTimer - this._lastDt)
    const navUp   = st.my < -0.4 || st.up
    const navDown = st.my > 0.4  || st.down
    if (navUp && this.menuNavTimer <= 0)   { const n = getEntries().length; setIndex((getIndex() - 1 + n) % n); this.menuNavTimer = 0.26 }
    else if (navDown && this.menuNavTimer <= 0) { setIndex((getIndex() + 1) % getEntries().length); this.menuNavTimer = 0.26 }
    if (st.action) buySelected()
    if (st.cancel) closeFn()
  },
}
