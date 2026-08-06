import * as C from '../constants/index.js'
import { game } from '../store.js'

export const hintMethods = {
  updateHint() {
    let hint = ''
    for (const p of this.players) {
      const t = p.target
      if (!t) {
        const inv = Object.values(p.inventory).reduce((a, b) => a + b, 0)
        if (inv >= C.PLAYER_INVENTORY_MAX) hint = 'Sac plein ! Déposez dans la charrette 🛒'
        continue
      }
      if (t.kind === 'menu') hint = 'Ouvrir le village 🏡'
      else if (t.kind === 'build') hint = t.ok ? 'Construire : ' + C.BUILDINGS[t.spot.building].name : 'Ressources insuffisantes'
      else if (t.kind === 'cart') {
        if (!t.cart) continue
        hint = t.cart.following === p.id ? 'Lâcher la charrette 🛒' : 'Prendre la charrette 🛒'
      }
      else if (t.kind === 'chop') hint = t.inventoryFull ? 'Sac plein ! Approchez la charrette pour déposer 🛒' : t.ok ? 'Couper du bois 🪵' : "Besoin d'une hache 🪓"
      else if (t.kind === 'fish') hint = t.inventoryFull ? 'Sac plein ! Approchez la charrette pour déposer 🛒' : t.ok ? 'Pêcher 🐟' : "Besoin d'une canne à pêche 🎣"
      else if (t.kind === 'mine') hint = t.inventoryFull ? 'Sac plein ! Approchez la charrette pour déposer 🛒' : t.ok ? 'Miner de la pierre ⛏️' : "Besoin d'une pioche ⛏️"
      else if (t.kind === 'pick') hint = t.inventoryFull ? 'Sac plein ! Approchez la charrette pour déposer 🛒' : t.ok ? 'Cueillir des baies 🫐' : "Besoin d'une faucille 🌾"
    }
    game.hint = hint
  },
}
