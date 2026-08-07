import * as C from '../constants/index.js'
import { game, harvest, effectiveInventoryMax } from '../store.js'

const ICON_MAP = { wood: 'icon_wood', fish: 'icon_fish', stone: 'icon_stone', berries: 'icon_berries', meteorite: 'icon_meteorite' }
const RESOURCES = ['wood', 'fish', 'stone', 'berries', 'meteorite']

export const resourceMethods = {
  effectiveHarvestCd() {
    return C.HARVEST_COOLDOWN * Math.pow(0.8, game.upgrades.harvest_speed)
  },

  harvestToPlayer(p, res, amount) {
    const total = Object.values(p.inventory).reduce((a, b) => a + b, 0)
    if (total >= effectiveInventoryMax()) return false
    p.inventory[res] = (p.inventory[res] || 0) + amount
    game.totalHarvested += amount
    return true
  },

  depositPlayerInventory(p) {
    for (const res of RESOURCES) {
      const qty = p.inventory[res] || 0
      if (qty > 0) {
        const added = harvest(res, qty)
        p.inventory[res] = qty - added
        if (added > 0) this.spawnIcon(ICON_MAP[res], p.x + (Math.random() - 0.5) * 10, p.y - 16)
      }
    }
  },

  updateTrees(dt) {
    const max = C.TREE_HP + game.upgrades.harvest_yield
    for (const t of this.trees) {
      if (t.shake > 0) t.shake = Math.max(0, t.shake - dt)
      // Top up intact trees when upgrade level increases
      if (t.hp > 0 && t.hp === t.maxHp && t.maxHp < max) { t.hp = max; t.maxHp = max }
      if (t.hp <= 0) {
        t.regrow -= dt
        if (t.regrow <= 0) { t.hp = max; t.maxHp = max; this.spawnLeaves(t.x, t.y - 14, 5) }
      }
    }
  },

  updateFish(dt) {
    const JUMP_DUR = 0.72
    for (const f of this.fishSpots) {
      if (f.cd > 0) { f.cd -= dt; continue }
      if (!f.jumping) {
        f.jumpTimer -= dt
        if (f.jumpTimer <= 0) { f.jumping = true; f.jumpT = 0; f.jumpTimer = 3.5 + Math.random() * 5 }
      } else {
        f.jumpT += dt
        if (f.jumpT >= JUMP_DUR) { f.jumping = false; f.jumpT = 0 }
      }
    }
  },

  updateStone(dt) {
    const stoneMax = C.STONE_HP + game.upgrades.harvest_yield
    const berryMax = C.BERRY_HP + game.upgrades.harvest_yield
    for (const s of this.stoneSpots) {
      if (s.hp > 0 && s.hp === s.maxHp && s.maxHp < stoneMax) { s.hp = stoneMax; s.maxHp = stoneMax }
      if (s.hp <= 0) {
        s.regrow -= dt
        if (s.regrow <= 0) { s.hp = stoneMax; s.maxHp = stoneMax }
      }
    }
    for (const b of this.berryBushes) {
      if (b.hp > 0 && b.hp === b.maxHp && b.maxHp < berryMax) { b.hp = berryMax; b.maxHp = berryMax }
      if (b.hp <= 0) {
        b.regrow -= dt
        if (b.regrow <= 0) { b.hp = berryMax; b.maxHp = berryMax }
      }
    }
  },
}
