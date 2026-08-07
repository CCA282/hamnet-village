import * as C from '../constants/index.js'
import { game } from '../store.js'

export const hintMethods = {
  updateHint() {
    if (game.hintOverride) {
      for (const p of this.players) { if (p.source !== 'remote') p.hint = game.hintOverride }
      game.hint = game.hintOverride
      return
    }
    for (const p of this.players) {
      const t = p.target
      let hint = ''
      if (t) {
        if (t.kind === 'building_occupied') hint = 'Bâtiment occupé par un autre joueur'
        else if (t.kind === 'menu_occupied') hint = 'Village occupé par un autre joueur'
        else if (t.kind === 'build' && !t.ok) hint = 'Ressources insuffisantes'
        else if (t.kind === 'chop') hint = t.inventoryFull ? 'Sac plein ! Approchez la charrette pour déposer 🛒' : t.ok ? '' : "Besoin d'une hache 🪓"
        else if (t.kind === 'fish') hint = t.inventoryFull ? 'Sac plein ! Approchez la charrette pour déposer 🛒' : t.ok ? '' : "Besoin d'une canne à pêche 🎣"
        else if (t.kind === 'mine') hint = t.inventoryFull ? 'Sac plein ! Approchez la charrette pour déposer 🛒' : t.ok ? '' : "Besoin d'une pioche ⛏️"
        else if (t.kind === 'pick') hint = t.inventoryFull ? 'Sac plein ! Approchez la charrette pour déposer 🛒' : t.ok ? '' : "Besoin d'une faucille 🌾"
        else if (t.kind === 'meteorite') hint = t.inventoryFull ? 'Sac plein ! Approchez la charrette pour déposer 🛒' : '☄️ Météorite — ramassez-la !'
        else if (t.kind === 'telescope') hint = '🔭 Observer le ciel'
      }
      p.hint = hint
    }
    // For local / host: show the first local player's hint in game.hint (for backward compat)
    const localP = this.players.find((p) => p.source !== 'remote')
    game.hint = localP?.hint ?? ''
  },
}
