import * as C from '../../constants/index.js'
import { sprite, characterSprite } from '../../sprites/index.js'
import { game, effectiveInventoryMax } from '../../store.js'

const TWO_PI = Math.PI * 2

export const entityMethods = {
  drawCart(ctx, cart) {
    const cartLvl = game.upgrades.cart_size || 0
    const cartKey = cartLvl >= 3 ? 'cart_3' : cartLvl >= 1 ? 'cart_2' : 'cart'
    const s = sprite(cartKey)
    this.drawShadow(ctx, cart.x, cart.y, s.width)
    this.drawBottom(ctx, s, cart.x, cart.y)

    const total = Object.values(cart.inventory).reduce((a, b) => a + b, 0)
    if (total > 0) {
      ctx.font = '5px monospace'
      ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(0,0,0,0.45)'
      ctx.fillText(total, cart.x + 0.3, cart.y - s.height - 2.3)
      ctx.fillStyle = '#f4ead5'
      ctx.fillText(total, cart.x, cart.y - s.height - 2)
      ctx.textAlign = 'left'
    }

    if (cart.following !== null) {
      const d = Math.sin(this.time * 5) * 1.5
      ctx.fillStyle = 'rgba(255,255,200,0.7)'
      ctx.beginPath()
      ctx.arc(cart.x, cart.y - s.height - 13 + d, 2, 0, TWO_PI)
      ctx.fill()
    }
  },

  drawPlayer(ctx, p) {
    const s = characterSprite(p.color)
    this.drawShadow(ctx, p.x, p.y, s.width - 1)
    const bob = p.moving ? Math.abs(Math.sin(p.walkPhase)) * 1.4 : Math.sin(this.time * 2 + p.id) * 0.4
    const scale = p.spawn > 0 ? 1 + p.spawn * 0.6 : 1
    const alpha = p.spawn > 0 ? 1 - p.spawn * 0.4 : 1
    this.drawBottom(ctx, s, p.x, p.y - bob, { flip: p.facing < 0, scale, alpha })
  },

  drawLabel(ctx, p) {
    const s = characterSprite(p.color)
    ctx.font = '6px monospace'
    ctx.textAlign = 'center'
    const y = p.y - s.height - 4
    ctx.fillStyle = 'rgba(0,0,0,0.4)'
    ctx.fillText(p.label, p.x + 0.3, y + 0.3)
    ctx.fillStyle = p.color
    ctx.fillText(p.label, p.x, y)

    const invTotal = Object.values(p.inventory).reduce((a, b) => a + b, 0)
    if (invTotal > 0) {
      const barW = 14, barH = 2
      const bx = Math.round(p.x - barW / 2), by = Math.round(y - 9)
      ctx.fillStyle = 'rgba(0,0,0,0.45)'
      ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2)
      const invMax = effectiveInventoryMax()
      ctx.fillStyle = invTotal >= invMax ? '#e05050' : '#f0d050'
      ctx.fillRect(bx, by, Math.round(barW * invTotal / invMax), barH)
    }
    ctx.textAlign = 'left'
  },

  drawAutoTransporter(ctx, at) {
    const speedLvl = game.buildingUpgrades[at.buildingId]?.transporter_speed || 0
    const cartKey = speedLvl >= 3 ? 'cart_3' : speedLvl >= 1 ? 'cart_2' : 'cart'
    const s = sprite(cartKey)
    this.drawShadow(ctx, at.x, at.y, s.width)
    this.drawBottom(ctx, s, at.x, at.y, { flip: at.facing < 0 })

    // When loading at a building, clear the building sprite height
    const bldSprite = at.state === 'loading' ? sprite(C.BUILDINGS[at.buildingId].sprite) : null
    const topY = at.y - Math.max(s.height, bldSprite ? bldSprite.height + 2 : 0)

    const total = Object.values(at.inventory).reduce((a, b) => a + b, 0)
    if (total > 0) {
      ctx.font = '5px monospace'
      ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(0,0,0,0.45)'
      ctx.fillText(total, at.x + 0.3, topY - 2.3)
      ctx.fillStyle = '#a0e8ff'
      ctx.fillText(total, at.x, topY - 2)
      ctx.textAlign = 'left'
    }
    // Auto indicator dot
    ctx.fillStyle = at.state === 'loading' ? 'rgba(160,232,255,0.8)' : 'rgba(160,232,255,0.4)'
    ctx.beginPath()
    ctx.arc(at.x, topY - 9, 2, 0, Math.PI * 2)
    ctx.fill()
  },

  drawHalo(ctx, target, t, color) {
    let bx, by, rx, ry
    const sizes = { chop:[10,5], fish:[13,6], mine:[9,4], pick:[8,4], cart:[10,5], build:[12,6], building:[12,6], menu:[20,10], building_occupied:[12,6], menu_occupied:[20,10] }
    if (!sizes[target.kind]) return
    ;[rx, ry] = sizes[target.kind]
    if (target.haloX !== undefined) {
      // Simplified format from network sync
      bx = target.haloX; by = target.haloY
    } else {
      switch (target.kind) {
        case 'chop':     bx = target.tree.x;  by = target.tree.y;  break
        case 'fish':     bx = target.spot.x;  by = target.spot.y;  break
        case 'mine':     bx = target.rock.x;  by = target.rock.y;  break
        case 'pick':     bx = target.bush.x;  by = target.bush.y;  break
        case 'cart':     bx = target.cart.x;  by = target.cart.y;  break
        case 'build':
        case 'building': bx = target.spot.x;  by = target.spot.y;  break
        case 'menu':     bx = C.VILLAGE.x;    by = C.VILLAGE.y;    break
      }
    }
    const pulse = 0.5 + 0.5 * Math.sin(t * 3)
    const alpha = (target.ok ? 0.28 + pulse * 0.18 : 0.18 + pulse * 0.12)
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.fillStyle = target.ok ? color : '#e05050'
    this._ellipse(ctx, bx, by + 1, rx, ry)
    ctx.restore()
  },
}
