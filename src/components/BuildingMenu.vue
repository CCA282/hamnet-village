<script setup>
import { computed, onMounted, reactive } from 'vue'
import {
  game, canAfford, buyBuildingUpgrade, buildingUpgradeCost,
  buildingUpgradeMaxed, buildingMenuEntries, effectiveStorageMax, effectiveInterval,
} from '../game/store.js'
import { BUILDINGS } from '../game/constants/index.js'
import { engine } from '../game/engine.js'
import { spriteUrl } from '../game/sprites/index.js'
import { netState } from '../net/netState.js'

const showMenu = computed(() => {
  if (!game.buildingMenuOpen) return false
  if (netState.mode === 'local' || !netState.mode) return true
  if (netState.mode === 'host') {
    const opener = engine.world.players.find((p) => p.id === game.buildingMenuOpener)
    return !opener || opener.source !== 'remote'
  }
  if (netState.mode === 'guest') return game.buildingMenuOpener === netState.myPlayerId
  return false
})

const icons = reactive({ wood: '', fish: '', stone: '', berries: '' })
onMounted(() => {
  icons.wood    = spriteUrl('icon_wood')
  icons.fish    = spriteUrl('icon_fish')
  icons.stone   = spriteUrl('icon_stone')
  icons.berries = spriteUrl('icon_berries')
})

const buildingDef = computed(() => BUILDINGS[game.buildingMenuBuilding])

const entries = computed(() => {
  const id = game.buildingMenuBuilding
  if (!id) return []
  return buildingMenuEntries(id).map((type) => {
    const upgDef = BUILDINGS[id].upgrades[type]
    const level  = game.buildingUpgrades[id][type]
    const cost   = buildingUpgradeCost(id, type)
    const maxed  = buildingUpgradeMaxed(id, type)
    return { type, upgDef, level, cost, maxed, affordable: canAfford(cost) && !maxed }
  })
})

const stats = computed(() => {
  const id = game.buildingMenuBuilding
  if (!id) return null
  return {
    storage: effectiveStorageMax(id),
    rate: (1 / effectiveInterval(id)).toFixed(2),
    transporter: game.buildingUpgrades[id].transporter > 0,
  }
})

const opener = computed(() => game.players.find((p) => p.id === game.buildingMenuOpener))

function click(i, entry) {
  game.buildingMenuIndex = i
  if (netState.mode === 'guest') {
    engine.sendGuestMenuAction({ type: 'buy_building_upgrade', buildingId: game.buildingMenuBuilding, upgradeType: entry.type })
  } else {
    buyBuildingUpgrade(game.buildingMenuBuilding, entry.type)
  }
}

function close() {
  if (netState.mode === 'guest') {
    game.buildingMenuOpen = false
    engine.sendGuestMenuAction({ type: 'close_building' })
  } else {
    engine.world.closeBuildingMenu()
  }
}
</script>

<template>
  <transition name="pop">
    <div class="scrim" v-if="showMenu && buildingDef" @pointerdown.self="close">
      <div class="menu">
        <header>
          <h2>{{ buildingDef.name }}</h2>
          <span class="opener" v-if="opener" :style="{ color: opener.color }">{{ opener.label }}</span>
        </header>

        <div class="stats" v-if="stats">
          <span>📦 Stock : {{ stats.storage }}</span>
          <span>⚡ {{ stats.rate }}/s</span>
          <span v-if="stats.transporter">🚗 Auto</span>
        </div>

        <ul class="list">
          <li
            v-for="(e, i) in entries"
            :key="e.type"
            :class="{ sel: i === game.buildingMenuIndex, off: !e.affordable && !e.maxed, maxed: e.maxed }"
            @pointerenter="game.buildingMenuIndex = i"
            @pointerdown="click(i, e)"
          >
            <div class="info">
              <div class="name">
                {{ e.upgDef.name }}
                <span v-if="e.upgDef.max > 1" class="badge">{{ e.level }}/{{ e.upgDef.max }}</span>
              </div>
              <div class="desc" v-if="e.upgDef.desc">{{ e.upgDef.desc }}</div>
            </div>
            <div class="cost" v-if="!e.maxed">
              <span
                v-for="(v, res) in e.cost"
                :key="res"
                :class="{ short: !game.devMode && game[res] < v }"
              >
                <img v-if="icons[res]" :src="icons[res]" class="res-icon-sm" />
                {{ v }}
              </span>
            </div>
            <div class="cost maxed-tag" v-else>✓</div>
          </li>
        </ul>

        <footer>
          <span class="keys">↑↓ items · <b>A / Espace</b> acheter · <b>Échap</b> fermer</span>
          <button @pointerdown="close">Fermer</button>
        </footer>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.scrim {
  position: fixed;
  inset: 0;
  background: rgba(20, 24, 18, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
}
.menu {
  width: min(400px, 92vw);
  background: var(--cozy-panel);
  border: 3px solid rgba(0, 0, 0, 0.14);
  border-radius: 18px;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.4);
  padding: 16px 18px 14px;
  color: var(--cozy-ink);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
h2 { margin: 0; font-size: 17px; }
.opener { font-size: 12px; font-weight: 700; }

.stats {
  display: flex;
  gap: 14px;
  font-size: 12px;
  font-weight: 700;
  color: var(--cozy-ink-soft);
  background: var(--cozy-panel-dark);
  border-radius: 8px;
  padding: 7px 10px;
}

.list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 12px;
  background: var(--cozy-panel-dark);
  border: 2px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: transform 0.08s, border-color 0.12s;
}
li.sel { border-color: var(--cozy-gold); transform: translateX(2px); }
li.off { opacity: 0.6; }
li.maxed { opacity: 0.45; }
.name { font-size: 14px; font-weight: 700; display: flex; align-items: center; gap: 7px; }
.badge {
  font-size: 10px;
  background: rgba(0, 0, 0, 0.12);
  padding: 1px 6px;
  border-radius: 999px;
  font-weight: 700;
}
.desc { font-size: 11px; color: var(--cozy-ink-soft); margin-top: 2px; }
.cost { display: flex; gap: 8px; font-weight: 700; white-space: nowrap; align-items: center; }
.cost span { display: flex; align-items: center; gap: 3px; font-size: 13px; }
.cost .short { color: #c0503f; }
.maxed-tag { color: var(--cozy-green); font-size: 15px; font-weight: 800; }

.res-icon-sm { width: 14px; height: auto; image-rendering: pixelated; display: inline-block; }

footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 2px;
}
.keys { font-size: 10px; color: var(--cozy-ink-soft); }
footer button {
  background: var(--cozy-gold);
  color: #3a2a12;
  border: none;
  border-radius: 10px;
  padding: 7px 14px;
  font-weight: 800;
  box-shadow: inset 0 -3px 0 rgba(0, 0, 0, 0.18);
  cursor: pointer;
}

.pop-enter-active, .pop-leave-active { transition: opacity 0.18s; }
.pop-enter-from, .pop-leave-to { opacity: 0; }
.pop-enter-active .menu { transition: transform 0.18s; }
.pop-enter-from .menu { transform: scale(0.94); }
</style>
