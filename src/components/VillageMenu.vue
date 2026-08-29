<script setup>
import { computed, onMounted, reactive } from 'vue'
import { game, upgradeCost, canAfford, buyUpgrade, upgradeMaxed, globalCap, menuEntries } from '../game/store.js'
import { UPGRADES, GLOBAL_CAPACITY_LEVELS } from '../game/constants/index.js'
import { engine } from '../game/engine.js'
import { spriteUrl } from '../game/sprites/index.js'
import { netState } from '../net/netState.js'

const showMenu = computed(() => {
  if (!game.menuOpen) return false
  if (netState.mode === 'local' || !netState.mode) return true
  if (netState.mode === 'host') {
    const opener = engine.world.players.find((p) => p.id === game.menuOpener)
    return !opener || opener.source !== 'remote'
  }
  if (netState.mode === 'guest') return game.menuOpener === netState.myPlayerId
  return false
})

const TABS = [
  { key: 'village',  label: '🏡', title: 'Village' },
  { key: 'outils',   label: '🛠️', title: 'Outils' },
  { key: 'stockage', label: '📦', title: 'Stockage' },
  { key: 'bonus',    label: '⭐', title: 'Bonus' },
]

function setTab(i) {
  game.menuTab = i
  game.menuIndex = 0
}

// Same filtered/ordered key list keyboard & gamepad navigation walk (menu.js's
// handleMenu) — using a separate filter here would desync game.menuIndex from
// what's actually rendered, making the wrong entry get bought (or none at all).
const entries = computed(() => menuEntries()
  .map((key) => {
  const def = UPGRADES[key]
  const level = game.upgrades[key]
  const cost = upgradeCost(key)
  let desc = def.descs ? (def.descs[level] ?? def.descs[def.descs.length - 1]) : (def.desc || '')
  if (key.startsWith('cap_')) {
    const cur = GLOBAL_CAPACITY_LEVELS[level] || 25
    const next = GLOBAL_CAPACITY_LEVELS[level + 1]
    desc = next ? `Capacité : ${cur} → ${next}` : `Maximum atteint (${cur})`
  }
  return {
    key, def, desc, level,
    maxed: upgradeMaxed(key),
    cost,
    affordable: canAfford(cost) && !upgradeMaxed(key),
  }
}))

const opener = computed(() => game.players.find((p) => p.id === game.menuOpener))

const meteoritesVisible = computed(() => game.villageLevel >= 3 || game.meteorite > 0)

const icons = reactive({ wood: '', fish: '', stone: '', berries: '', meteorite: '' })
onMounted(() => {
  icons.wood       = spriteUrl('icon_wood')
  icons.fish       = spriteUrl('icon_fish')
  icons.stone      = spriteUrl('icon_stone')
  icons.berries    = spriteUrl('icon_berries')
  icons.meteorite  = spriteUrl('icon_meteorite')
})

function click(i, key) {
  game.menuIndex = i
  if (netState.mode === 'guest') {
    engine.sendGuestMenuAction({ type: 'buy_upgrade', key })
  } else {
    buyUpgrade(key)
  }
}
function close() {
  if (netState.mode === 'guest') {
    game.menuOpen = false
    engine.sendGuestMenuAction({ type: 'close_village' })
  } else {
    engine.world.closeMenu()
  }
}
</script>

<template>
  <transition name="pop">
    <div class="scrim" v-if="showMenu" @pointerdown.self="close">
      <div class="menu">
        <header>
          <h2>🏡 Village niv. {{ game.villageLevel }}</h2>
          <span class="opener" v-if="opener" :style="{ color: opener.color }">
            {{ opener.label }}
          </span>
        </header>

        <!-- Stock global -->
        <div class="stock">
          <span class="stock-item">
            <img v-if="icons.wood" :src="icons.wood" class="res-icon" />
            {{ Math.floor(game.wood) }}<span class="scap">/{{ globalCap('wood') }}</span>
          </span>
          <span class="stock-item">
            <img v-if="icons.fish" :src="icons.fish" class="res-icon" />
            {{ Math.floor(game.fish) }}<span class="scap">/{{ globalCap('fish') }}</span>
          </span>
          <span class="stock-item">
            <img v-if="icons.stone" :src="icons.stone" class="res-icon" />
            {{ Math.floor(game.stone) }}<span class="scap">/{{ globalCap('stone') }}</span>
          </span>
          <span class="stock-item">
            <img v-if="icons.berries" :src="icons.berries" class="res-icon" />
            {{ Math.floor(game.berries) }}<span class="scap">/{{ globalCap('berries') }}</span>
          </span>
          <span class="stock-item" v-if="meteoritesVisible">
            <img v-if="icons.meteorite" :src="icons.meteorite" class="res-icon" />
            {{ Math.floor(game.meteorite) }}<span class="scap">/{{ globalCap('meteorite') }}</span>
          </span>
          <span class="dev-badge" v-if="game.devMode">⚡ DEV</span>
        </div>

        <!-- Onglets -->
        <div class="tabs">
          <button
            v-for="(tab, i) in TABS"
            :key="tab.key"
            class="tab-btn"
            :class="{ active: game.menuTab === i }"
            @pointerdown.stop="setTab(i)"
          >
            <span class="tab-emoji">{{ tab.label }}</span>
            <span class="tab-title">{{ tab.title }}</span>
          </button>
        </div>

        <!-- Onglet Village : description + niveaux -->
        <div v-if="game.menuTab === 0" class="village-desc">
          <p>🌲 Récoltez du <b>bois</b>, de la <b>pierre</b>, des <b>baies</b> et du <b>poisson</b> autour du hameau.</p>
          <p>🛒 Votre inventaire (9 objets max) se transfère automatiquement quand vous approchez du village ou d'une charrette.</p>
          <p>🏗️ Améliorez le village pour débloquer de nouveaux bâtiments de récolte automatique.</p>
        </div>

        <!-- Liste des améliorations -->
        <ul class="list">
          <li
            v-for="(e, i) in entries"
            :key="e.key"
            :class="{ sel: i === game.menuIndex, off: !e.affordable, maxed: e.maxed }"
            @pointerenter="game.menuIndex = i"
            @pointerdown="click(i, e.key)"
          >
            <div class="info">
              <div class="name">
                {{ e.def.name }}
                <span v-if="e.def.repeatable" class="badge">{{ e.level }}/{{ e.def.max }}</span>
              </div>
              <div class="desc" v-if="e.desc">{{ e.desc }}</div>
            </div>
            <div class="cost" v-if="!e.maxed">
              <span v-if="Object.keys(e.cost).length === 0" class="free">Gratuit !</span>
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
          <span class="keys">← → onglets · ↑↓ items · <b>A / Espace</b> acheter · <b>Échap</b> fermer</span>
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
  width: min(460px, 94vw);
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
h2 { margin: 0; font-size: 19px; }
.opener { font-size: 12px; font-weight: 700; }

.stock {
  display: flex;
  gap: 12px;
  align-items: center;
  font-weight: 700;
  color: var(--cozy-ink-soft);
  flex-wrap: wrap;
}
.stock-item { display: flex; align-items: center; gap: 4px; font-size: 14px; }
.scap { font-size: 10px; opacity: 0.5; font-weight: 600; }
.dev-badge {
  margin-left: auto;
  font-size: 11px;
  background: rgba(230, 160, 20, 0.85);
  color: #2a1a00;
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 800;
}

/* Onglets */
.tabs {
  display: flex;
  gap: 4px;
  background: var(--cozy-panel-dark);
  border-radius: 10px;
  padding: 4px;
}
.tab-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 6px 4px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--cozy-ink-soft);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
  font-weight: 700;
}
.tab-btn.active {
  background: var(--cozy-gold);
  color: #3a2a12;
}
.tab-emoji { font-size: 18px; line-height: 1; }
.tab-title { font-size: 10px; letter-spacing: 0.3px; }

/* Description village */
.village-desc {
  background: var(--cozy-panel-dark);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 12px;
  line-height: 1.55;
  color: var(--cozy-ink-soft);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.village-desc p { margin: 0; }
.village-desc b { color: var(--cozy-ink); }

/* Liste */
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
.cost .free { color: var(--cozy-green); font-style: italic; font-size: 12px; }
.maxed-tag { color: var(--cozy-green); font-size: 15px; font-weight: 800; }

.res-icon { width: 18px; height: auto; image-rendering: pixelated; display: inline-block; }
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
